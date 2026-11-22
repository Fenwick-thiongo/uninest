import { db, newId } from './db.ts';
import { writeAuditLog } from './auth.ts';

export type PolicyDocumentType = 'host_terms' | 'community_standards';
export type PolicyStatus = 'draft' | 'published' | 'archived';

export interface PolicyDocumentRow {
  id: string;
  document_type: PolicyDocumentType;
  title: string;
  version: string;
  content: string;
  status: PolicyStatus;
  is_initial_draft: number;
  change_notes: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  published_by: string | null;
  published_by_name?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const INITIAL_HOST_TERMS_TITLE = 'UniNest Kenya Host Terms & Conditions (Draft for Admin Review)';
export const INITIAL_COMMUNITY_STANDARDS_TITLE = 'UniNest Kenya Community Standards (Draft for Admin Review)';

export const INITIAL_HOST_TERMS_DRAFT = `[INITIAL DRAFT — REQUIRES ADMINISTRATOR REVIEW & APPROVAL BEFORE PUBLICATION]
Notice: This document is a substantive initial draft prepared for administrator review on UniNest. It must not be treated as legally approved or as a guarantee of legal compliance until reviewed, adapted, and formally published by an authorised UniNest administrator (with qualified Kenyan legal counsel where appropriate).

1. PURPOSE & SCOPE
These Host Terms & Conditions ("Host Terms") govern Property Owners and Resident Caretakers ("Hosts") who apply for host access, list student accommodation, and communicate with students through UniNest across Kenya (including Juja, Ruiru, Kahawa, Thika, Kilimani, Westlands, Karen, Nyali, and other university towns).

2. RESPONSIBILITIES OF PROPERTY OWNERS & RESIDENT CARETAKERS
2.1 Property Owners are legally and operationally responsible for the accuracy of their property listings, ownership or lawful management authority, rental pricing, tenancy terms, safety standards, and any caretakers they assign.
2.2 Resident Caretakers may only manage properties for which an Owner or Administrator has granted an active, explicit property assignment on UniNest. Caretakers must not represent unassigned buildings or alter ownership, rent, or tenancy terms without the Owner's written authorisation.
2.3 Both Owners and Caretakers must maintain up-to-date contact availability for confirmed viewings and urgent resident safety matters.

3. ACCOUNT REGISTRATION & VERIFICATION
3.1 Applicants must provide accurate full legal names, active Kenyan telephone numbers (+254 / 07xx / 01xx), operating towns/estates, National ID or business registration references, and truthful verification notes.
3.2 Existing UniNest student accounts applying for host access retain their original account ID and student history; creating duplicate accounts to bypass verification or moderation is strictly prohibited.
3.3 Submitting a host application does not grant host permissions. Host features remain unavailable until an authorised UniNest Administrator reviews and approves the application.

4. PROPERTY LISTING ACCURACY & VERIFICATION REQUIREMENTS
4.1 Every property submitted to UniNest undergoes administrative review before appearing publicly as verified/approved.
4.2 Photographs must accurately show the actual residence, room type (Bedsitter, Single Room, Studio, Shared Room, Hostel, 1-Bedroom or 2-Bedroom Apartment), and shared amenities (such as Wi-Fi, borehole water, KPLC prepaid token meters, CCTV/gate security, or study desks).
4.3 Distance claims to institutions (e.g., JKUAT, Kenyatta University, University of Nairobi, Strathmore, Daystar, Zetech, TUM) must be honest and verifiable. Hosts must never publish misleading or AI-fabricated property photos.

5. AVAILABILITY, PRICING & ACCOMMODATION DESCRIPTIONS
5.1 Monthly rent and security deposit figures must be stated clearly in Kenyan Shillings (KSh). Any recurring service charges (water, Wi-Fi, garbage collection, electricity token arrangements) must be disclosed upfront in the listing description.
5.2 Hosts must promptly mark units as limited, full, or unavailable once occupied so students do not travel for unavailable rooms.
5.3 Charging non-refundable "viewing fees" to inspect an advertised unit, or demanding advance M-Pesa/cash booking deposits prior to an opportunity for physical inspection and clear lease terms, is prohibited.

6. HANDLING STUDENT ENQUIRIES & VIEWING REQUESTS
6.1 Hosts must respond honestly, respectfully, and within a reasonable timeframe to student accommodation enquiries and viewing requests.
6.2 Confirmed viewings must take place at safe, agreed daytime hours with the verified Property Owner or explicitly assigned Resident Caretaker present at the property.
6.3 Hosts must never pressure students into rushed payments or redirect them to unverified third parties.

7. ACCEPTABLE CONDUCT, PROHIBITED ACTIVITIES & PLATFORM MISUSE
7.1 Hosts must not list uninhabitable, unsafe, or non-existent rooms, engage in bait-and-switch pricing, impersonate UniNest staff or another caretaker, scrape student data, or spam students with unsolicited promotions.
7.2 Circumventing moderation decisions, creating shadow accounts after suspension, or submitting forged identification/ownership documents constitutes serious platform misuse.

8. ACCOUNT SUSPENSION, TERMINATION & APPEALS
8.1 UniNest may reject, suspend, or remove listings or host accounts where verification fails, false information is supplied, repeated student complaints or scam reports are substantiated, or these Host Terms or Community Standards are violated.
8.2 Where an account or listing is suspended, an audit record is maintained and the Host may submit a written appeal with supporting documentation to the UniNest Administration team via the official support email listed in Platform Settings.

9. PRIVACY & HANDLING OF STUDENT INFORMATION
9.1 Student names, phone numbers, university details, enquiries, viewing requests, and messages accessed via UniNest must be used solely to coordinate legitimate accommodation enquiries and property viewings.
9.2 Hosts must handle student personal data responsibly and in alignment with Kenyan data protection principles (Kenya Data Protection Act, 2019), must not publish student details publicly, and must not sell or share student contact information with third parties.
9.3 Optional SMS or WhatsApp alerts are governed by separate, explicit, reversible user opt-ins.

10. LIMITATIONS & DISCLAIMERS
10.1 UniNest is a student accommodation discovery and communication platform. Unless explicitly stated otherwise in writing, UniNest is not a landlord, real estate broker, escrow holder, or party to tenancy agreements entered into between students and property owners.
10.2 Draft Disclaimer: This initial draft has not been reviewed by external legal counsel and requires formal administrator review and publication before coming into effect.`;

export const INITIAL_COMMUNITY_STANDARDS_DRAFT = `[INITIAL DRAFT — REQUIRES ADMINISTRATOR REVIEW & APPROVAL BEFORE PUBLICATION]
Notice: This document is a substantive initial draft prepared for administrator review on UniNest. It must be reviewed, adapted, and formally published by an authorised UniNest administrator before taking effect.

1. PURPOSE & COMMUNITY VALUES
UniNest brings together university and college students, property owners, and resident caretakers across Kenya to make student housing search safer, clearer, and more supportive. Everyone using Discover, Community discussions, property enquiries, and direct messaging agrees to uphold these Community Standards.

2. RESPECTFUL COMMUNICATION
2.1 Treat students, property owners, resident caretakers, and platform moderators with courtesy and respect, even when resolving viewing reschedules, house rules, or rental disagreements.
2.2 Keep enquiries, replies, and forum discussions constructive, relevant to student living, and mindful of shared study environments.

3. ZERO TOLERANCE FOR HARASSMENT, DISCRIMINATION, THREATS & SCAMS
3.1 Harassment, intimidation, verbal abuse, sexual harassment, stalking, or threats of violence against any student, host, or staff member are strictly prohibited.
3.2 Discrimination based on ethnicity, tribe, nationality, religion, gender, disability, age, or socioeconomic background in listings, viewing decisions, or community spaces is not tolerated.
3.3 Fraud, advance-fee booking scams, fake caretaker impersonation, false M-Pesa payment requests, phishing links, and knowingly misleading rent, utility, or availability claims will result in immediate enforcement action.

4. RULES FOR DISCUSSIONS, COMMENTS & COMMUNITY PARTICIPATION
4.1 Post threads in the appropriate Community category (Accommodation Advice, Campus Life, Roommates, Moving and Settling In, Safety and Security, or General Discussions) and link Discover tours only to genuine residences.
4.2 Roommate and estate advice posts must be truthful and respectful of neighbours' privacy. Do not share another person's private phone number, ID number, exact unit number, or personal photographs without their explicit consent.
4.3 Unsolicited advertising, pyramid schemes, off-topic commercial spam, or repetitive duplicate posting across threads is prohibited.

5. PROHIBITED CONTENT
Users must not upload or share:
- Explicit, sexually suggestive, or violent imagery or video;
- Defamatory accusations, hate speech, or incitement;
- Doxxing or exposure of confidential identity documents, KRA PINs, or private financial details;
- Malware, misleading external redirects, or counterfeit payment instructions.

6. REPORTING, MODERATION & ENFORCEMENT PROCEDURES
6.1 Any user may report suspicious property listings, Discover posts, Community discussions, or abusive accounts using the built-in Report tools.
6.2 Authorised UniNest Administrators review reports, inspect context, and record all moderation decisions in the platform audit log.
6.3 Depending on severity and history, violations may result in: (a) formal warning, (b) hiding or removal of posts/comments, (c) listing rejection or suspension, or (d) temporary or permanent account suspension and loss of host privileges.
6.4 Users who believe a moderation action was taken in error may contact UniNest Administration via the official platform support email for review.`;

function formatPolicyRow(row: PolicyDocumentRow) {
  return {
    id: row.id,
    document_type: row.document_type,
    title: row.title,
    version: row.version,
    content: row.content,
    status: row.status,
    is_initial_draft: Boolean(row.is_initial_draft),
    change_notes: row.change_notes,
    created_by: row.created_by,
    created_by_name: row.created_by_name ?? null,
    published_by: row.published_by,
    published_by_name: row.published_by_name ?? null,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Idempotently seeds unpublished initial drafts for Host Terms & Community Standards
 * if no policy_document_versions rows exist yet for those document types.
 * Never overwrites existing records and never auto-publishes drafts.
 */
export function ensureInitialPolicyDrafts(): void {
  const adminRow = db
    .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string } | undefined;
  const createdBy = adminRow?.id ?? null;

  const checkExisting = db.prepare(
    'SELECT COUNT(*) as cnt FROM policy_document_versions WHERE document_type = ?'
  );
  const insertDraft = db.prepare(
    `INSERT INTO policy_document_versions (
      id, document_type, title, version, content, status, is_initial_draft, change_notes, created_by
    ) VALUES (?, ?, ?, ?, ?, 'draft', 1, ?, ?)`
  );

  const hasHostTerms = (checkExisting.get('host_terms') as { cnt: number }).cnt > 0;
  if (!hasHostTerms) {
    insertDraft.run(
      newId(),
      'host_terms',
      INITIAL_HOST_TERMS_TITLE,
      '1.0-draft',
      INITIAL_HOST_TERMS_DRAFT,
      'Initial system draft generated for administrator review and legal verification.',
      createdBy
    );
  }

  const hasCommunityStandards = (checkExisting.get('community_standards') as { cnt: number }).cnt > 0;
  if (!hasCommunityStandards) {
    insertDraft.run(
      newId(),
      'community_standards',
      INITIAL_COMMUNITY_STANDARDS_TITLE,
      '1.0-draft',
      INITIAL_COMMUNITY_STANDARDS_DRAFT,
      'Initial system draft generated for administrator review and approval.',
      createdBy
    );
  }
}

export function getPublishedPolicy(documentType: PolicyDocumentType) {
  const row = db
    .prepare(
      `SELECT p.*, cp.full_name as created_by_name, pp.full_name as published_by_name
       FROM policy_document_versions p
       LEFT JOIN profiles cp ON cp.user_id = p.created_by
       LEFT JOIN profiles pp ON pp.user_id = p.published_by
       WHERE p.document_type = ? AND p.status = 'published'
       LIMIT 1`
    )
    .get(documentType) as unknown as PolicyDocumentRow | undefined;
  return row ? formatPolicyRow(row) : null;
}

export function getPublicLegalDocuments() {
  const hostTerms = getPublishedPolicy('host_terms');
  const communityStandards = getPublishedPolicy('community_standards');

  const missing: string[] = [];
  if (!hostTerms) missing.push('Host Terms & Conditions (not yet published)');
  if (!communityStandards) missing.push('Community Standards (not yet published)');

  return {
    ready: missing.length === 0,
    missing,
    hostTermsVersion: hostTerms?.version ?? null,
    hostTermsTitle: hostTerms?.title ?? null,
    hostTermsContent: hostTerms?.content ?? null,
    hostTermsPublishedAt: hostTerms?.published_at ?? null,
    communityStandardsVersion: communityStandards?.version ?? null,
    communityStandardsTitle: communityStandards?.title ?? null,
    communityStandardsContent: communityStandards?.content ?? null,
    communityStandardsPublishedAt: communityStandards?.published_at ?? null,
  };
}

export function getAdminPoliciesOverview() {
  const types: Array<{ type: PolicyDocumentType; label: string }> = [
    { type: 'host_terms', label: 'Host Terms & Conditions' },
    { type: 'community_standards', label: 'Community Standards' },
  ];

  const bundles = types.map(({ type, label }) => {
    const rows = db
      .prepare(
        `SELECT p.*, cp.full_name as created_by_name, pp.full_name as published_by_name
         FROM policy_document_versions p
         LEFT JOIN profiles cp ON cp.user_id = p.created_by
         LEFT JOIN profiles pp ON pp.user_id = p.published_by
         WHERE p.document_type = ?
         ORDER BY
           CASE p.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
           p.updated_at DESC,
           p.created_at DESC`
      )
      .all(type) as unknown as PolicyDocumentRow[];

    const formatted = rows.map(formatPolicyRow);
    const published = formatted.find((r) => r.status === 'published') ?? null;
    const draft = formatted.find((r) => r.status === 'draft') ?? null;

    return {
      documentType: type,
      label,
      published,
      draft,
      history: formatted,
    };
  });

  return bundles;
}

export function savePolicyDraft(
  documentType: PolicyDocumentType,
  input: { title: string; version: string; content: string; changeNotes?: string | null },
  adminUserId: string
) {
  const title = input.title?.trim();
  const version = input.version?.trim();
  const content = input.content?.trim();
  const changeNotes = input.changeNotes?.trim() || null;

  if (!title || title.length < 3) {
    throw new Error('Policy document title is required (at least 3 characters).');
  }
  if (!version || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(version)) {
    throw new Error('Version must be 1–32 characters using letters, numbers, dots, underscores, or hyphens (e.g. 1.0 or 2026.1-draft).');
  }
  if (!content || content.length < 100) {
    throw new Error('Policy document content must be substantive (at least 100 characters).');
  }

  // Ensure version does not collide with any already-published or archived immutable version
  const conflictingImmutable = db
    .prepare(
      `SELECT id FROM policy_document_versions
       WHERE document_type = ? AND version = ? AND status IN ('published', 'archived')`
    )
    .get(documentType, version);
  if (conflictingImmutable) {
    throw new Error(
      `Version "${version}" has already been published or archived and is immutable. Use a new version identifier for your draft.`
    );
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const existingDraft = db
      .prepare("SELECT id FROM policy_document_versions WHERE document_type = ? AND status = 'draft' LIMIT 1")
      .get(documentType) as { id: string } | undefined;

    let draftId: string;
    if (existingDraft) {
      draftId = existingDraft.id;
      db.prepare(
        `UPDATE policy_document_versions
         SET title = ?, version = ?, content = ?, change_notes = ?, is_initial_draft = 0,
             created_by = ?, updated_at = datetime('now')
         WHERE id = ? AND status = 'draft'`
      ).run(title, version, content, changeNotes, adminUserId, draftId);
    } else {
      draftId = newId();
      db.prepare(
        `INSERT INTO policy_document_versions (
          id, document_type, title, version, content, status, is_initial_draft, change_notes, created_by
        ) VALUES (?, ?, ?, ?, ?, 'draft', 0, ?, ?)`
      ).run(draftId, documentType, title, version, content, changeNotes, adminUserId);
    }

    writeAuditLog(adminUserId, 'policy_draft_saved', 'policy_document_version', draftId, {
      documentType,
      version,
      title,
    });
    db.exec('COMMIT');

    const saved = db.prepare('SELECT * FROM policy_document_versions WHERE id = ?').get(draftId) as unknown as PolicyDocumentRow;
    return formatPolicyRow(saved);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function publishPolicyVersion(
  documentType: PolicyDocumentType,
  input: { title: string; version: string; content: string; changeNotes?: string | null },
  adminUserId: string
) {
  const title = input.title?.trim();
  const version = input.version?.trim();
  const content = input.content?.trim();
  const changeNotes = input.changeNotes?.trim() || null;

  if (!title || title.length < 3) {
    throw new Error('Policy document title is required before publishing.');
  }
  if (!version || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(version)) {
    throw new Error('Published version must be 1–32 characters (e.g. 1.0 or 2026.1).');
  }
  if (/draft/i.test(version)) {
    throw new Error('Please assign an approved release version identifier (e.g. 1.0 or 2026.1) without "draft" before publishing.');
  }
  if (!content || content.length < 100) {
    throw new Error('Policy document content must be substantive (at least 100 characters) before publishing.');
  }

  // Immutable check: cannot overwrite or reuse an already-published or archived version number
  const existingImmutable = db
    .prepare(
      `SELECT id FROM policy_document_versions
       WHERE document_type = ? AND version = ? AND status IN ('published', 'archived')`
    )
    .get(documentType, version);
  if (existingImmutable) {
    throw new Error(
      `Version "${version}" already exists in the immutable publication history. Increment the version number (e.g. 1.1 or 2026.2) to publish an update.`
    );
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const currentPublished = db
      .prepare("SELECT id, version FROM policy_document_versions WHERE document_type = ? AND status = 'published' LIMIT 1")
      .get(documentType) as { id: string; version: string } | undefined;

    if (currentPublished) {
      db.prepare(
        "UPDATE policy_document_versions SET status = 'archived', updated_at = datetime('now') WHERE id = ?"
      ).run(currentPublished.id);
    }

    const existingDraft = db
      .prepare("SELECT id FROM policy_document_versions WHERE document_type = ? AND status = 'draft' LIMIT 1")
      .get(documentType) as { id: string } | undefined;

    let publishedId: string;
    if (existingDraft) {
      publishedId = existingDraft.id;
      db.prepare(
        `UPDATE policy_document_versions
         SET title = ?, version = ?, content = ?, status = 'published', is_initial_draft = 0,
             change_notes = ?, published_by = ?, published_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      ).run(title, version, content, changeNotes, adminUserId, publishedId);
    } else {
      publishedId = newId();
      db.prepare(
        `INSERT INTO policy_document_versions (
          id, document_type, title, version, content, status, is_initial_draft, change_notes,
          created_by, published_by, published_at
        ) VALUES (?, ?, ?, ?, ?, 'published', 0, ?, ?, ?, datetime('now'))`
      ).run(publishedId, documentType, title, version, content, changeNotes, adminUserId, adminUserId);
    }

    // Keep platform_settings keys synced with the active published version for backward compatibility
    const versionKey = documentType === 'host_terms' ? 'host_terms_version' : 'community_standards_version';
    const contentKey = documentType === 'host_terms' ? 'host_terms_content' : 'community_standards_content';
    const upsertSetting = db.prepare(
      `INSERT INTO platform_settings (key, value, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
    );
    upsertSetting.run(versionKey, version, adminUserId);
    upsertSetting.run(contentKey, content, adminUserId);

    writeAuditLog(adminUserId, 'policy_published', 'policy_document_version', publishedId, {
      documentType,
      version,
      title,
      previousVersion: currentPublished?.version ?? null,
    });

    db.exec('COMMIT');

    const publishedRow = db
      .prepare('SELECT * FROM policy_document_versions WHERE id = ?')
      .get(publishedId) as unknown as PolicyDocumentRow;
    return formatPolicyRow(publishedRow);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
