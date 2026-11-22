import { Router } from 'express';
import { db, newId } from '../db.ts';
import {
  type AuthedRequest,
  createNotification,
  requireRole,
  writeAuditLog,
} from '../auth.ts';
import {
  getAdminPoliciesOverview,
  type PolicyDocumentType,
  publishPolicyVersion,
  savePolicyDraft,
} from '../policies.ts';

export const adminRouter = Router();

// Protect every route in adminRouter on the server!
adminRouter.use(requireRole('admin'));

adminRouter.get('/stats', (_req, res) => {
  const usersByRole = db
    .prepare('SELECT role, COUNT(*) as cnt FROM users GROUP BY role')
    .all() as Array<{ role: string; cnt: number }>;

  const totalUsers = usersByRole.reduce((acc, r) => acc + r.cnt, 0);
  const roleMap = Object.fromEntries(usersByRole.map((r) => [r.role, r.cnt]));

  const pendingApplications = (
    db.prepare("SELECT COUNT(*) as cnt FROM host_applications WHERE status = 'pending'").get() as { cnt: number }
  ).cnt;

  const propsByStatus = db
    .prepare('SELECT listing_status, COUNT(*) as cnt FROM properties GROUP BY listing_status')
    .all() as Array<{ listing_status: string; cnt: number }>;
  const propStatusMap = Object.fromEntries(propsByStatus.map((p) => [p.listing_status, p.cnt]));

  const openReports = (
    db.prepare("SELECT COUNT(*) as cnt FROM reports WHERE status IN ('open', 'reviewing')").get() as { cnt: number }
  ).cnt;

  const recentActivity = db
    .prepare(
      `SELECT al.*, pr.full_name as actor_name
       FROM audit_logs al
       LEFT JOIN profiles pr ON pr.user_id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT 15`
    )
    .all();

  res.json({
    stats: {
      totalUsers,
      students: roleMap.student ?? 0,
      owners: roleMap.owner ?? 0,
      caretakers: roleMap.caretaker ?? 0,
      admins: roleMap.admin ?? 0,
      pendingApplications,
      pendingProperties: propStatusMap.pending_review ?? 0,
      approvedProperties: propStatusMap.approved ?? 0,
      rejectedProperties: propStatusMap.rejected ?? 0,
      openReports,
    },
    recentActivity,
  });
});

adminRouter.get('/users', (_req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.created_at,
              pr.full_name, pr.phone, pr.preferred_town,
              sp.institution, hp.verification_status as host_verification_status
       FROM users u
       JOIN profiles pr ON pr.user_id = u.id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN host_profiles hp ON hp.user_id = u.id
       ORDER BY u.created_at DESC`
    )
    .all();
  res.json({ users });
});

adminRouter.patch('/users/:id/status', (req: AuthedRequest, res) => {
  const { status, reason } = req.body ?? {};
  const targetUserId = String(req.params.id);
  if (!['active', 'suspended', 'deactivated'].includes(status)) {
    res.status(400).json({ error: 'Invalid account status.' });
    return;
  }
  if (targetUserId === req.user!.id && status !== 'active') {
    res.status(400).json({ error: 'Administrators cannot suspend their own active session account.' });
    return;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, targetUserId);
    if (status !== 'active') {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
    }
    writeAuditLog(req.user!.id, `user_status_${status}`, 'user', targetUserId, { reason: reason || null });
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to update user status.' });
    return;
  }

  res.json({ message: `User account marked as ${status}.` });
});

// Host Applications
adminRouter.get('/host-applications', (_req, res) => {
  const apps = db
    .prepare(
      `SELECT ha.*, u.email, u.role as current_user_role,
              rev.full_name as reviewer_name
       FROM host_applications ha
       JOIN users u ON u.id = ha.user_id
       LEFT JOIN profiles rev ON rev.user_id = ha.reviewer_id
       ORDER BY CASE WHEN ha.status = 'pending' THEN 0 ELSE 1 END, ha.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const acceptanceStmt = db.prepare(
    `SELECT document_type, document_version, accepted_at
     FROM host_terms_acceptances
     WHERE application_id = ?
     ORDER BY accepted_at ASC`
  );

  const enriched = apps.map((app) => ({
    ...app,
    acceptances: acceptanceStmt.all(String(app.id)),
  }));

  res.json({ applications: enriched });
});

adminRouter.post('/host-applications/:id/review', (req: AuthedRequest, res) => {
  const { decision, reviewNotes } = req.body ?? {};
  const appId = String(req.params.id);

  if (decision !== 'approved' && decision !== 'rejected') {
    res.status(400).json({ error: 'Decision must be "approved" or "rejected".' });
    return;
  }
  if (!reviewNotes || String(reviewNotes).trim().length < 3) {
    res.status(400).json({ error: 'Review notes are required for auditing.' });
    return;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    // Prevent reviewing an application more than once
    const app = db.prepare('SELECT * FROM host_applications WHERE id = ?').get(appId) as
      | {
          id: string;
          user_id: string;
          requested_role: 'owner' | 'caretaker';
          status: string;
          business_or_property_name: string | null;
          operating_towns: string;
          national_id_reference: string;
        }
      | undefined;

    if (!app) {
      db.exec('ROLLBACK');
      res.status(404).json({ error: 'Host application not found.' });
      return;
    }

    if (app.status !== 'pending') {
      db.exec('ROLLBACK');
      res.status(409).json({ error: `Application has already been ${app.status} and cannot be reviewed twice.` });
      return;
    }

    db.prepare(
      `UPDATE host_applications
       SET status = ?, reviewer_id = ?, review_notes = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).run(decision, req.user!.id, String(reviewNotes).trim(), appId);

    if (decision === 'approved') {
      // Atomic role promotion preserving existing account ID & student history
      db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(
        app.requested_role,
        app.user_id
      );

      db.prepare(
        `INSERT INTO host_profiles (
          user_id, host_type, business_or_property_name, national_id_last4,
          operating_towns, verification_status, verified_at
        ) VALUES (?, ?, ?, ?, ?, 'verified', datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          host_type = excluded.host_type,
          business_or_property_name = excluded.business_or_property_name,
          operating_towns = excluded.operating_towns,
          verification_status = 'verified',
          verified_at = datetime('now'),
          updated_at = datetime('now')`
      ).run(
        app.user_id,
        app.requested_role,
        app.business_or_property_name,
        app.national_id_reference.slice(-4),
        app.operating_towns
      );
    }

    writeAuditLog(req.user!.id, `host_application_${decision}`, 'host_application', appId, {
      targetUserId: app.user_id,
      requestedRole: app.requested_role,
      reviewNotes: String(reviewNotes).trim(),
    });

    createNotification(
      app.user_id,
      'host_application_decision',
      `Host Application ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      decision === 'approved'
        ? `Your application for ${app.requested_role} access has been approved.`
        : `Your host application was rejected. Reason: ${String(reviewNotes).trim()}`,
      decision === 'approved' ? (app.requested_role === 'owner' ? '/host' : '/caretaker') : '/apply-host'
    );

    db.exec('COMMIT');
    res.json({ message: `Host application ${decision} successfully.` });
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to process host application review.' });
  }
});

// Property Verification Queue & Management
adminRouter.get('/properties', (_req, res) => {
  const properties = db
    .prepare(
      `SELECT p.*, pr.full_name as owner_name, u.email as owner_email,
              (SELECT image_url FROM property_images pi WHERE pi.property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) as primary_image
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       JOIN profiles pr ON pr.user_id = p.owner_id
       ORDER BY CASE WHEN p.listing_status = 'pending_review' THEN 0 ELSE 1 END, p.created_at DESC`
    )
    .all();
  res.json({ properties });
});

adminRouter.post('/properties/:id/verify', (req: AuthedRequest, res) => {
  const { decision, notes } = req.body ?? {};
  const propertyId = String(req.params.id);

  if (!['approved', 'rejected', 'suspended', 'reinstated'].includes(decision)) {
    res.status(400).json({ error: 'Invalid verification decision.' });
    return;
  }
  if ((decision === 'rejected' || decision === 'suspended') && (!notes || String(notes).trim().length < 3)) {
    res.status(400).json({ error: 'A reason is required when rejecting or suspending a listing.' });
    return;
  }

  const prop = db.prepare('SELECT id, title, owner_id FROM properties WHERE id = ?').get(propertyId) as
    | { id: string; title: string; owner_id: string }
    | undefined;
  if (!prop) {
    res.status(404).json({ error: 'Property not found.' });
    return;
  }

  const nextStatus = decision === 'reinstated' ? 'approved' : decision;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE properties
       SET listing_status = ?,
           rejection_reason = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(nextStatus, decision === 'rejected' || decision === 'suspended' ? String(notes).trim() : null, propertyId);

    db.prepare(
      'INSERT INTO property_verification_records (id, property_id, reviewer_id, decision, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(newId(), propertyId, req.user!.id, decision, notes?.trim() || null);

    writeAuditLog(req.user!.id, `property_${decision}`, 'property', propertyId, { notes: notes?.trim() || null });

    createNotification(
      prop.owner_id,
      'property_verification',
      `Listing ${nextStatus}: ${prop.title}`,
      notes?.trim()
        ? `Administrator decision: ${nextStatus}. Notes: ${notes.trim()}`
        : `Your property listing "${prop.title}" is now ${nextStatus}.`,
      '/host/properties'
    );

    db.exec('COMMIT');
    res.json({ message: `Listing marked as ${nextStatus}.` });
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to update listing verification status.' });
  }
});

// Content Moderation & Reports
adminRouter.get('/reports', (_req, res) => {
  const reports = db
    .prepare(
      `SELECT r.*, pr.full_name as reporter_name
       FROM reports r
       JOIN profiles pr ON pr.user_id = r.reporter_id
       ORDER BY CASE WHEN r.status = 'open' THEN 0 ELSE 1 END, r.created_at DESC`
    )
    .all();
  res.json({ reports });
});

adminRouter.post('/reports/:id/moderate', (req: AuthedRequest, res) => {
  const { status, actionTaken, reason } = req.body ?? {};
  const reportId = String(req.params.id);

  if (!['resolved', 'dismissed'].includes(status)) {
    res.status(400).json({ error: 'Report status must be "resolved" or "dismissed".' });
    return;
  }
  if (!reason || String(reason).trim().length < 3) {
    res.status(400).json({ error: 'Moderation reason is required.' });
    return;
  }

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as
    | { id: string; target_type: string; target_id: string; status: string }
    | undefined;
  if (!report) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE reports
       SET status = ?, reviewed_by = ?, resolution_notes = ?, reviewed_at = datetime('now')
       WHERE id = ?`
    ).run(status, req.user!.id, String(reason).trim(), reportId);

    if (actionTaken === 'hide_content') {
      if (report.target_type === 'discover_post') {
        db.prepare("UPDATE discover_posts SET moderation_status = 'hidden' WHERE id = ?").run(report.target_id);
      } else if (report.target_type === 'community_post') {
        db.prepare("UPDATE community_posts SET moderation_status = 'hidden' WHERE id = ?").run(report.target_id);
      } else if (report.target_type === 'property') {
        db.prepare("UPDATE properties SET listing_status = 'suspended', rejection_reason = ? WHERE id = ?").run(
          String(reason).trim(),
          report.target_id
        );
      }
    }

    db.prepare(
      `INSERT INTO moderation_actions (id, admin_id, report_id, target_type, target_id, action_taken, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(newId(), req.user!.id, reportId, report.target_type, report.target_id, actionTaken || status, String(reason).trim());

    writeAuditLog(req.user!.id, 'moderation_decision', 'report', reportId, {
      status,
      actionTaken: actionTaken || status,
      targetType: report.target_type,
      targetId: report.target_id,
    });

    db.exec('COMMIT');
    res.json({ message: 'Moderation action recorded.' });
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to execute moderation action.' });
  }
});

adminRouter.get('/audit-logs', (_req, res) => {
  const logs = db
    .prepare(
      `SELECT al.*, pr.full_name as actor_name, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       LEFT JOIN profiles pr ON pr.user_id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT 100`
    )
    .all();
  res.json({ logs });
});

adminRouter.get('/policies', (_req, res) => {
  res.json({ policies: getAdminPoliciesOverview() });
});

function parsePolicyType(raw: string): PolicyDocumentType | null {
  if (raw === 'host_terms' || raw === 'community_standards') return raw;
  return null;
}

adminRouter.put('/policies/:type/draft', (req: AuthedRequest, res) => {
  const docType = parsePolicyType(String(req.params.type));
  if (!docType) {
    res.status(400).json({ error: 'Invalid policy document type.' });
    return;
  }

  const { title, version, content, changeNotes } = req.body ?? {};
  try {
    const draft = savePolicyDraft(
      docType,
      {
        title: typeof title === 'string' ? title : '',
        version: typeof version === 'string' ? version : '',
        content: typeof content === 'string' ? content : '',
        changeNotes: typeof changeNotes === 'string' ? changeNotes : null,
      },
      req.user!.id
    );
    res.json({
      message: 'Policy draft saved.',
      draft,
      policies: getAdminPoliciesOverview(),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save policy draft.' });
  }
});

adminRouter.post('/policies/:type/publish', (req: AuthedRequest, res) => {
  const docType = parsePolicyType(String(req.params.type));
  if (!docType) {
    res.status(400).json({ error: 'Invalid policy document type.' });
    return;
  }

  const { title, version, content, changeNotes } = req.body ?? {};
  try {
    const published = publishPolicyVersion(
      docType,
      {
        title: typeof title === 'string' ? title : '',
        version: typeof version === 'string' ? version : '',
        content: typeof content === 'string' ? content : '',
        changeNotes: typeof changeNotes === 'string' ? changeNotes : null,
      },
      req.user!.id
    );
    res.json({
      message: `Published ${docType === 'host_terms' ? 'Host Terms & Conditions' : 'Community Standards'} v${published.version}.`,
      published,
      policies: getAdminPoliciesOverview(),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to publish policy document.' });
  }
});

adminRouter.get('/settings', (_req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM platform_settings').all() as Array<{
    key: string;
    value: string | null;
    updated_at: string;
  }>;
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({
    settings,
    integrations: {
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      smsProviderConfigured: settings.sms_provider_configured === 'true',
      whatsappProviderConfigured: settings.whatsapp_provider_configured === 'true',
      emailProviderConfigured: settings.email_provider_configured === 'true',
    },
  });
});

adminRouter.put('/settings', (req: AuthedRequest, res) => {
  const allowedKeys = ['platform_support_email'];

  const updates = req.body ?? {};
  const upsert = db.prepare(
    `INSERT INTO platform_settings (key, value, updated_by, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
  );

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const key of allowedKeys) {
      if (key in updates) {
        const val = typeof updates[key] === 'string' && updates[key].trim() ? updates[key].trim() : null;
        upsert.run(key, val, req.user!.id);
      }
    }
    writeAuditLog(req.user!.id, 'platform_settings_updated', 'platform_settings', null, {
      keys: Object.keys(updates).filter((k) => allowedKeys.includes(k)),
    });
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to update platform settings.' });
    return;
  }

  res.json({ message: 'Platform settings saved.' });
});
