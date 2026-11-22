import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uninest-policy-test-'));
const tmpDbPath = path.join(tmpDir, 'test.db');
process.env.UNINEST_DB_PATH = tmpDbPath;

const { db, initDatabase } = await import('../server/db.ts');
const { attachAuth } = await import('../server/auth.ts');
const { authRouter } = await import('../server/routes/auth.ts');
const { adminRouter } = await import('../server/routes/admin.ts');

initDatabase();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(attachAuth);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

const server = await new Promise<import('node:http').Server>((resolve) => {
  const s = app.listen(0, '127.0.0.1', () => resolve(s));
});
const port = (server.address() as import('node:net').AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

async function req(
  urlPath: string,
  opts: RequestInit & { cookie?: string } = {}
): Promise<{ status: number; body: any; cookie?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (opts.cookie) {
    headers.cookie = opts.cookie;
  }
  const res = await fetch(`${baseUrl}${urlPath}`, { ...opts, headers });
  const setCookie = res.headers.get('set-cookie')?.split(';')[0];
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, cookie: setCookie };
}

try {
  // 1. Initially seeded drafts must NOT be published; host registration must be blocked.
  const initialDocs = await req('/api/auth/legal-documents');
  assert.equal(initialDocs.status, 200);
  assert.equal(initialDocs.body.ready, false);
  assert.equal(initialDocs.body.hostTermsVersion, null);
  assert.equal(initialDocs.body.communityStandardsVersion, null);
  assert.equal(initialDocs.body.missing.length, 2);

  const blockedSubmit = await req('/api/auth/host-applications', {
    method: 'POST',
    body: JSON.stringify({
      requestedRole: 'owner',
      fullName: 'Blocked Applicant',
      email: 'blocked@uninest.ke',
      phone: '+254712000111',
      password: 'Password123!',
      operatingTowns: 'Juja',
      nationalIdReference: '1234',
      acceptHostTerms: true,
      acceptCommunityStandards: true,
    }),
  });
  assert.equal(blockedSubmit.status, 400);
  assert.match(blockedSubmit.body.error, /temporarily unavailable/i);
  console.log('PASS 1: Unpublished initial drafts safely block host registration.');

  // 2. Unauthenticated and non-admin users must NOT be able to view drafts, edit, or publish policies.
  const anonPolicies = await req('/api/admin/policies');
  assert.equal(anonPolicies.status, 401);

  const studentLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'amina.student@uninest.ke', password: 'UniNest2026!' }),
  });
  assert.equal(studentLogin.status, 200);
  assert.ok(studentLogin.cookie);

  const studentGetPolicies = await req('/api/admin/policies', { cookie: studentLogin.cookie });
  assert.equal(studentGetPolicies.status, 403);

  const studentEditDraft = await req('/api/admin/policies/host_terms/draft', {
    method: 'PUT',
    cookie: studentLogin.cookie,
    body: JSON.stringify({ title: 'Hack', version: '9.9', content: 'x'.repeat(120) }),
  });
  assert.equal(studentEditDraft.status, 403);

  const studentPublish = await req('/api/admin/policies/host_terms/publish', {
    method: 'POST',
    cookie: studentLogin.cookie,
    body: JSON.stringify({ title: 'Hack', version: '9.9', content: 'x'.repeat(120) }),
  });
  assert.equal(studentPublish.status, 403);
  console.log('PASS 2: Non-admin users blocked (401/403) from viewing drafts, editing, or publishing policies.');

  // 3. Admin logs in, inspects initial drafts, edits, and publishes v1.0 for both policies.
  const adminLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@uninest.ke', password: 'UniNestAdmin2026!' }),
  });
  assert.equal(adminLogin.status, 200);
  const adminCookie = adminLogin.cookie!;

  const adminPolicies = await req('/api/admin/policies', { cookie: adminCookie });
  assert.equal(adminPolicies.status, 200);
  assert.equal(adminPolicies.body.policies.length, 2);
  const termsBundle = adminPolicies.body.policies.find((p: any) => p.documentType === 'host_terms');
  const standardsBundle = adminPolicies.body.policies.find((p: any) => p.documentType === 'community_standards');
  assert.equal(termsBundle.published, null);
  assert.equal(termsBundle.draft.is_initial_draft, true);
  assert.equal(standardsBundle.published, null);
  assert.equal(standardsBundle.draft.is_initial_draft, true);

  // Publishing with "-draft" in version must be rejected
  const rejectDraftTag = await req('/api/admin/policies/host_terms/publish', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      title: 'UniNest Kenya Host Terms & Conditions',
      version: '1.0-draft',
      content: termsBundle.draft.content,
    }),
  });
  assert.equal(rejectDraftTag.status, 400);

  // Save edited draft first, then publish v1.0
  const editedTermsContent = termsBundle.draft.content.replace(
    '[INITIAL DRAFT — REQUIRES ADMINISTRATOR REVIEW & APPROVAL BEFORE PUBLICATION]\nNotice: This document is a substantive initial draft prepared for administrator review on UniNest. It must not be treated as legally approved or as a guarantee of legal compliance until reviewed, adapted, and formally published by an authorised UniNest administrator (with qualified Kenyan legal counsel where appropriate).\n\n',
    ''
  );
  const saveDraftRes = await req('/api/admin/policies/host_terms/draft', {
    method: 'PUT',
    cookie: adminCookie,
    body: JSON.stringify({
      title: 'UniNest Kenya Host Terms & Conditions',
      version: '1.0-rc1',
      content: editedTermsContent,
      changeNotes: 'Admin legal review edits applied',
    }),
  });
  assert.equal(saveDraftRes.status, 200);

  const pubTermsRes = await req('/api/admin/policies/host_terms/publish', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      title: 'UniNest Kenya Host Terms & Conditions',
      version: '1.0',
      content: editedTermsContent,
      changeNotes: 'Initial approved publication',
    }),
  });
  assert.equal(pubTermsRes.status, 200);

  // With only 1 of 2 published, registration must STILL remain blocked!
  const partialDocs = await req('/api/auth/legal-documents');
  assert.equal(partialDocs.body.ready, false);
  assert.equal(partialDocs.body.hostTermsVersion, '1.0');
  assert.equal(partialDocs.body.communityStandardsVersion, null);

  const editedStandardsContent = standardsBundle.draft.content.replace(
    '[INITIAL DRAFT — REQUIRES ADMINISTRATOR REVIEW & APPROVAL BEFORE PUBLICATION]\nNotice: This document is a substantive initial draft prepared for administrator review on UniNest. It must be reviewed, adapted, and formally published by an authorised UniNest administrator before taking effect.\n\n',
    ''
  );
  const pubStandardsRes = await req('/api/admin/policies/community_standards/publish', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      title: 'UniNest Kenya Community Standards',
      version: '1.0',
      content: editedStandardsContent,
      changeNotes: 'Initial approved publication',
    }),
  });
  assert.equal(pubStandardsRes.status, 200);

  const liveDocs = await req('/api/auth/legal-documents');
  assert.equal(liveDocs.body.ready, true);
  assert.equal(liveDocs.body.hostTermsVersion, '1.0');
  assert.equal(liveDocs.body.communityStandardsVersion, '1.0');
  assert.ok(liveDocs.body.hostTermsPublishedAt);
  console.log('PASS 3: Admin edits & publishes both policies; public endpoint exposes published v1.0 documents.');

  // 4. Reject host applications missing either checkbox, or with tampered/wrong version numbers.
  const missingCheckbox = await req('/api/auth/host-applications', {
    method: 'POST',
    body: JSON.stringify({
      requestedRole: 'owner',
      fullName: 'Owner Missing Check',
      email: 'owner.missing@uninest.ke',
      phone: '+254712111222',
      password: 'Password123!',
      operatingTowns: 'Juja',
      nationalIdReference: '9911',
      acceptHostTerms: true,
      acceptCommunityStandards: false,
      acceptedHostTermsVersion: '1.0',
      acceptedCommunityStandardsVersion: '1.0',
    }),
  });
  assert.equal(missingCheckbox.status, 400);

  const tamperedVersion = await req('/api/auth/host-applications', {
    method: 'POST',
    body: JSON.stringify({
      requestedRole: 'owner',
      fullName: 'Owner Tampered Ver',
      email: 'owner.tamper@uninest.ke',
      phone: '+254712111223',
      password: 'Password123!',
      operatingTowns: 'Juja',
      nationalIdReference: '9912',
      acceptHostTerms: true,
      acceptCommunityStandards: true,
      acceptedHostTermsVersion: '0.1-spoofed',
      acceptedCommunityStandardsVersion: '1.0',
    }),
  });
  assert.equal(tamperedVersion.status, 409);
  console.log('PASS 4: Server rejects missing checkbox acceptance and spoofed/stale version numbers.');

  // 5. Submit Property Owner application successfully with v1.0
  const ownerAppRes = await req('/api/auth/host-applications', {
    method: 'POST',
    body: JSON.stringify({
      requestedRole: 'owner',
      fullName: 'Grace Muthoni',
      email: 'grace.owner@uninest.ke',
      phone: '+254722333444',
      password: 'Password123!',
      businessOrPropertyName: 'Muthoni Student Court',
      operatingTowns: 'Juja, Ruiru',
      nationalIdReference: '7741',
      verificationNotes: 'Owner of Muthoni Court',
      acceptHostTerms: true,
      acceptCommunityStandards: true,
      acceptedHostTermsVersion: '1.0',
      acceptedCommunityStandardsVersion: '1.0',
      optInSms: false,
      optInWhatsapp: false,
    }),
  });
  assert.equal(ownerAppRes.status, 201);
  const ownerAppId = ownerAppRes.body.applicationId;

  // 6. Existing student submits Resident Caretaker application preserving account ID
  const caretakerAppRes = await req('/api/auth/host-applications', {
    method: 'POST',
    cookie: studentLogin.cookie,
    body: JSON.stringify({
      requestedRole: 'caretaker',
      fullName: 'Amina Wanjiku',
      phone: '+254712345678',
      businessOrPropertyName: 'Acacia Heights',
      operatingTowns: 'Juja',
      nationalIdReference: '5519',
      verificationNotes: 'Assigned caretaker candidate',
      acceptHostTerms: true,
      acceptCommunityStandards: true,
      acceptedHostTermsVersion: '1.0',
      acceptedCommunityStandardsVersion: '1.0',
    }),
  });
  assert.equal(caretakerAppRes.status, 201);
  const caretakerAppId = caretakerAppRes.body.applicationId;

  const acceptancesBefore = db
    .prepare(
      'SELECT application_id, document_type, document_version, accepted_at FROM host_terms_acceptances WHERE application_id IN (?, ?) ORDER BY accepted_at ASC'
    )
    .all(ownerAppId, caretakerAppId) as Array<{
    application_id: string;
    document_type: string;
    document_version: string;
    accepted_at: string;
  }>;
  assert.equal(acceptancesBefore.length, 4);
  assert.ok(acceptancesBefore.every((a) => a.document_version === '1.0' && Boolean(a.accepted_at)));
  console.log('PASS 5 & 6: Both Owner and Caretaker applications succeed and record v1.0 + timestamps.');

  // 7. Reusing published v1.0 must fail immutability check; publishing v1.1 archives v1.0 & preserves old acceptances.
  const duplicatePub = await req('/api/admin/policies/host_terms/publish', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      title: 'UniNest Kenya Host Terms & Conditions',
      version: '1.0',
      content: `${editedTermsContent}\n\n11. EXTRA CLAUSE`,
    }),
  });
  assert.equal(duplicatePub.status, 400);

  const pubV11 = await req('/api/admin/policies/host_terms/publish', {
    method: 'POST',
    cookie: adminCookie,
    body: JSON.stringify({
      title: 'UniNest Kenya Host Terms & Conditions',
      version: '1.1',
      content: `${editedTermsContent}\n\n11. UPDATED AMENDMENT\nClarified KSh deposit refund timeline.`,
      changeNotes: 'Clarified deposit refund timeline',
    }),
  });
  assert.equal(pubV11.status, 200);

  // Check history preserves v1.0 as archived and v1.1 as published
  const updatedAdminPolicies = await req('/api/admin/policies', { cookie: adminCookie });
  const updatedTermsBundle = updatedAdminPolicies.body.policies.find(
    (p: any) => p.documentType === 'host_terms'
  );
  assert.equal(updatedTermsBundle.published.version, '1.1');
  const archivedV10 = updatedTermsBundle.history.find((h: any) => h.version === '1.0');
  assert.equal(archivedV10.status, 'archived');

  // Verify old application acceptance records STILL reference v1.0 (not overwritten!)
  const acceptancesAfter = db
    .prepare(
      'SELECT application_id, document_type, document_version FROM host_terms_acceptances WHERE application_id IN (?, ?)'
    )
    .all(ownerAppId, caretakerAppId) as Array<{
    application_id: string;
    document_type: string;
    document_version: string;
  }>;
  assert.equal(acceptancesAfter.length, 4);
  assert.ok(acceptancesAfter.every((a) => a.document_version === '1.0'));

  // Stale form trying to submit with v1.0 after v1.1 was published must be rejected (409)!
  const staleSubmit = await req('/api/auth/host-applications', {
    method: 'POST',
    body: JSON.stringify({
      requestedRole: 'caretaker',
      fullName: 'Stale Caretaker',
      email: 'stale.caretaker@uninest.ke',
      phone: '+254733111999',
      password: 'Password123!',
      operatingTowns: 'Ruiru',
      nationalIdReference: '8820',
      acceptHostTerms: true,
      acceptCommunityStandards: true,
      acceptedHostTermsVersion: '1.0',
      acceptedCommunityStandardsVersion: '1.0',
    }),
  });
  assert.equal(staleSubmit.status, 409);

  // Fresh submit with v1.1 + v1.0 succeeds and records v1.1
  const freshCaretaker = await req('/api/auth/host-applications', {
    method: 'POST',
    body: JSON.stringify({
      requestedRole: 'caretaker',
      fullName: 'Samuel Kiprop',
      email: 'samuel.caretaker@uninest.ke',
      phone: '+254733111999',
      password: 'Password123!',
      operatingTowns: 'Ruiru',
      nationalIdReference: '8820',
      acceptHostTerms: true,
      acceptCommunityStandards: true,
      acceptedHostTermsVersion: '1.1',
      acceptedCommunityStandardsVersion: '1.0',
    }),
  });
  assert.equal(freshCaretaker.status, 201);
  const newAcc = db
    .prepare(
      "SELECT document_version FROM host_terms_acceptances WHERE application_id = ? AND document_type = 'host_terms'"
    )
    .get(freshCaretaker.body.applicationId) as { document_version: string };
  assert.equal(newAcc.document_version, '1.1');
  console.log('PASS 7: Policy update archives v1.0, preserves historical acceptances, rejects stale v1.0, records v1.1.');

  // 8. Admin host-applications view returns recorded policy acceptances
  const appsList = await req('/api/admin/host-applications', { cookie: adminCookie });
  assert.equal(appsList.status, 200);
  const graceApp = appsList.body.applications.find((a: any) => a.id === ownerAppId);
  assert.equal(graceApp.acceptances.length, 2);
  console.log('PASS 8: Admin host-applications listing exposes recorded policy acceptance versions & timestamps.');
} finally {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
