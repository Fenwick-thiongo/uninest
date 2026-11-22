import { Router } from 'express';
import { db, newId } from '../db.ts';
import {
  type AuthedRequest,
  checkPropertyManageAccess,
  createNotification,
  requireAuth,
  requireRole,
  writeAuditLog,
} from '../auth.ts';
import { saveValidatedUpload, uploadMiddleware } from '../uploads.ts';

export const propertiesRouter = Router();

function hydrateProperties(rows: Array<Record<string, unknown>>, currentUserId?: string) {
  if (rows.length === 0) return [];

  const propIds = rows.map((r) => String(r.id));
  const placeholders = propIds.map(() => '?').join(',');

  const images = db
    .prepare(
      `SELECT id, property_id, image_url, caption, is_primary, sort_order
       FROM property_images WHERE property_id IN (${placeholders})
       ORDER BY is_primary DESC, sort_order ASC`
    )
    .all(...propIds) as Array<Record<string, unknown>>;

  const amenities = db
    .prepare(
      `SELECT pa.property_id, a.id, a.name, a.icon
       FROM property_amenities pa
       JOIN amenities a ON a.id = pa.amenity_id
       WHERE pa.property_id IN (${placeholders})`
    )
    .all(...propIds) as Array<Record<string, unknown>>;

  let savedSet = new Set<string>();
  if (currentUserId) {
    const savedRows = db
      .prepare(
        `SELECT property_id FROM saved_properties
         WHERE student_id = ? AND property_id IN (${placeholders})`
      )
      .all(currentUserId, ...propIds) as Array<{ property_id: string }>;
    savedSet = new Set(savedRows.map((s) => s.property_id));
  }

  return rows.map((row) => ({
    ...row,
    is_demo: Boolean(row.is_demo),
    is_saved: savedSet.has(String(row.id)),
    images: images.filter((img) => img.property_id === row.id),
    amenities: amenities.filter((am) => am.property_id === row.id),
  }));
}

propertiesRouter.get('/amenities', (_req, res) => {
  const rows = db.prepare('SELECT id, name, icon FROM amenities ORDER BY name ASC').all();
  res.json({ amenities: rows });
});

propertiesRouter.get('/', (req: AuthedRequest, res) => {
  const {
    q,
    town,
    estate,
    minBudget,
    maxBudget,
    propertyType,
    roomType,
    availability,
    amenity,
    sort = 'newest',
    page = '1',
    limit = '12',
  } = req.query as Record<string, string | undefined>;

  const where: string[] = ["p.listing_status = 'approved'"];
  const params: Array<string | number> = [];

  if (q && q.trim()) {
    const pattern = `%${q.trim()}%`;
    where.push(
      '(p.title LIKE ? OR p.town LIKE ? OR p.estate LIKE ? OR p.nearby_institution LIKE ? OR p.description LIKE ?)'
    );
    params.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (town && town !== 'all') {
    where.push('LOWER(p.town) = LOWER(?)');
    params.push(town.trim());
  }
  if (estate && estate.trim()) {
    where.push('p.estate LIKE ?');
    params.push(`%${estate.trim()}%`);
  }
  if (minBudget && Number(minBudget) > 0) {
    where.push('p.monthly_rent_kes >= ?');
    params.push(Number(minBudget));
  }
  if (maxBudget && Number(maxBudget) > 0) {
    where.push('p.monthly_rent_kes <= ?');
    params.push(Number(maxBudget));
  }
  if (propertyType && propertyType !== 'all') {
    where.push('p.property_type = ?');
    params.push(propertyType);
  }
  if (roomType && roomType !== 'all') {
    where.push('p.room_type LIKE ?');
    params.push(`%${roomType}%`);
  }
  if (availability && availability !== 'all') {
    where.push('p.availability_status = ?');
    params.push(availability);
  }
  if (amenity && amenity !== 'all') {
    where.push(
      'EXISTS (SELECT 1 FROM property_amenities pa WHERE pa.property_id = p.id AND pa.amenity_id = ?)'
    );
    params.push(amenity);
  }

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') orderBy = 'p.monthly_rent_kes ASC';
  else if (sort === 'price_desc') orderBy = 'p.monthly_rent_kes DESC';
  else if (sort === 'units') orderBy = 'p.units_available DESC';

  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(limit) || 12));
  const offset = (pageNum - 1) * pageSize;

  const whereSql = where.join(' AND ');
  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM properties p WHERE ${whereSql}`)
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT p.*, pr.full_name as owner_name, hp.verification_status as host_verification_status
       FROM properties p
       JOIN profiles pr ON pr.user_id = p.owner_id
       LEFT JOIN host_profiles hp ON hp.user_id = p.owner_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as Array<Record<string, unknown>>;

  res.json({
    properties: hydrateProperties(rows, req.user?.id),
    pagination: {
      total: countRow.total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.max(1, Math.ceil(countRow.total / pageSize)),
    },
  });
});

propertiesRouter.get('/managed/mine', requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role === 'owner') {
    const rows = db
      .prepare('SELECT * FROM properties WHERE owner_id = ? ORDER BY created_at DESC')
      .all(user.id) as Array<Record<string, unknown>>;
    res.json({ properties: hydrateProperties(rows, user.id) });
    return;
  }

  if (user.role === 'caretaker') {
    const rows = db
      .prepare(
        `SELECT p.*, pc.can_edit_details, pc.can_upload_images, pc.can_manage_enquiries, pc.can_manage_viewings
         FROM properties p
         JOIN property_caretakers pc ON pc.property_id = p.id
         WHERE pc.caretaker_id = ? AND pc.status = 'active'
         ORDER BY p.created_at DESC`
      )
      .all(user.id) as Array<Record<string, unknown>>;
    res.json({ properties: hydrateProperties(rows, user.id) });
    return;
  }

  if (user.role === 'admin') {
    const rows = db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all() as Array<
      Record<string, unknown>
    >;
    res.json({ properties: hydrateProperties(rows, user.id) });
    return;
  }

  res.status(403).json({ error: 'Only approved property owners, caretakers, or admins can access managed listings.' });
});

propertiesRouter.get('/saved/mine', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, pr.full_name as owner_name
       FROM saved_properties sp
       JOIN properties p ON p.id = sp.property_id
       JOIN profiles pr ON pr.user_id = p.owner_id
       WHERE sp.student_id = ?
       ORDER BY sp.created_at DESC`
    )
    .all(req.user!.id) as Array<Record<string, unknown>>;

  res.json({ properties: hydrateProperties(rows, req.user!.id) });
});

propertiesRouter.get('/:id', (req: AuthedRequest, res) => {
  const prop = db
    .prepare(
      `SELECT p.*, pr.full_name as owner_name, hp.verification_status as host_verification_status,
              hp.business_or_property_name as host_business_name
       FROM properties p
       JOIN profiles pr ON pr.user_id = p.owner_id
       LEFT JOIN host_profiles hp ON hp.user_id = p.owner_id
       WHERE p.id = ? OR p.slug = ?`
    )
    .get(req.params.id, req.params.id) as Record<string, unknown> | undefined;

  if (!prop) {
    res.status(404).json({ error: 'Property not found.' });
    return;
  }

  const access = req.user ? checkPropertyManageAccess(req.user, String(prop.id)) : null;
  if (prop.listing_status !== 'approved' && !access?.allowed) {
    res.status(404).json({ error: 'Property is not publicly available.' });
    return;
  }

  // Active assigned caretaker public name (never expose raw phone/email publicly unless authorised or in active messaging)
  const caretaker = db
    .prepare(
      `SELECT u.id, pr.full_name
       FROM property_caretakers pc
       JOIN users u ON u.id = pc.caretaker_id
       JOIN profiles pr ON pr.user_id = u.id
       WHERE pc.property_id = ? AND pc.status = 'active'
       LIMIT 1`
    )
    .get(String(prop.id)) as { id: string; full_name: string } | undefined;

  const [hydrated] = hydrateProperties([prop], req.user?.id);
  res.json({
    property: {
      ...hydrated,
      assigned_caretaker: caretaker ?? null,
      manage_permissions: access?.allowed ? access : null,
    },
  });
});

propertiesRouter.post('/', requireRole('owner', 'admin'), (req: AuthedRequest, res) => {
  const {
    title,
    description,
    propertyType,
    roomType,
    town,
    estate,
    addressLandmark,
    nearbyInstitution,
    distanceToInstitution,
    monthlyRentKes,
    depositKes,
    unitsAvailable,
    availabilityStatus,
    amenityIds,
    submitForReview,
  } = req.body ?? {};

  if (!title || !description || !propertyType || !town || !estate || !monthlyRentKes || Number(monthlyRentKes) <= 0) {
    res.status(400).json({ error: 'Title, description, property type, town, estate, and positive monthly rent are required.' });
    return;
  }

  const id = newId();
  const slugBase = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slug = `${slugBase}-${id.slice(0, 6)}`;
  const listingStatus = submitForReview ? 'pending_review' : 'draft';

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO properties (
        id, owner_id, title, slug, description, property_type, room_type,
        town, estate, address_landmark, nearby_institution, distance_to_institution,
        monthly_rent_kes, deposit_kes, units_available, availability_status, listing_status, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      id,
      req.user!.id,
      String(title).trim(),
      slug,
      String(description).trim(),
      propertyType,
      roomType?.trim() || 'Private Unit',
      String(town).trim(),
      String(estate).trim(),
      addressLandmark?.trim() || null,
      nearbyInstitution?.trim() || null,
      distanceToInstitution?.trim() || null,
      Math.round(Number(monthlyRentKes)),
      Math.max(0, Math.round(Number(depositKes) || 0)),
      Math.max(0, Math.round(Number(unitsAvailable) || 1)),
      availabilityStatus || 'available',
      listingStatus
    );

    if (Array.isArray(amenityIds)) {
      const insertAm = db.prepare('INSERT OR IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)');
      for (const amId of amenityIds) {
        if (typeof amId === 'string') insertAm.run(id, amId);
      }
    }

    writeAuditLog(req.user!.id, 'property_created', 'property', id, { listingStatus });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to create property listing.' });
    return;
  }

  res.status(201).json({ id, slug, listingStatus, message: 'Property created successfully.' });
});

propertiesRouter.put('/:id', requireAuth, (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const access = checkPropertyManageAccess(req.user!, propertyId);
  if (!access.allowed || !access.canEditDetails) {
    res.status(403).json({ error: 'You do not have permission to edit this property.' });
    return;
  }

  const {
    title,
    description,
    propertyType,
    roomType,
    town,
    estate,
    addressLandmark,
    nearbyInstitution,
    distanceToInstitution,
    monthlyRentKes,
    depositKes,
    unitsAvailable,
    availabilityStatus,
    amenityIds,
    submitForReview,
    markUnavailable,
  } = req.body ?? {};

  const current = db.prepare('SELECT listing_status FROM properties WHERE id = ?').get(propertyId) as {
    listing_status: string;
  };
  if (!current) {
    res.status(404).json({ error: 'Property not found.' });
    return;
  }

  let nextStatus = current.listing_status;
  if (submitForReview && (access.isOwner || access.isAdmin)) {
    nextStatus = 'pending_review';
  } else if (markUnavailable === true && (access.isOwner || access.isAdmin)) {
    nextStatus = 'unavailable';
  } else if (markUnavailable === false && current.listing_status === 'unavailable' && (access.isOwner || access.isAdmin)) {
    nextStatus = 'pending_review';
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE properties
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           property_type = COALESCE(?, property_type),
           room_type = COALESCE(?, room_type),
           town = COALESCE(?, town),
           estate = COALESCE(?, estate),
           address_landmark = ?,
           nearby_institution = ?,
           distance_to_institution = ?,
           monthly_rent_kes = COALESCE(?, monthly_rent_kes),
           deposit_kes = COALESCE(?, deposit_kes),
           units_available = COALESCE(?, units_available),
           availability_status = COALESCE(?, availability_status),
           listing_status = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      title?.trim() || null,
      description?.trim() || null,
      propertyType || null,
      roomType?.trim() || null,
      town?.trim() || null,
      estate?.trim() || null,
      addressLandmark?.trim() || null,
      nearbyInstitution?.trim() || null,
      distanceToInstitution?.trim() || null,
      monthlyRentKes ? Math.round(Number(monthlyRentKes)) : null,
      depositKes !== undefined ? Math.max(0, Math.round(Number(depositKes))) : null,
      unitsAvailable !== undefined ? Math.max(0, Math.round(Number(unitsAvailable))) : null,
      availabilityStatus || null,
      nextStatus,
      propertyId
    );

    if (Array.isArray(amenityIds)) {
      db.prepare('DELETE FROM property_amenities WHERE property_id = ?').run(propertyId);
      const insertAm = db.prepare('INSERT OR IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)');
      for (const amId of amenityIds) {
        if (typeof amId === 'string') insertAm.run(propertyId, amId);
      }
    }

    writeAuditLog(req.user!.id, 'property_updated', 'property', propertyId, { nextStatus });
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to update property.' });
    return;
  }

  res.json({ message: 'Property updated successfully.', listingStatus: nextStatus });
});

propertiesRouter.post('/:id/images', requireAuth, uploadMiddleware.single('file'), (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const access = checkPropertyManageAccess(req.user!, propertyId);
  if (!access.allowed || !access.canUploadImages) {
    res.status(403).json({ error: 'You do not have permission to upload images for this property.' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Image file is required.' });
    return;
  }

  try {
    const saved = saveValidatedUpload(req.file.buffer, ['image']);
    const existingCount = (
      db.prepare('SELECT COUNT(*) as cnt FROM property_images WHERE property_id = ?').get(propertyId) as {
        cnt: number;
      }
    ).cnt;

    const imageId = newId();
    db.prepare(
      'INSERT INTO property_images (id, property_id, image_url, caption, is_primary, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(imageId, propertyId, saved.url, req.body?.caption?.trim() || null, existingCount === 0 ? 1 : 0, existingCount);

    res.status(201).json({ id: imageId, image_url: saved.url });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid image upload.' });
  }
});

propertiesRouter.delete('/:id/images/:imageId', requireAuth, (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const access = checkPropertyManageAccess(req.user!, propertyId);
  if (!access.allowed || !access.canUploadImages) {
    res.status(403).json({ error: 'You do not have permission to remove images for this property.' });
    return;
  }

  db.prepare('DELETE FROM property_images WHERE id = ? AND property_id = ?').run(req.params.imageId, propertyId);
  res.json({ message: 'Image removed.' });
});

// Caretaker assignments (Owner or Admin only)
propertiesRouter.get('/:id/caretakers', requireAuth, (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const access = checkPropertyManageAccess(req.user!, propertyId);
  if (!access.isOwner && !access.isAdmin) {
    res.status(403).json({ error: 'Only property owners or administrators can view caretaker assignments.' });
    return;
  }

  const rows = db
    .prepare(
      `SELECT pc.*, u.email, pr.full_name, pr.phone
       FROM property_caretakers pc
       JOIN users u ON u.id = pc.caretaker_id
       JOIN profiles pr ON pr.user_id = u.id
       WHERE pc.property_id = ?
       ORDER BY pc.created_at DESC`
    )
    .all(propertyId);

  res.json({ assignments: rows });
});

propertiesRouter.post('/:id/caretakers', requireRole('owner', 'admin'), (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const access = checkPropertyManageAccess(req.user!, propertyId);
  if (!access.isOwner && !access.isAdmin) {
    res.status(403).json({ error: 'Only the property owner or administrator can assign caretakers.' });
    return;
  }

  const { caretakerEmail, canEditDetails = true, canUploadImages = true, canManageEnquiries = true, canManageViewings = true } =
    req.body ?? {};

  if (!caretakerEmail || typeof caretakerEmail !== 'string') {
    res.status(400).json({ error: 'Caretaker email address is required.' });
    return;
  }

  const caretaker = db
    .prepare("SELECT id, role, status FROM users WHERE email = ? AND role = 'caretaker' AND status = 'active'")
    .get(caretakerEmail.trim().toLowerCase()) as { id: string } | undefined;

  if (!caretaker) {
    res.status(404).json({ error: 'No active approved Resident Caretaker account found for that email.' });
    return;
  }

  const existingActive = db
    .prepare("SELECT id FROM property_caretakers WHERE property_id = ? AND caretaker_id = ? AND status = 'active'")
    .get(propertyId, caretaker.id);
  if (existingActive) {
    res.status(409).json({ error: 'This caretaker is already actively assigned to this property.' });
    return;
  }

  const assignmentId = newId();
  db.prepare(
    `INSERT INTO property_caretakers (
      id, property_id, caretaker_id, assigned_by, status,
      can_edit_details, can_upload_images, can_manage_enquiries, can_manage_viewings
    ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
  ).run(
    assignmentId,
    propertyId,
    caretaker.id,
    req.user!.id,
    canEditDetails ? 1 : 0,
    canUploadImages ? 1 : 0,
    canManageEnquiries ? 1 : 0,
    canManageViewings ? 1 : 0
  );

  createNotification(
    caretaker.id,
    'caretaker_assignment',
    'New Property Assignment',
    'You have been assigned as resident caretaker for a property on UniNest.',
    '/caretaker'
  );
  writeAuditLog(req.user!.id, 'caretaker_assigned', 'property_caretakers', assignmentId, {
    propertyId,
    caretakerId: caretaker.id,
  });

  res.status(201).json({ id: assignmentId, message: 'Caretaker assigned successfully.' });
});

propertiesRouter.delete('/:id/caretakers/:assignmentId', requireRole('owner', 'admin'), (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const access = checkPropertyManageAccess(req.user!, propertyId);
  if (!access.isOwner && !access.isAdmin) {
    res.status(403).json({ error: 'Only the property owner or administrator can revoke caretaker assignments.' });
    return;
  }

  db.prepare(
    "UPDATE property_caretakers SET status = 'revoked', updated_at = datetime('now') WHERE id = ? AND property_id = ?"
  ).run(req.params.assignmentId, propertyId);

  writeAuditLog(req.user!.id, 'caretaker_revoked', 'property_caretakers', String(req.params.assignmentId));
  res.json({ message: 'Caretaker access revoked.' });
});

// Save / Unsave favourites
propertiesRouter.post('/:id/save', requireAuth, (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const prop = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
  if (!prop) {
    res.status(404).json({ error: 'Property not found.' });
    return;
  }

  db.prepare('INSERT OR IGNORE INTO saved_properties (id, student_id, property_id) VALUES (?, ?, ?)').run(
    newId(),
    req.user!.id,
    propertyId
  );
  res.json({ saved: true });
});

propertiesRouter.delete('/:id/save', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM saved_properties WHERE student_id = ? AND property_id = ?').run(
    req.user!.id,
    String(req.params.id)
  );
  res.json({ saved: false });
});

// Enquiries
propertiesRouter.get('/enquiries/mine', requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role === 'student') {
    const rows = db
      .prepare(
        `SELECT e.*, p.title as property_title, p.town, p.estate, p.monthly_rent_kes
         FROM enquiries e
         JOIN properties p ON p.id = e.property_id
         WHERE e.student_id = ?
         ORDER BY e.created_at DESC`
      )
      .all(user.id);
    res.json({ enquiries: rows });
    return;
  }

  if (user.role === 'owner') {
    const rows = db
      .prepare(
        `SELECT e.*, p.title as property_title, p.town, pr.full_name as student_name, sp.institution as student_institution
         FROM enquiries e
         JOIN properties p ON p.id = e.property_id
         JOIN profiles pr ON pr.user_id = e.student_id
         LEFT JOIN student_profiles sp ON sp.user_id = e.student_id
         WHERE p.owner_id = ?
         ORDER BY e.created_at DESC`
      )
      .all(user.id);
    res.json({ enquiries: rows });
    return;
  }

  if (user.role === 'caretaker') {
    const rows = db
      .prepare(
        `SELECT e.*, p.title as property_title, p.town, pr.full_name as student_name, sp.institution as student_institution
         FROM enquiries e
         JOIN properties p ON p.id = e.property_id
         JOIN property_caretakers pc ON pc.property_id = p.id
         JOIN profiles pr ON pr.user_id = e.student_id
         LEFT JOIN student_profiles sp ON sp.user_id = e.student_id
         WHERE pc.caretaker_id = ? AND pc.status = 'active' AND pc.can_manage_enquiries = 1
         ORDER BY e.created_at DESC`
      )
      .all(user.id);
    res.json({ enquiries: rows });
    return;
  }

  const rows = db
    .prepare(
      `SELECT e.*, p.title as property_title, p.town, pr.full_name as student_name
       FROM enquiries e
       JOIN properties p ON p.id = e.property_id
       JOIN profiles pr ON pr.user_id = e.student_id
       ORDER BY e.created_at DESC`
    )
    .all();
  res.json({ enquiries: rows });
});

propertiesRouter.post('/:id/enquiries', requireAuth, (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const { subject, message, moveInMonth } = req.body ?? {};

  if (!subject || !message || String(message).trim().length < 5) {
    res.status(400).json({ error: 'Enquiry subject and message (5+ characters) are required.' });
    return;
  }

  const prop = db
    .prepare("SELECT id, title, owner_id FROM properties WHERE id = ? AND listing_status = 'approved'")
    .get(propertyId) as { id: string; title: string; owner_id: string } | undefined;
  if (!prop) {
    res.status(404).json({ error: 'Approved property not found.' });
    return;
  }

  const enquiryId = newId();
  db.prepare(
    'INSERT INTO enquiries (id, property_id, student_id, subject, message, move_in_month) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(enquiryId, propertyId, req.user!.id, String(subject).trim(), String(message).trim(), moveInMonth?.trim() || null);

  createNotification(
    prop.owner_id,
    'new_enquiry',
    `New Enquiry: ${prop.title}`,
    `${req.user!.full_name} sent an enquiry: "${String(subject).trim()}"`,
    '/host/enquiries'
  );

  // Also notify active caretakers assigned to this property
  const caretakers = db
    .prepare("SELECT caretaker_id FROM property_caretakers WHERE property_id = ? AND status = 'active' AND can_manage_enquiries = 1")
    .all(propertyId) as Array<{ caretaker_id: string }>;
  for (const ct of caretakers) {
    createNotification(
      ct.caretaker_id,
      'new_enquiry',
      `New Enquiry: ${prop.title}`,
      `${req.user!.full_name} sent an enquiry: "${String(subject).trim()}"`,
      '/caretaker/enquiries'
    );
  }

  res.status(201).json({ id: enquiryId, message: 'Enquiry sent to the property host.' });
});

propertiesRouter.patch('/enquiries/:enquiryId/respond', requireAuth, (req: AuthedRequest, res) => {
  const { reply, status } = req.body ?? {};
  const enquiry = db
    .prepare('SELECT id, property_id, student_id FROM enquiries WHERE id = ?')
    .get(req.params.enquiryId) as { id: string; property_id: string; student_id: string } | undefined;

  if (!enquiry) {
    res.status(404).json({ error: 'Enquiry not found.' });
    return;
  }

  const access = checkPropertyManageAccess(req.user!, enquiry.property_id);
  if (!access.allowed || !access.canManageEnquiries) {
    res.status(403).json({ error: 'You are not authorised to respond to this enquiry.' });
    return;
  }

  const nextStatus = status === 'closed' ? 'closed' : 'responded';
  db.prepare(
    `UPDATE enquiries
     SET host_reply = COALESCE(?, host_reply),
         status = ?,
         responded_by = ?,
         responded_at = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(reply?.trim() || null, nextStatus, req.user!.id, enquiry.id);

  createNotification(
    enquiry.student_id,
    'enquiry_reply',
    'Enquiry Update',
    `${req.user!.full_name} updated your accommodation enquiry.`,
    '/student/enquiries'
  );

  res.json({ message: 'Enquiry updated.' });
});

// Viewing requests
propertiesRouter.get('/viewings/mine', requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  if (user.role === 'student') {
    const rows = db
      .prepare(
        `SELECT v.*, p.title as property_title, p.town, p.estate
         FROM viewing_requests v
         JOIN properties p ON p.id = v.property_id
         WHERE v.student_id = ?
         ORDER BY v.requested_date ASC`
      )
      .all(user.id);
    res.json({ viewings: rows });
    return;
  }

  if (user.role === 'owner') {
    const rows = db
      .prepare(
        `SELECT v.*, p.title as property_title, p.town, pr.full_name as student_name
         FROM viewing_requests v
         JOIN properties p ON p.id = v.property_id
         JOIN profiles pr ON pr.user_id = v.student_id
         WHERE p.owner_id = ?
         ORDER BY v.requested_date ASC`
      )
      .all(user.id);
    res.json({ viewings: rows });
    return;
  }

  if (user.role === 'caretaker') {
    const rows = db
      .prepare(
        `SELECT v.*, p.title as property_title, p.town, pr.full_name as student_name
         FROM viewing_requests v
         JOIN properties p ON p.id = v.property_id
         JOIN property_caretakers pc ON pc.property_id = p.id
         JOIN profiles pr ON pr.user_id = v.student_id
         WHERE pc.caretaker_id = ? AND pc.status = 'active' AND pc.can_manage_viewings = 1
         ORDER BY v.requested_date ASC`
      )
      .all(user.id);
    res.json({ viewings: rows });
    return;
  }

  const rows = db
    .prepare(
      `SELECT v.*, p.title as property_title, p.town, pr.full_name as student_name
       FROM viewing_requests v
       JOIN properties p ON p.id = v.property_id
       JOIN profiles pr ON pr.user_id = v.student_id
       ORDER BY v.requested_date ASC`
    )
    .all();
  res.json({ viewings: rows });
});

propertiesRouter.post('/:id/viewings', requireAuth, (req: AuthedRequest, res) => {
  const propertyId = String(req.params.id);
  const { requestedDate, requestedTime, notes } = req.body ?? {};

  if (!requestedDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    res.status(400).json({ error: 'Valid viewing date (YYYY-MM-DD) is required.' });
    return;
  }
  if (!requestedTime || !/^\d{2}:\d{2}$/.test(requestedTime)) {
    res.status(400).json({ error: 'Valid viewing time (HH:MM) is required.' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (requestedDate < today) {
    res.status(400).json({ error: 'Viewing date cannot be in the past.' });
    return;
  }

  const prop = db
    .prepare("SELECT id, title, owner_id FROM properties WHERE id = ? AND listing_status = 'approved'")
    .get(propertyId) as { id: string; title: string; owner_id: string } | undefined;
  if (!prop) {
    res.status(404).json({ error: 'Approved property not found.' });
    return;
  }

  const viewingId = newId();
  db.prepare(
    'INSERT INTO viewing_requests (id, property_id, student_id, requested_date, requested_time, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(viewingId, propertyId, req.user!.id, requestedDate, requestedTime, notes?.trim() || null);

  createNotification(
    prop.owner_id,
    'viewing_request',
    `New Viewing Request: ${prop.title}`,
    `${req.user!.full_name} requested a viewing on ${requestedDate} at ${requestedTime}.`,
    '/host/viewings'
  );

  const caretakers = db
    .prepare("SELECT caretaker_id FROM property_caretakers WHERE property_id = ? AND status = 'active' AND can_manage_viewings = 1")
    .all(propertyId) as Array<{ caretaker_id: string }>;
  for (const ct of caretakers) {
    createNotification(
      ct.caretaker_id,
      'viewing_request',
      `New Viewing Request: ${prop.title}`,
      `${req.user!.full_name} requested a viewing on ${requestedDate} at ${requestedTime}.`,
      '/caretaker/viewings'
    );
  }

  res.status(201).json({ id: viewingId, message: 'Viewing request submitted.' });
});

propertiesRouter.patch('/viewings/:viewingId', requireAuth, (req: AuthedRequest, res) => {
  const { status, proposedDate, proposedTime, hostNotes } = req.body ?? {};
  const viewing = db
    .prepare('SELECT v.*, p.title as property_title FROM viewing_requests v JOIN properties p ON p.id = v.property_id WHERE v.id = ?')
    .get(req.params.viewingId) as
    | { id: string; property_id: string; student_id: string; property_title: string }
    | undefined;

  if (!viewing) {
    res.status(404).json({ error: 'Viewing request not found.' });
    return;
  }

  // Student can only cancel their own viewing
  if (req.user!.id === viewing.student_id && status === 'cancelled') {
    db.prepare("UPDATE viewing_requests SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(
      viewing.id
    );
    res.json({ message: 'Viewing request cancelled.' });
    return;
  }

  const access = checkPropertyManageAccess(req.user!, viewing.property_id);
  if (!access.allowed || !access.canManageViewings) {
    res.status(403).json({ error: 'You are not authorised to update this viewing request.' });
    return;
  }

  if (!['accepted', 'rejected', 'rescheduled', 'completed'].includes(status)) {
    res.status(400).json({ error: 'Invalid viewing status.' });
    return;
  }

  if (status === 'rescheduled' && (!proposedDate || !proposedTime)) {
    res.status(400).json({ error: 'Alternative date and time are required when rescheduling.' });
    return;
  }

  db.prepare(
    `UPDATE viewing_requests
     SET status = ?,
         proposed_date = COALESCE(?, proposed_date),
         proposed_time = COALESCE(?, proposed_time),
         host_notes = COALESCE(?, host_notes),
         handled_by = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(status, proposedDate || null, proposedTime || null, hostNotes?.trim() || null, req.user!.id, viewing.id);

  createNotification(
    viewing.student_id,
    'viewing_update',
    `Viewing ${status}: ${viewing.property_title}`,
    status === 'rescheduled'
      ? `Alternative time proposed: ${proposedDate} at ${proposedTime}.`
      : `Your viewing request was marked as ${status}.`,
    '/student/viewings'
  );

  res.json({ message: `Viewing marked as ${status}.` });
});
