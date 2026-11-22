import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { ensureInitialPolicyDrafts } from './policies.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_PATH = process.env.UNINEST_DB_PATH
  ? path.resolve(process.env.UNINEST_DB_PATH)
  : path.join(DATA_DIR, 'uninest.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'owner', 'caretaker', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT,
      preferred_town TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      institution TEXT NOT NULL,
      campus TEXT,
      course TEXT,
      year_of_study TEXT,
      preferred_budget_min INTEGER,
      preferred_budget_max INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS host_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      host_type TEXT NOT NULL CHECK (host_type IN ('owner', 'caretaker')),
      business_or_property_name TEXT,
      national_id_last4 TEXT,
      kra_pin_provided INTEGER NOT NULL DEFAULT 0,
      operating_towns TEXT,
      verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS host_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requested_role TEXT NOT NULL CHECK (requested_role IN ('owner', 'caretaker')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      business_or_property_name TEXT,
      operating_towns TEXT NOT NULL,
      national_id_reference TEXT NOT NULL,
      verification_notes TEXT NOT NULL,
      reviewer_id TEXT REFERENCES users(id),
      review_notes TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS host_terms_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id TEXT REFERENCES host_applications(id) ON DELETE SET NULL,
      document_type TEXT NOT NULL CHECK (document_type IN ('host_terms', 'community_standards')),
      document_version TEXT NOT NULL,
      accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS notification_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email_marketing')),
      opted_in INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, channel)
    );

    CREATE TABLE IF NOT EXISTS notification_consent_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email_marketing')),
      action TEXT NOT NULL CHECK (action IN ('opt_in', 'withdraw')),
      source TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      property_type TEXT NOT NULL CHECK (property_type IN (
        'Bedsitter', 'Single Room', 'Studio', 'Shared Room',
        'Hostel', '1-Bedroom Apartment', '2-Bedroom Apartment', 'Other'
      )),
      room_type TEXT NOT NULL DEFAULT 'Private Self-Contained',
      town TEXT NOT NULL,
      estate TEXT NOT NULL,
      address_landmark TEXT,
      nearby_institution TEXT,
      distance_to_institution TEXT,
      monthly_rent_kes INTEGER NOT NULL CHECK (monthly_rent_kes > 0),
      deposit_kes INTEGER NOT NULL DEFAULT 0,
      units_available INTEGER NOT NULL DEFAULT 1,
      availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'full')),
      listing_status TEXT NOT NULL DEFAULT 'draft' CHECK (listing_status IN ('draft', 'pending_review', 'approved', 'rejected', 'suspended', 'unavailable')),
      is_demo INTEGER NOT NULL DEFAULT 0,
      latitude REAL,
      longitude REAL,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS property_images (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      caption TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS amenities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS property_amenities (
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      amenity_id TEXT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
      PRIMARY KEY (property_id, amenity_id)
    );

    CREATE TABLE IF NOT EXISTS property_caretakers (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      caretaker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
      can_edit_details INTEGER NOT NULL DEFAULT 1,
      can_upload_images INTEGER NOT NULL DEFAULT 1,
      can_manage_enquiries INTEGER NOT NULL DEFAULT 1,
      can_manage_viewings INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_caretaker
      ON property_caretakers(property_id, caretaker_id)
      WHERE status = 'active';

    CREATE TABLE IF NOT EXISTS property_verification_records (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      reviewer_id TEXT NOT NULL REFERENCES users(id),
      decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'suspended', 'reinstated')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_properties (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, property_id)
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      move_in_month TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'responded', 'closed')),
      host_reply TEXT,
      responded_by TEXT REFERENCES users(id),
      responded_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS viewing_requests (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requested_date TEXT NOT NULL,
      requested_time TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'rescheduled', 'completed', 'cancelled')),
      proposed_date TEXT,
      proposed_time TEXT,
      host_notes TEXT,
      handled_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(property_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
      subject TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TEXT,
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS discover_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
      caption TEXT NOT NULL,
      location_tag TEXT,
      media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
      media_url TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'flagged', 'hidden')),
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS discover_likes (
      post_id TEXT NOT NULL REFERENCES discover_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS discover_saves (
      post_id TEXT NOT NULL REFERENCES discover_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS discover_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES discover_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_categories (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES community_categories(id) ON DELETE RESTRICT,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'flagged', 'hidden')),
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_likes (
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL CHECK (target_type IN ('property', 'discover_post', 'community_post', 'user')),
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
      reviewed_by TEXT REFERENCES users(id),
      resolution_notes TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS moderation_actions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES users(id),
      report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_by TEXT REFERENCES users(id),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS policy_document_versions (
      id TEXT PRIMARY KEY,
      document_type TEXT NOT NULL CHECK (document_type IN ('host_terms', 'community_standards')),
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      is_initial_draft INTEGER NOT NULL DEFAULT 0,
      change_notes TEXT,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      published_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(document_type, version)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_published_policy_type
      ON policy_document_versions(document_type)
      WHERE status = 'published';
    CREATE INDEX IF NOT EXISTS idx_policy_doc_type_created
      ON policy_document_versions(document_type, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_properties_town ON properties(town);
    CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(listing_status);
    CREATE INDEX IF NOT EXISTS idx_properties_rent ON properties(monthly_rent_kes);
    CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
    CREATE INDEX IF NOT EXISTS idx_enquiries_property ON enquiries(property_id);
    CREATE INDEX IF NOT EXISTS idx_enquiries_student ON enquiries(student_id);
    CREATE INDEX IF NOT EXISTS idx_viewings_property ON viewing_requests(property_id);
    CREATE INDEX IF NOT EXISTS idx_viewings_student ON viewing_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  `);

  seedInitialData();
  ensureInitialPolicyDrafts();
}

function seedInitialData(): void {
  const existingUserCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
  if (existingUserCount > 0) return;

  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Seed Platform Settings (legal docs intentionally null until supplied!)
    const insertSetting = db.prepare('INSERT OR IGNORE INTO platform_settings (key, value) VALUES (?, ?)');
    insertSetting.run('host_terms_version', null);
    insertSetting.run('host_terms_content', null);
    insertSetting.run('community_standards_version', null);
    insertSetting.run('community_standards_content', null);
    insertSetting.run('sms_provider_configured', 'false');
    insertSetting.run('whatsapp_provider_configured', 'false');
    insertSetting.run('email_provider_configured', 'false');
    insertSetting.run('platform_support_email', 'support@uninest.co.ke');

    // 2. Seed Amenities
    const amenitiesList = [
      { id: 'am_wifi', name: 'High-Speed Wi-Fi', icon: 'Wifi' },
      { id: 'am_water', name: '24/7 Borehole Water', icon: 'Droplets' },
      { id: 'am_security', name: '24/7 Gate Security & CCTV', icon: 'ShieldCheck' },
      { id: 'am_token', name: 'Prepaid KPLC Token', icon: 'Zap' },
      { id: 'am_balcony', name: 'Private Balcony', icon: 'Sun' },
      { id: 'am_laundry', name: 'Laundry Area', icon: 'Shirt' },
      { id: 'am_study', name: 'Dedicated Study Desk', icon: 'BookOpen' },
      { id: 'am_parking', name: 'Secure Parking', icon: 'Car' },
      { id: 'am_furnished', name: 'Furnished Option', icon: 'BedDouble' },
    ];
    const insertAmenity = db.prepare('INSERT OR IGNORE INTO amenities (id, name, icon) VALUES (?, ?, ?)');
    for (const am of amenitiesList) {
      insertAmenity.run(am.id, am.name, am.icon);
    }

    // 3. Seed Community Categories
    const categories = [
      { id: 'cat_advice', slug: 'accommodation-advice', name: 'Accommodation Advice', description: 'Lease tips, deposit safety, and estate recommendations across Kenyan campus towns.', sort: 1 },
      { id: 'cat_campus', slug: 'campus-life', name: 'Campus Life', description: 'Commuting routes, study spots, and student life near JKUAT, KU, UoN, and more.', sort: 2 },
      { id: 'cat_roommates', slug: 'roommates', name: 'Roommates', description: 'Looking for compatible roommates or sharing 2-bedroom apartments.', sort: 3 },
      { id: 'cat_moving', slug: 'moving-settling-in', name: 'Moving and Settling In', description: 'Movers, internet setup, gas refills, and first-week checklists.', sort: 4 },
      { id: 'cat_safety', slug: 'safety-security', name: 'Safety and Security', description: 'Estate lighting, caretaker verification, and safe viewing habits.', sort: 5 },
      { id: 'cat_general', slug: 'general-discussions', name: 'General Discussions', description: 'Open student housing conversations and Q&A.', sort: 6 },
    ];
    const insertCat = db.prepare('INSERT OR IGNORE INTO community_categories (id, slug, name, description, sort_order) VALUES (?, ?, ?, ?, ?)');
    for (const c of categories) {
      insertCat.run(c.id, c.slug, c.name, c.description, c.sort);
    }

    // 4. Seed 4 Role Accounts for Complete Testing
    const studentId = 'usr_student_amina';
    const ownerId = 'usr_owner_kamau';
    const caretakerId = 'usr_caretaker_brian';
    const adminId = 'usr_admin_uninest';

    const insertUser = db.prepare(
      'INSERT INTO users (id, email, password_hash, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertUser.run(studentId, 'amina.student@uninest.ke', hashPassword('UniNest2026!'), 'student', 'active', 1);
    insertUser.run(ownerId, 'kamau.owner@uninest.ke', hashPassword('UniNest2026!'), 'owner', 'active', 1);
    insertUser.run(caretakerId, 'brian.caretaker@uninest.ke', hashPassword('UniNest2026!'), 'caretaker', 'active', 1);
    insertUser.run(adminId, 'admin@uninest.ke', hashPassword('UniNestAdmin2026!'), 'admin', 'active', 1);

    const insertProfile = db.prepare(
      'INSERT INTO profiles (user_id, full_name, phone, bio, preferred_town) VALUES (?, ?, ?, ?, ?)'
    );
    insertProfile.run(studentId, 'Amina Wanjiku', '+254 712 345 678', 'BSc Computer Science student at JKUAT looking for quiet study-friendly flats in Juja.', 'Juja');
    insertProfile.run(ownerId, 'Peter Kamau', '+254 722 890 112', 'Student residence proprietor managing modern units along Thika Road and Nairobi.', 'Juja');
    insertProfile.run(caretakerId, 'Brian Otieno', '+254 733 456 901', 'On-site resident caretaker overseeing security, water supply, and tenant viewings.', 'Juja');
    insertProfile.run(adminId, 'UniNest Trust & Safety', '+254 700 100 200', 'Platform administration and listing verification team.', 'Nairobi');

    db.prepare(
      'INSERT INTO student_profiles (user_id, institution, campus, course, year_of_study, preferred_budget_min, preferred_budget_max) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(studentId, 'JKUAT', 'Main Campus Juja', 'BSc Computer Science', 'Year 2', 7500, 14000);

    db.prepare(
      'INSERT INTO host_profiles (user_id, host_type, business_or_property_name, national_id_last4, kra_pin_provided, operating_towns, verification_status, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    ).run(ownerId, 'owner', 'Kamau Student Residences (Sample)', '4821', 1, 'Juja, Kilimani, Kahawa', 'verified');

    db.prepare(
      'INSERT INTO host_profiles (user_id, host_type, business_or_property_name, national_id_last4, kra_pin_provided, operating_towns, verification_status, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    ).run(caretakerId, 'caretaker', 'Acacia Heights Resident Caretaker (Sample)', '9104', 0, 'Juja', 'verified');

    // 5. Seed Sample Demonstration Properties (Clearly flagged is_demo = 1)
    const demoProperties = [
      {
        id: 'prop_acacia_heights',
        ownerId,
        title: 'Acacia Heights Bedsitter',
        slug: 'acacia-heights-bedsitter-juja',
        description: 'Bright, newly tiled student bedsitter located 6 minutes from JKUAT Main Gate in High Point, Juja. Features reliable borehole water, prepaid KPLC token meter, built-in kitchenette cabinetry, and a dedicated study corner.',
        propertyType: 'Bedsitter',
        roomType: 'Private Self-Contained',
        town: 'Juja',
        estate: 'High Point',
        landmark: '400m from JKUAT Gate C',
        institution: 'JKUAT Main Campus',
        distance: '6 min walk',
        rent: 9500,
        deposit: 9500,
        units: 4,
        image: '/src/assets/images/prop_acacia_bedsitter_1794829250879.jpg',
        amenities: ['am_wifi', 'am_water', 'am_security', 'am_token', 'am_study'],
      },
      {
        id: 'prop_kilimani_studio',
        ownerId,
        title: 'Kilimani Executive Studio',
        slug: 'kilimani-executive-studio-nairobi',
        description: 'Quiet, sunlit executive studio off Ngong Road in Kilimani, ideal for Daystar, Strathmore, or UoN postgraduate students. Includes warm oak kitchen cabinetry, private balcony overlooking greenery, and backup power.',
        propertyType: 'Studio',
        roomType: 'Private Studio Apartment',
        town: 'Kilimani',
        estate: 'Argwings Kodhek Rd',
        landmark: 'Near Yaya Centre',
        institution: 'University of Nairobi / Daystar Valley Rd',
        distance: '12 min commute',
        rent: 22000,
        deposit: 22000,
        units: 2,
        image: '/src/assets/images/prop_kilimani_studio_1794829251175.jpg',
        amenities: ['am_wifi', 'am_water', 'am_security', 'am_balcony', 'am_study', 'am_parking'],
      },
      {
        id: 'prop_ruiru_greenview',
        ownerId,
        title: 'Ruiru Greenview Hostels',
        slug: 'ruiru-greenview-hostels',
        description: 'Well-managed student hostel residence near Kenyatta University Ruiru Campus and Zetech University. Offers clean single study rooms with individual wardrobes, manicured courtyard, and controlled gate access.',
        propertyType: 'Hostel',
        roomType: 'Single Student Room',
        town: 'Ruiru',
        estate: 'Eastern Bypass',
        landmark: 'Opposite Spur Mall access road',
        institution: 'Kenyatta University / Zetech',
        distance: '8 min matatu',
        rent: 7500,
        deposit: 5000,
        units: 9,
        image: '/src/assets/images/prop_ruiru_hostel_1794829252003.jpg',
        amenities: ['am_wifi', 'am_water', 'am_security', 'am_laundry', 'am_furnished'],
      },
      {
        id: 'prop_palm_residency',
        ownerId,
        title: 'The Palm Residency',
        slug: 'the-palm-residency-kahawa-sukari',
        description: 'Contemporary gated student residence in Kahawa Sukari along Thika Superhighway. Features 24/7 security gatehouse, spacious 1-bedroom units suited for sharing or solo living, solar water heating, and paved courtyard.',
        propertyType: '1-Bedroom Apartment',
        roomType: '1-Bedroom Unit',
        town: 'Kahawa',
        estate: 'Kahawa Sukari',
        landmark: '2nd Avenue off Thika Road',
        institution: 'Kenyatta University Main Campus',
        distance: '7 min drive',
        rent: 14000,
        deposit: 14000,
        units: 3,
        image: '/src/assets/images/prop_palm_residency_1794829252690.jpg',
        amenities: ['am_wifi', 'am_water', 'am_security', 'am_token', 'am_balcony', 'am_parking'],
      },
      {
        id: 'prop_westlands_shared',
        ownerId,
        title: 'Westlands Parkview Shared Suite',
        slug: 'westlands-parkview-shared-suite',
        description: 'Spacious two-bedroom student suite near Westlands and Chiromo Campus. Well-lit common study lounge, reliable fibre internet, and easy access to public transport.',
        propertyType: '2-Bedroom Apartment',
        roomType: 'Shared 2-Bedroom',
        town: 'Westlands',
        estate: 'Riverside Drive',
        landmark: 'Near Chiromo Campus Bridge',
        institution: 'UoN Chiromo Campus',
        distance: '5 min walk',
        rent: 18500,
        deposit: 18500,
        units: 2,
        image: '/src/assets/images/hero_kenya_student_living_1794829251274.jpg',
        amenities: ['am_wifi', 'am_security', 'am_laundry', 'am_balcony', 'am_study'],
      },
      {
        id: 'prop_nyali_breeze',
        ownerId,
        title: 'Nyali Breeze Single Rooms',
        slug: 'nyali-breeze-single-rooms-mombasa',
        description: 'Clean airy single rooms in Nyali, Mombasa for Technical University of Mombasa and coastal college students. Ceiling fans, borehole water, and quiet gated compound.',
        propertyType: 'Single Room',
        roomType: 'Private Room',
        town: 'Nyali',
        estate: 'Links Road',
        landmark: 'Near Nyali Centre',
        institution: 'Technical University of Mombasa',
        distance: '14 min commute',
        rent: 8500,
        deposit: 8500,
        units: 5,
        image: '/src/assets/images/prop_acacia_bedsitter_1794829250879.jpg',
        amenities: ['am_water', 'am_security', 'am_token', 'am_laundry'],
      },
    ];

    const insertProp = db.prepare(`
      INSERT INTO properties (
        id, owner_id, title, slug, description, property_type, room_type,
        town, estate, address_landmark, nearby_institution, distance_to_institution,
        monthly_rent_kes, deposit_kes, units_available, availability_status, listing_status, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 'approved', 1)
    `);
    const insertImg = db.prepare(
      'INSERT INTO property_images (id, property_id, image_url, caption, is_primary, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertPropAm = db.prepare('INSERT INTO property_amenities (property_id, amenity_id) VALUES (?, ?)');

    for (const p of demoProperties) {
      insertProp.run(
        p.id, p.ownerId, p.title, p.slug, p.description, p.propertyType, p.roomType,
        p.town, p.estate, p.landmark, p.institution, p.distance, p.rent, p.deposit, p.units
      );
      insertImg.run(newId(), p.id, p.image, `${p.title} — Primary View`, 1, 0);
      for (const amId of p.amenities) {
        insertPropAm.run(p.id, amId);
      }
    }

    // Assign caretaker Brian explicitly ONLY to Acacia Heights and The Palm Residency
    // (He does NOT have access to Kilimani Executive Studio or Ruiru Greenview!)
    const insertCaretaker = db.prepare(`
      INSERT INTO property_caretakers (id, property_id, caretaker_id, assigned_by, status)
      VALUES (?, ?, ?, ?, 'active')
    `);
    insertCaretaker.run(newId(), 'prop_acacia_heights', caretakerId, ownerId);
    insertCaretaker.run(newId(), 'prop_palm_residency', caretakerId, ownerId);

    // 6. Seed Sample Saved Property, Enquiry, Viewing Request for Amina
    db.prepare('INSERT INTO saved_properties (id, student_id, property_id) VALUES (?, ?, ?)').run(
      newId(), studentId, 'prop_acacia_heights'
    );
    db.prepare(`
      INSERT INTO enquiries (id, property_id, student_id, subject, message, move_in_month, status, host_reply, responded_by, responded_at)
      VALUES (?, 'prop_acacia_heights', ?, 'September Semester Availability', 'Hello, is a ground or first-floor bedsitter unit available for September intake, and is Wi-Fi included in the KSh 9,500 rent?', '2026-09', 'responded', 'Hi Amina, yes we have 2 first-floor units opening up for September. Borehole water is included; high-speed fibre Wi-Fi is KSh 1,000/month optional.', ?, datetime('now'))
    `).run(newId(), studentId, caretakerId);

    db.prepare(`
      INSERT INTO viewing_requests (id, property_id, student_id, requested_date, requested_time, notes, status, handled_by)
      VALUES (?, 'prop_palm_residency', ?, '2026-11-24', '14:30', 'Would like to inspect the 1-bedroom unit and check natural lighting.', 'accepted', ?)
    `).run(newId(), studentId, caretakerId);

    // 7. Seed Sample Conversation & Notification
    const convId = 'conv_amina_brian';
    db.prepare('INSERT INTO conversations (id, property_id, subject) VALUES (?, ?, ?)').run(
      convId, 'prop_acacia_heights', 'Acacia Heights Bedsitter — Viewing & Wi-Fi'
    );
    db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(convId, studentId);
    db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(convId, caretakerId);
    db.prepare('INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)').run(
      newId(), convId, studentId, 'Hi Brian, thanks for the quick reply! Can I come by Acacia Heights this Friday at 2 PM?'
    );
    db.prepare('INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)').run(
      newId(), convId, caretakerId, 'Karibu Amina! Friday at 2:00 PM works well. Ask for Caretaker Brian at the main gate.'
    );

    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, link, is_read)
      VALUES (?, ?, 'viewing_update', 'Viewing Confirmed: The Palm Residency', 'Your viewing request for 2026-11-24 at 14:30 has been accepted by Caretaker Brian.', '/student/viewings', 0)
    `).run(newId(), studentId);

    // 8. Seed Sample Discover Posts
    const insertDiscover = db.prepare(`
      INSERT INTO discover_posts (id, author_id, property_id, caption, location_tag, media_type, media_url, is_demo)
      VALUES (?, ?, ?, ?, ?, 'image', ?, 1)
    `);
    insertDiscover.run(
      'disc_1',
      studentId,
      'prop_acacia_heights',
      'Afternoon golden hour at my study desk near High Point, Juja. Setting up plants and fast Wi-Fi made all the difference before CATs week!',
      'Juja · High Point',
      '/src/assets/images/discover_room_tour_1794829253277.jpg'
    );
    insertDiscover.run(
      'disc_2',
      ownerId,
      'prop_palm_residency',
      'Sample Residence Tour: Inside the landscaped courtyard and gated entry at The Palm Residency, Kahawa Sukari.',
      'Kahawa Sukari',
      '/src/assets/images/prop_palm_residency_1794829252690.jpg'
    );
    insertDiscover.run(
      'disc_3',
      caretakerId,
      'prop_kilimani_studio',
      'Freshly prepared executive studio in Kilimani with balcony views and quiet study corner.',
      'Kilimani · Nairobi',
      '/src/assets/images/prop_kilimani_studio_1794829251175.jpg'
    );

    // 9. Seed Sample Community Posts
    const insertComm = db.prepare(`
      INSERT INTO community_posts (id, category_id, author_id, title, body, is_demo)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertComm.run(
      'comm_1',
      'cat_advice',
      studentId,
      'Checklist before paying a deposit for bedsitters in Juja & Ruiru',
      'Always visit the property in person or schedule a verified viewing first. Test the water pressure, ask whether electricity uses individual KPLC prepaid tokens, and confirm who the resident caretaker is.',
    );
    insertComm.run(
      'comm_2',
      'cat_roommates',
      studentId,
      'Looking for a quiet female roommate for a 2-bedroom near Chiromo or Kilimani',
      'Starting second semester in January and looking to split a 2-bedroom apartment within 15 minutes of Chiromo campus. Budget around KSh 11,000 - KSh 14,000 per person.',
    );
    insertComm.run(
      'comm_3',
      'cat_safety',
      caretakerId,
      'Safety tip: Always verify caretaker assignment before handing over booking fees',
      'On UniNest, resident caretakers are explicitly assigned to specific buildings by the property owner. Never send cash or mobile money to unverified third parties without viewing the unit and confirming lease documentation.',
    );

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
