import { Router } from 'express';
import { db, newId } from '../db.ts';
import {
  type AuthedRequest,
  createNotification,
  pushRealtimeEvent,
  registerSseClient,
  requireAuth,
  unregisterSseClient,
} from '../auth.ts';

export const messagingRouter = Router();

// Server-Sent Events stream for real-time messaging & notifications
messagingRouter.get('/stream', requireAuth, (req: AuthedRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId = req.user!.id;
  registerSseClient(userId, res);
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unregisterSseClient(userId, res);
  });
});

// List conversations for the authenticated user
messagingRouter.get('/conversations', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const rows = db
    .prepare(
      `SELECT c.id, c.property_id, c.subject, c.updated_at,
              p.title as property_title,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM messages m
               WHERE m.conversation_id = c.id
                 AND m.sender_id != ?
                 AND (cp_self.last_read_at IS NULL OR m.created_at > cp_self.last_read_at)
              ) as unread_count
       FROM conversations c
       JOIN conversation_participants cp_self ON cp_self.conversation_id = c.id AND cp_self.user_id = ?
       LEFT JOIN properties p ON p.id = c.property_id
       ORDER BY COALESCE(last_message_at, c.updated_at) DESC`
    )
    .all(userId, userId) as Array<Record<string, unknown>>;

  const convIds = rows.map((r) => String(r.id));
  const participantsByConv = new Map<string, Array<{ user_id: string; full_name: string; role: string }>>();
  if (convIds.length > 0) {
    const ph = convIds.map(() => '?').join(',');
    const parts = db
      .prepare(
        `SELECT cp.conversation_id, u.id as user_id, pr.full_name, u.role
         FROM conversation_participants cp
         JOIN users u ON u.id = cp.user_id
         JOIN profiles pr ON pr.user_id = u.id
         WHERE cp.conversation_id IN (${ph})`
      )
      .all(...convIds) as Array<{ conversation_id: string; user_id: string; full_name: string; role: string }>;

    for (const part of parts) {
      if (!participantsByConv.has(part.conversation_id)) {
        participantsByConv.set(part.conversation_id, []);
      }
      participantsByConv.get(part.conversation_id)!.push({
        user_id: part.user_id,
        full_name: part.full_name,
        role: part.role,
      });
    }
  }

  res.json({
    conversations: rows.map((r) => ({
      ...r,
      participants: participantsByConv.get(String(r.id)) ?? [],
    })),
  });
});

// Start or resume a conversation related to a property
messagingRouter.post('/conversations', requireAuth, (req: AuthedRequest, res) => {
  const { propertyId, recipientUserId, subject, initialMessage } = req.body ?? {};
  const senderId = req.user!.id;

  let targetRecipientId = recipientUserId as string | undefined;

  if (!targetRecipientId && propertyId) {
    // Prefer active assigned caretaker if one exists, otherwise property owner
    const ct = db
      .prepare("SELECT caretaker_id FROM property_caretakers WHERE property_id = ? AND status = 'active' LIMIT 1")
      .get(propertyId) as { caretaker_id: string } | undefined;
    if (ct) {
      targetRecipientId = ct.caretaker_id;
    } else {
      const prop = db.prepare('SELECT owner_id FROM properties WHERE id = ?').get(propertyId) as
        | { owner_id: string }
        | undefined;
      if (prop) targetRecipientId = prop.owner_id;
    }
  }

  if (!targetRecipientId) {
    res.status(400).json({ error: 'A valid recipient or property is required to start a conversation.' });
    return;
  }

  if (targetRecipientId === senderId) {
    res.status(400).json({ error: 'You cannot start a conversation with yourself.' });
    return;
  }

  // Check if a conversation already exists between these two users for this property
  const existing = db
    .prepare(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
       JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
       WHERE (? IS NULL OR c.property_id = ?)
       LIMIT 1`
    )
    .get(senderId, targetRecipientId, propertyId ?? null, propertyId ?? null) as { id: string } | undefined;

  let conversationId = existing?.id;
  if (!conversationId) {
    conversationId = newId();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT INTO conversations (id, property_id, subject) VALUES (?, ?, ?)').run(
        conversationId,
        propertyId || null,
        subject?.trim() || 'Accommodation Inquiry'
      );
      db.prepare('INSERT INTO conversation_participants (conversation_id, user_id, last_read_at) VALUES (?, ?, datetime(\'now\'))').run(
        conversationId,
        senderId
      );
      db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(
        conversationId,
        targetRecipientId
      );
      db.exec('COMMIT');
    } catch {
      db.exec('ROLLBACK');
      res.status(500).json({ error: 'Could not create conversation.' });
      return;
    }
  }

  if (initialMessage && String(initialMessage).trim()) {
    const msgId = newId();
    db.prepare('INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)').run(
      msgId,
      conversationId,
      senderId,
      String(initialMessage).trim()
    );
    db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
    pushRealtimeEvent(targetRecipientId, 'message', {
      id: msgId,
      conversation_id: conversationId,
      sender_id: senderId,
      body: String(initialMessage).trim(),
    });
    createNotification(
      targetRecipientId,
      'new_message',
      'New Message',
      `${req.user!.full_name}: ${String(initialMessage).trim().slice(0, 80)}`,
      '/messages'
    );
  }

  res.status(201).json({ conversationId });
});

messagingRouter.get('/conversations/:id/messages', requireAuth, (req: AuthedRequest, res) => {
  const convId = String(req.params.id);
  const participant = db
    .prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?')
    .get(convId, req.user!.id);

  if (!participant) {
    res.status(403).json({ error: 'You are not a participant in this conversation.' });
    return;
  }

  db.prepare(
    "UPDATE conversation_participants SET last_read_at = datetime('now') WHERE conversation_id = ? AND user_id = ?"
  ).run(convId, req.user!.id);

  const messages = db
    .prepare(
      `SELECT m.*, pr.full_name as sender_name
       FROM messages m
       JOIN profiles pr ON pr.user_id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`
    )
    .all(convId);

  res.json({ messages });
});

messagingRouter.post('/conversations/:id/messages', requireAuth, (req: AuthedRequest, res) => {
  const convId = String(req.params.id);
  const { body } = req.body ?? {};
  if (!body || String(body).trim().length === 0) {
    res.status(400).json({ error: 'Message body cannot be empty.' });
    return;
  }

  const participant = db
    .prepare('SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?')
    .get(convId, req.user!.id);

  if (!participant) {
    res.status(403).json({ error: 'You are not a participant in this conversation.' });
    return;
  }

  const msgId = newId();
  const cleanBody = String(body).trim();
  db.prepare('INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)').run(
    msgId,
    convId,
    req.user!.id,
    cleanBody
  );
  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(convId);
  db.prepare(
    "UPDATE conversation_participants SET last_read_at = datetime('now') WHERE conversation_id = ? AND user_id = ?"
  ).run(convId, req.user!.id);

  const others = db
    .prepare('SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?')
    .all(convId, req.user!.id) as Array<{ user_id: string }>;

  for (const other of others) {
    pushRealtimeEvent(other.user_id, 'message', {
      id: msgId,
      conversation_id: convId,
      sender_id: req.user!.id,
      sender_name: req.user!.full_name,
      body: cleanBody,
      created_at: new Date().toISOString(),
    });
    createNotification(
      other.user_id,
      'new_message',
      `Message from ${req.user!.full_name}`,
      cleanBody.slice(0, 90),
      '/messages'
    );
  }

  res.status(201).json({ id: msgId, body: cleanBody });
});

// Notifications
messagingRouter.get('/notifications', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user!.id);
  const unreadCount = (
    db
      .prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(req.user!.id) as { cnt: number }
  ).cnt;

  res.json({ notifications: rows, unreadCount });
});

messagingRouter.patch('/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    req.params.id,
    req.user!.id
  );
  res.json({ message: 'Notification marked as read.' });
});

messagingRouter.post('/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ message: 'All notifications marked as read.' });
});
