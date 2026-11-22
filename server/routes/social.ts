import { Router } from 'express';
import { db, newId } from '../db.ts';
import { type AuthedRequest, createNotification, requireAuth } from '../auth.ts';
import { saveValidatedUpload, uploadMiddleware } from '../uploads.ts';

export const socialRouter = Router();

// --- DISCOVER ---
socialRouter.get('/discover', (req: AuthedRequest, res) => {
  const { savedOnly } = req.query as { savedOnly?: string };
  const userId = req.user?.id;

  let where = "dp.moderation_status = 'visible'";
  const params: string[] = [];

  if (savedOnly === 'true' && userId) {
    where += ' AND EXISTS (SELECT 1 FROM discover_saves ds WHERE ds.post_id = dp.id AND ds.user_id = ?)';
    params.push(userId);
  }

  const posts = db
    .prepare(
      `SELECT dp.*, pr.full_name as author_name, u.role as author_role,
              p.title as property_title, p.town as property_town, p.monthly_rent_kes as property_rent,
              (SELECT COUNT(*) FROM discover_likes dl WHERE dl.post_id = dp.id) as likes_count,
              (SELECT COUNT(*) FROM discover_comments dc WHERE dc.post_id = dp.id AND dc.moderation_status = 'visible') as comments_count
       FROM discover_posts dp
       JOIN users u ON u.id = dp.author_id
       JOIN profiles pr ON pr.user_id = dp.author_id
       LEFT JOIN properties p ON p.id = dp.property_id
       WHERE ${where}
       ORDER BY dp.created_at DESC`
    )
    .all(...params) as Array<Record<string, unknown>>;

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();
  if (userId && posts.length > 0) {
    const ids = posts.map((p) => String(p.id));
    const ph = ids.map(() => '?').join(',');
    const likes = db
      .prepare(`SELECT post_id FROM discover_likes WHERE user_id = ? AND post_id IN (${ph})`)
      .all(userId, ...ids) as Array<{ post_id: string }>;
    likedSet = new Set(likes.map((l) => l.post_id));

    const saves = db
      .prepare(`SELECT post_id FROM discover_saves WHERE user_id = ? AND post_id IN (${ph})`)
      .all(userId, ...ids) as Array<{ post_id: string }>;
    savedSet = new Set(saves.map((s) => s.post_id));
  }

  res.json({
    posts: posts.map((post) => ({
      ...post,
      is_demo: Boolean(post.is_demo),
      liked_by_me: likedSet.has(String(post.id)),
      saved_by_me: savedSet.has(String(post.id)),
    })),
  });
});

socialRouter.post('/discover', requireAuth, uploadMiddleware.single('media'), (req: AuthedRequest, res) => {
  const { caption, locationTag, propertyId } = req.body ?? {};
  if (!caption || String(caption).trim().length < 3) {
    res.status(400).json({ error: 'Caption is required (at least 3 characters).' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'An image or portrait video file is required.' });
    return;
  }

  try {
    const saved = saveValidatedUpload(req.file.buffer, ['image', 'video']);
    const id = newId();

    let validPropertyId: string | null = null;
    if (propertyId && typeof propertyId === 'string' && propertyId.trim()) {
      const prop = db
        .prepare("SELECT id FROM properties WHERE id = ? AND listing_status = 'approved'")
        .get(propertyId.trim());
      if (prop) validPropertyId = propertyId.trim();
    }

    db.prepare(
      `INSERT INTO discover_posts (id, author_id, property_id, caption, location_tag, media_type, media_url, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(id, req.user!.id, validPropertyId, String(caption).trim(), locationTag?.trim() || null, saved.kind, saved.url);

    res.status(201).json({ id, media_url: saved.url, media_type: saved.kind, message: 'Discover post published.' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid media upload.' });
  }
});

socialRouter.post('/discover/:id/like', requireAuth, (req: AuthedRequest, res) => {
  const postId = String(req.params.id);
  const existing = db
    .prepare('SELECT 1 FROM discover_likes WHERE post_id = ? AND user_id = ?')
    .get(postId, req.user!.id);

  if (existing) {
    db.prepare('DELETE FROM discover_likes WHERE post_id = ? AND user_id = ?').run(postId, req.user!.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO discover_likes (post_id, user_id) VALUES (?, ?)').run(postId, req.user!.id);
    res.json({ liked: true });
  }
});

socialRouter.post('/discover/:id/save', requireAuth, (req: AuthedRequest, res) => {
  const postId = String(req.params.id);
  const existing = db
    .prepare('SELECT 1 FROM discover_saves WHERE post_id = ? AND user_id = ?')
    .get(postId, req.user!.id);

  if (existing) {
    db.prepare('DELETE FROM discover_saves WHERE post_id = ? AND user_id = ?').run(postId, req.user!.id);
    res.json({ saved: false });
  } else {
    db.prepare('INSERT INTO discover_saves (post_id, user_id) VALUES (?, ?)').run(postId, req.user!.id);
    res.json({ saved: true });
  }
});

socialRouter.get('/discover/:id/comments', (req, res) => {
  const rows = db
    .prepare(
      `SELECT dc.*, pr.full_name as author_name, u.role as author_role
       FROM discover_comments dc
       JOIN users u ON u.id = dc.user_id
       JOIN profiles pr ON pr.user_id = dc.user_id
       WHERE dc.post_id = ? AND dc.moderation_status = 'visible'
       ORDER BY dc.created_at ASC`
    )
    .all(req.params.id);
  res.json({ comments: rows });
});

socialRouter.post('/discover/:id/comments', requireAuth, (req: AuthedRequest, res) => {
  const { body } = req.body ?? {};
  if (!body || String(body).trim().length < 2) {
    res.status(400).json({ error: 'Comment text is required.' });
    return;
  }

  const post = db
    .prepare("SELECT id, author_id FROM discover_posts WHERE id = ? AND moderation_status = 'visible'")
    .get(req.params.id) as { id: string; author_id: string } | undefined;
  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return;
  }

  const id = newId();
  db.prepare('INSERT INTO discover_comments (id, post_id, user_id, body) VALUES (?, ?, ?, ?)').run(
    id,
    post.id,
    req.user!.id,
    String(body).trim()
  );

  if (post.author_id !== req.user!.id) {
    createNotification(
      post.author_id,
      'discover_comment',
      'New Discover Comment',
      `${req.user!.full_name} commented on your Discover post.`,
      '/discover'
    );
  }

  res.status(201).json({ id, message: 'Comment added.' });
});

// --- COMMUNITY ---
socialRouter.get('/community/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM community_categories ORDER BY sort_order ASC').all();
  res.json({ categories });
});

socialRouter.get('/community/posts', (req: AuthedRequest, res) => {
  const { category, q, sort = 'newest' } = req.query as Record<string, string | undefined>;
  const where: string[] = ["cp.moderation_status = 'visible'"];
  const params: string[] = [];

  if (category && category !== 'all') {
    where.push('cc.slug = ?');
    params.push(category);
  }
  if (q && q.trim()) {
    where.push('(cp.title LIKE ? OR cp.body LIKE ?)');
    const p = `%${q.trim()}%`;
    params.push(p, p);
  }

  const orderBy = sort === 'popular' ? 'likes_count DESC, cp.created_at DESC' : 'cp.created_at DESC';

  const posts = db
    .prepare(
      `SELECT cp.*, cc.name as category_name, cc.slug as category_slug,
              pr.full_name as author_name, u.role as author_role,
              (SELECT COUNT(*) FROM community_likes cl WHERE cl.post_id = cp.id) as likes_count,
              (SELECT COUNT(*) FROM community_comments cm WHERE cm.post_id = cp.id AND cm.moderation_status = 'visible') as comments_count
       FROM community_posts cp
       JOIN community_categories cc ON cc.id = cp.category_id
       JOIN users u ON u.id = cp.author_id
       JOIN profiles pr ON pr.user_id = cp.author_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}`
    )
    .all(...params) as Array<Record<string, unknown>>;

  let likedSet = new Set<string>();
  if (req.user && posts.length > 0) {
    const ids = posts.map((p) => String(p.id));
    const ph = ids.map(() => '?').join(',');
    const likes = db
      .prepare(`SELECT post_id FROM community_likes WHERE user_id = ? AND post_id IN (${ph})`)
      .all(req.user.id, ...ids) as Array<{ post_id: string }>;
    likedSet = new Set(likes.map((l) => l.post_id));
  }

  res.json({
    posts: posts.map((p) => ({
      ...p,
      is_demo: Boolean(p.is_demo),
      liked_by_me: likedSet.has(String(p.id)),
    })),
  });
});

socialRouter.post('/community/posts', requireAuth, (req: AuthedRequest, res) => {
  const { categoryId, title, body } = req.body ?? {};
  if (!categoryId || !title || String(title).trim().length < 5 || !body || String(body).trim().length < 10) {
    res.status(400).json({ error: 'Category, title (5+ chars), and discussion body (10+ chars) are required.' });
    return;
  }

  const cat = db.prepare('SELECT id FROM community_categories WHERE id = ?').get(categoryId);
  if (!cat) {
    res.status(400).json({ error: 'Invalid community category.' });
    return;
  }

  const id = newId();
  db.prepare(
    'INSERT INTO community_posts (id, category_id, author_id, title, body, is_demo) VALUES (?, ?, ?, ?, ?, 0)'
  ).run(id, categoryId, req.user!.id, String(title).trim(), String(body).trim());

  res.status(201).json({ id, message: 'Discussion published.' });
});

socialRouter.post('/community/posts/:id/like', requireAuth, (req: AuthedRequest, res) => {
  const postId = String(req.params.id);
  const existing = db
    .prepare('SELECT 1 FROM community_likes WHERE post_id = ? AND user_id = ?')
    .get(postId, req.user!.id);

  if (existing) {
    db.prepare('DELETE FROM community_likes WHERE post_id = ? AND user_id = ?').run(postId, req.user!.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)').run(postId, req.user!.id);
    res.json({ liked: true });
  }
});

socialRouter.get('/community/posts/:id/comments', (req, res) => {
  const comments = db
    .prepare(
      `SELECT cm.*, pr.full_name as author_name, u.role as author_role
       FROM community_comments cm
       JOIN users u ON u.id = cm.author_id
       JOIN profiles pr ON pr.user_id = cm.author_id
       WHERE cm.post_id = ? AND cm.moderation_status = 'visible'
       ORDER BY cm.created_at ASC`
    )
    .all(req.params.id);
  res.json({ comments });
});

socialRouter.post('/community/posts/:id/comments', requireAuth, (req: AuthedRequest, res) => {
  const { body } = req.body ?? {};
  if (!body || String(body).trim().length < 2) {
    res.status(400).json({ error: 'Reply text is required.' });
    return;
  }

  const post = db
    .prepare("SELECT id, author_id, title FROM community_posts WHERE id = ? AND moderation_status = 'visible'")
    .get(req.params.id) as { id: string; author_id: string; title: string } | undefined;
  if (!post) {
    res.status(404).json({ error: 'Discussion post not found.' });
    return;
  }

  const id = newId();
  db.prepare('INSERT INTO community_comments (id, post_id, author_id, body) VALUES (?, ?, ?, ?)').run(
    id,
    post.id,
    req.user!.id,
    String(body).trim()
  );

  if (post.author_id !== req.user!.id) {
    createNotification(
      post.author_id,
      'community_reply',
      'New Community Reply',
      `${req.user!.full_name} replied to "${post.title}"`,
      '/community'
    );
  }

  res.status(201).json({ id, message: 'Reply posted.' });
});

// --- REPORTS (Available across listings, Discover, Community, Users) ---
socialRouter.post('/reports', requireAuth, (req: AuthedRequest, res) => {
  const { targetType, targetId, reason, details } = req.body ?? {};
  if (!['property', 'discover_post', 'community_post', 'user'].includes(targetType)) {
    res.status(400).json({ error: 'Invalid report target type.' });
    return;
  }
  if (!targetId || !reason || String(reason).trim().length < 3) {
    res.status(400).json({ error: 'Target ID and reason are required.' });
    return;
  }

  const id = newId();
  db.prepare(
    'INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user!.id, targetType, String(targetId), String(reason).trim(), details?.trim() || null);

  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'").all() as Array<{
    id: string;
  }>;
  for (const adm of admins) {
    createNotification(
      adm.id,
      'moderation_report',
      'New Safety Report Submitted',
      `A ${targetType.replace('_', ' ')} was reported for: ${String(reason).trim()}`,
      '/admin/moderation'
    );
  }

  res.status(201).json({ id, message: 'Report submitted for safety review.' });
});
