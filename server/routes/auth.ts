import crypto from 'node:crypto';
import { Router } from 'express';
import { db, hashPassword, newId, verifyPassword } from '../db.ts';
import {
  type AuthedRequest,
  createNotification,
  createSession,
  deleteSession,
  hashToken,
  requireAuth,
  SESSION_COOKIE_NAME,
  writeAuditLog,
} from '../auth.ts';
import { getPublicLegalDocuments } from '../policies.ts';

export const authRouter = Router();

function isValidKenyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+254|254|0)(7|1)\d{8}$/.test(cleaned);
}

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

export function getLegalDocsStatus() {
  return getPublicLegalDocuments();
}

authRouter.get('/legal-documents', (_req, res) => {
  res.json(getPublicLegalDocuments());
});

authRouter.get('/me', (req: AuthedRequest, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }

  const studentProfile = db
    .prepare('SELECT * FROM student_profiles WHERE user_id = ?')
    .get(req.user.id);
  const hostProfile = db
    .prepare('SELECT * FROM host_profiles WHERE user_id = ?')
    .get(req.user.id);
  const profile = db
    .prepare('SELECT * FROM profiles WHERE user_id = ?')
    .get(req.user.id);
  const latestApplication = db
    .prepare('SELECT * FROM host_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(req.user.id);
  const consents = db
    .prepare('SELECT channel, opted_in, updated_at FROM notification_consents WHERE user_id = ?')
    .all(req.user.id);

  res.json({
    user: {
      ...req.user,
      profile,
      studentProfile: studentProfile ?? null,
      hostProfile: hostProfile ?? null,
      latestHostApplication: latestApplication ?? null,
      notificationConsents: consents,
    },
  });
});

authRouter.post('/register-student', (req, res) => {
  const { fullName, email, phone, password, institution, campus, course, yearOfStudy, preferredTown } =
    req.body ?? {};

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Full name is required (at least 2 characters).' });
    return;
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }
  if (!phone || typeof phone !== 'string' || !isValidKenyanPhone(phone)) {
    res.status(400).json({ error: 'Enter a valid Kenyan phone number (e.g. +254 712 345 678 or 0712345678).' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }
  if (!institution || typeof institution !== 'string' || institution.trim().length < 2) {
    res.status(400).json({ error: 'University or college name is required.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const userId = newId();
  const passwordHash = hashPassword(password);

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, status, email_verified) VALUES (?, ?, ?, \'student\', \'active\', 0)'
    ).run(userId, normalizedEmail, passwordHash);

    db.prepare(
      'INSERT INTO profiles (user_id, full_name, phone, preferred_town) VALUES (?, ?, ?, ?)'
    ).run(userId, fullName.trim(), phone.trim(), preferredTown?.trim() || null);

    db.prepare(
      'INSERT INTO student_profiles (user_id, institution, campus, course, year_of_study) VALUES (?, ?, ?, ?, ?)'
    ).run(
      userId,
      institution.trim(),
      campus?.trim() || null,
      course?.trim() || null,
      yearOfStudy?.trim() || null
    );

    writeAuditLog(userId, 'student_registered', 'user', userId, { institution: institution.trim() });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to create student account.' });
    return;
  }

  const token = createSession(userId);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(201).json({ message: 'Student account created successfully.', userId });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db
    .prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as
    | { id: string; email: string; password_hash: string; role: string; status: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: `Your account is currently ${user.status}. Contact support for assistance.` });
    return;
  }

  const token = createSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  writeAuditLog(user.id, 'user_login', 'user', user.id);
  res.json({ message: 'Logged in successfully.', role: user.role });
});

authRouter.post('/logout', (req, res) => {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (rawToken && typeof rawToken === 'string') {
    deleteSession(rawToken);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ message: 'Logged out.' });
});

authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  const emailProviderConfigured = getSetting('email_provider_configured') === 'true';
  const user = db
    .prepare('SELECT id, email FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as { id: string; email: string } | undefined;

  if (user) {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
    ).run(newId(), user.id, tokenHash, expiresAt);

    writeAuditLog(user.id, 'password_reset_requested', 'user', user.id);

    if (!emailProviderConfigured) {
      // Do not pretend email delivery succeeded when provider is not configured
      res.status(200).json({
        emailSent: false,
        message:
          'A password reset token was generated and logged on the server, but outbound email delivery is not yet configured (SMTP/Email provider missing). Contact the administrator or configure email delivery in Platform Settings.',
      });
      return;
    }
  }

  res.json({
    emailSent: emailProviderConfigured,
    message: emailProviderConfigured
      ? 'If an account matches that email, password reset instructions have been sent.'
      : 'Password recovery processed, though outbound email provider is not yet configured.',
  });
});

authRouter.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ error: 'Valid reset token and a new password (8+ characters) are required.' });
    return;
  }

  const tokenHash = hashToken(token.trim());
  const record = db
    .prepare(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`
    )
    .get(tokenHash) as { id: string; user_id: string } | undefined;

  if (!record) {
    res.status(400).json({ error: 'Reset token is invalid or has expired.' });
    return;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      hashPassword(newPassword),
      record.user_id
    );
    db.prepare('UPDATE password_reset_tokens SET used_at = datetime(\'now\') WHERE id = ?').run(record.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(record.user_id);
    writeAuditLog(record.user_id, 'password_reset_completed', 'user', record.user_id);
    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Could not reset password.' });
    return;
  }

  res.json({ message: 'Password updated successfully. Please log in with your new password.' });
});

authRouter.post('/change-password', requireAuth, (req: AuthedRequest, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ error: 'Current password and new password (8+ characters) are required.' });
    return;
  }

  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as {
    password_hash: string;
  };
  if (!verifyPassword(currentPassword, row.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    hashPassword(newPassword),
    req.user!.id
  );
  writeAuditLog(req.user!.id, 'password_changed', 'user', req.user!.id);
  res.json({ message: 'Password changed successfully.' });
});

authRouter.put('/profile', requireAuth, (req: AuthedRequest, res) => {
  const {
    fullName,
    phone,
    bio,
    preferredTown,
    institution,
    campus,
    course,
    yearOfStudy,
    preferredBudgetMin,
    preferredBudgetMax,
    businessOrPropertyName,
    operatingTowns,
  } = req.body ?? {};

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }
  if (!phone || typeof phone !== 'string' || !isValidKenyanPhone(phone)) {
    res.status(400).json({ error: 'A valid Kenyan phone number is required.' });
    return;
  }

  // Note: NEVER accept role changes here! Role changes only happen via verified admin workflow.
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE profiles
       SET full_name = ?, phone = ?, bio = ?, preferred_town = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(fullName.trim(), phone.trim(), bio?.trim() || null, preferredTown?.trim() || null, req.user!.id);

    const hasStudent = db
      .prepare('SELECT user_id FROM student_profiles WHERE user_id = ?')
      .get(req.user!.id);
    if (hasStudent && institution) {
      db.prepare(
        `UPDATE student_profiles
         SET institution = ?, campus = ?, course = ?, year_of_study = ?,
             preferred_budget_min = ?, preferred_budget_max = ?, updated_at = datetime('now')
         WHERE user_id = ?`
      ).run(
        institution.trim(),
        campus?.trim() || null,
        course?.trim() || null,
        yearOfStudy?.trim() || null,
        preferredBudgetMin ? Number(preferredBudgetMin) : null,
        preferredBudgetMax ? Number(preferredBudgetMax) : null,
        req.user!.id
      );
    }

    const hasHost = db.prepare('SELECT user_id FROM host_profiles WHERE user_id = ?').get(req.user!.id);
    if (hasHost) {
      db.prepare(
        `UPDATE host_profiles
         SET business_or_property_name = COALESCE(?, business_or_property_name),
             operating_towns = COALESCE(?, operating_towns),
             updated_at = datetime('now')
         WHERE user_id = ?`
      ).run(businessOrPropertyName?.trim() || null, operatingTowns?.trim() || null, req.user!.id);
    }

    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to update profile.' });
    return;
  }

  res.json({ message: 'Profile updated successfully.' });
});

/**
 * Host Application Endpoint:
 * Supports BOTH:
 * 1) Existing authenticated student applying using their existing account (preserves user ID & student access).
 * 2) New applicant registering + submitting a host application (starts with 'student' base role until approved).
 *
 * STRICT POLICY COMPLIANCE:
 * Blocks submission if approved Host Terms and Community Standards documents/versions have not been supplied!
 */
authRouter.post('/host-applications', (req: AuthedRequest, res) => {
  const legal = getPublicLegalDocuments();
  if (!legal.ready) {
    res.status(400).json({
      error: `Host registration is temporarily unavailable because the platform administrator has not published: ${legal.missing.join(', ')}.`,
      missingLegalDocs: legal.missing,
    });
    return;
  }

  const {
    requestedRole,
    fullName,
    email,
    phone,
    password,
    businessOrPropertyName,
    operatingTowns,
    nationalIdReference,
    verificationNotes,
    acceptHostTerms,
    acceptCommunityStandards,
    acceptedHostTermsVersion,
    acceptedCommunityStandardsVersion,
    optInSms,
    optInWhatsapp,
  } = req.body ?? {};

  if (requestedRole !== 'owner' && requestedRole !== 'caretaker') {
    res.status(400).json({ error: 'Select whether you are applying as a Property Owner or Resident Caretaker.' });
    return;
  }
  if (acceptHostTerms !== true || acceptCommunityStandards !== true) {
    res.status(400).json({
      error: 'You must independently read and accept both the Host Terms & Conditions and the Community Standards.',
    });
    return;
  }
  if (
    typeof acceptedHostTermsVersion !== 'string' ||
    !acceptedHostTermsVersion.trim() ||
    typeof acceptedCommunityStandardsVersion !== 'string' ||
    !acceptedCommunityStandardsVersion.trim()
  ) {
    res.status(400).json({
      error: 'Policy version confirmation is required. Please refresh and review the published policies before submitting.',
    });
    return;
  }
  if (
    acceptedHostTermsVersion.trim() !== legal.hostTermsVersion ||
    acceptedCommunityStandardsVersion.trim() !== legal.communityStandardsVersion
  ) {
    res.status(409).json({
      error:
        'The policy version on your form does not match the currently published version (an administrator may have published an update). Please review and accept the latest policies before submitting.',
      currentVersions: {
        hostTermsVersion: legal.hostTermsVersion,
        communityStandardsVersion: legal.communityStandardsVersion,
      },
    });
    return;
  }
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }
  if (!phone || typeof phone !== 'string' || !isValidKenyanPhone(phone)) {
    res.status(400).json({ error: 'A valid Kenyan phone number is required.' });
    return;
  }
  if (!operatingTowns || typeof operatingTowns !== 'string' || operatingTowns.trim().length < 2) {
    res.status(400).json({ error: 'Operating towns or estates are required.' });
    return;
  }
  if (!nationalIdReference || typeof nationalIdReference !== 'string' || nationalIdReference.trim().length < 4) {
    res.status(400).json({ error: 'National ID or registration reference (last 4 digits / ref) is required.' });
    return;
  }

  let targetUserId = req.user?.id;
  let createdNewUser = false;

  db.exec('BEGIN IMMEDIATE');
  try {
    if (!targetUserId) {
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        db.exec('ROLLBACK');
        res.status(400).json({ error: 'A valid email address is required.' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        db.exec('ROLLBACK');
        res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existing) {
        db.exec('ROLLBACK');
        res.status(409).json({
          error: 'An account with this email already exists. Please log in first so your existing account is preserved.',
        });
        return;
      }

      targetUserId = newId();
      createdNewUser = true;
      db.prepare(
        'INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, \'student\', \'active\')'
      ).run(targetUserId, normalizedEmail, hashPassword(password));
      db.prepare('INSERT INTO profiles (user_id, full_name, phone) VALUES (?, ?, ?)').run(
        targetUserId,
        fullName.trim(),
        phone.trim()
      );
    } else {
      // Prevent duplicate pending application for the same user
      const pendingApp = db
        .prepare("SELECT id FROM host_applications WHERE user_id = ? AND status = 'pending'")
        .get(targetUserId);
      if (pendingApp) {
        db.exec('ROLLBACK');
        res.status(409).json({ error: 'You already have a pending host application under review.' });
        return;
      }
    }

    const appId = newId();
    db.prepare(
      `INSERT INTO host_applications (
        id, user_id, requested_role, status, full_name, phone,
        business_or_property_name, operating_towns, national_id_reference, verification_notes
      ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
    ).run(
      appId,
      targetUserId,
      requestedRole,
      fullName.trim(),
      phone.trim(),
      businessOrPropertyName?.trim() || null,
      operatingTowns.trim(),
      nationalIdReference.trim(),
      verificationNotes?.trim() || 'Submitted via UniNest Host Application'
    );

    const ip = req.ip || 'unknown';
    // Record separate auditable legal acceptances with document version
    db.prepare(
      `INSERT INTO host_terms_acceptances (id, user_id, application_id, document_type, document_version, ip_address)
       VALUES (?, ?, ?, 'host_terms', ?, ?)`
    ).run(newId(), targetUserId, appId, legal.hostTermsVersion!, ip);

    db.prepare(
      `INSERT INTO host_terms_acceptances (id, user_id, application_id, document_type, document_version, ip_address)
       VALUES (?, ?, ?, 'community_standards', ?, ?)`
    ).run(newId(), targetUserId, appId, legal.communityStandardsVersion!, ip);

    // Optional SMS / WhatsApp consents: ONLY recorded if explicitly opted in
    if (optInSms === true) {
      db.prepare(
        `INSERT INTO notification_consents (id, user_id, channel, opted_in)
         VALUES (?, ?, 'sms', 1)
         ON CONFLICT(user_id, channel) DO UPDATE SET opted_in = 1, updated_at = datetime('now')`
      ).run(newId(), targetUserId);
      db.prepare(
        'INSERT INTO notification_consent_events (id, user_id, channel, action, source) VALUES (?, ?, \'sms\', \'opt_in\', \'host_application\')'
      ).run(newId(), targetUserId);
    }

    if (optInWhatsapp === true) {
      db.prepare(
        `INSERT INTO notification_consents (id, user_id, channel, opted_in)
         VALUES (?, ?, 'whatsapp', 1)
         ON CONFLICT(user_id, channel) DO UPDATE SET opted_in = 1, updated_at = datetime('now')`
      ).run(newId(), targetUserId);
      db.prepare(
        'INSERT INTO notification_consent_events (id, user_id, channel, action, source) VALUES (?, ?, \'whatsapp\', \'opt_in\', \'host_application\')'
      ).run(newId(), targetUserId);
    }

    writeAuditLog(targetUserId, 'host_application_submitted', 'host_application', appId, {
      requestedRole,
      preservedExistingAccount: !createdNewUser,
      hostTermsVersion: legal.hostTermsVersion,
      communityStandardsVersion: legal.communityStandardsVersion,
    });

    // Notify admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'").all() as Array<{
      id: string;
    }>;
    for (const adm of admins) {
      createNotification(
        adm.id,
        'host_application',
        'New Host Application Submitted',
        `${fullName.trim()} applied for ${requestedRole} access.`,
        '/admin/applications'
      );
    }

    db.exec('COMMIT');

    if (createdNewUser) {
      const token = createSession(targetUserId);
      res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    res.status(201).json({
      message: 'Host application submitted and is pending administrator review.',
      applicationId: appId,
    });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to submit host application.' });
  }
});

authRouter.post('/notification-consents', requireAuth, (req: AuthedRequest, res) => {
  const { channel, optedIn } = req.body ?? {};
  if (!['sms', 'whatsapp', 'email_marketing'].includes(channel) || typeof optedIn !== 'boolean') {
    res.status(400).json({ error: 'Invalid channel or consent state.' });
    return;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO notification_consents (id, user_id, channel, opted_in)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, channel) DO UPDATE SET opted_in = excluded.opted_in, updated_at = datetime('now')`
    ).run(newId(), req.user!.id, channel, optedIn ? 1 : 0);

    db.prepare(
      'INSERT INTO notification_consent_events (id, user_id, channel, action, source) VALUES (?, ?, ?, ?, \'user_settings\')'
    ).run(newId(), req.user!.id, channel, optedIn ? 'opt_in' : 'withdraw');

    db.exec('COMMIT');
  } catch {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Could not update consent preference.' });
    return;
  }

  res.json({ message: optedIn ? `Opted in to ${channel} notifications.` : `Withdrew ${channel} notification consent.` });
});
