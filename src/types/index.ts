export type UserRole = 'student' | 'owner' | 'caretaker' | 'admin';

export interface ProfileData {
  user_id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  bio: string | null;
  preferred_town: string | null;
}

export interface StudentProfileData {
  user_id: string;
  institution: string;
  campus: string | null;
  course: string | null;
  year_of_study: string | null;
  preferred_budget_min: number | null;
  preferred_budget_max: number | null;
}

export interface HostProfileData {
  user_id: string;
  host_type: 'owner' | 'caretaker';
  business_or_property_name: string | null;
  national_id_last4: string | null;
  kra_pin_provided: number;
  operating_towns: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
}

export interface HostApplication {
  id: string;
  user_id: string;
  requested_role: 'owner' | 'caretaker';
  status: 'pending' | 'approved' | 'rejected';
  full_name: string;
  phone: string;
  email?: string;
  current_user_role?: UserRole;
  business_or_property_name: string | null;
  operating_towns: string;
  national_id_reference: string;
  verification_notes: string;
  reviewer_id: string | null;
  reviewer_name?: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  acceptances?: Array<{
    document_type: PolicyDocumentType;
    document_version: string;
    accepted_at: string;
  }>;
}

export type PolicyDocumentType = 'host_terms' | 'community_standards';
export type PolicyStatus = 'draft' | 'published' | 'archived';

export interface PolicyDocumentRecord {
  id: string;
  document_type: PolicyDocumentType;
  title: string;
  version: string;
  content: string;
  status: PolicyStatus;
  is_initial_draft: boolean;
  change_notes: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  published_by: string | null;
  published_by_name?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPolicyBundle {
  documentType: PolicyDocumentType;
  label: string;
  published: PolicyDocumentRecord | null;
  draft: PolicyDocumentRecord | null;
  history: PolicyDocumentRecord[];
}

export interface LegalDocsStatus {
  ready: boolean;
  missing: string[];
  hostTermsVersion: string | null;
  hostTermsTitle: string | null;
  hostTermsContent: string | null;
  hostTermsPublishedAt: string | null;
  communityStandardsVersion: string | null;
  communityStandardsTitle: string | null;
  communityStandardsContent: string | null;
  communityStandardsPublishedAt: string | null;
}

export interface NotificationConsent {
  channel: 'sms' | 'whatsapp' | 'email_marketing';
  opted_in: number;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  profile: ProfileData;
  studentProfile: StudentProfileData | null;
  hostProfile: HostProfileData | null;
  latestHostApplication: HostApplication | null;
  notificationConsents: NotificationConsent[];
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
  caption: string | null;
  is_primary: number;
  sort_order: number;
}

export interface Property {
  id: string;
  owner_id: string;
  owner_name?: string;
  host_verification_status?: string;
  host_business_name?: string | null;
  title: string;
  slug: string;
  description: string;
  property_type: string;
  room_type: string;
  town: string;
  estate: string;
  address_landmark: string | null;
  nearby_institution: string | null;
  distance_to_institution: string | null;
  monthly_rent_kes: number;
  deposit_kes: number;
  units_available: number;
  availability_status: 'available' | 'limited' | 'full';
  listing_status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'unavailable';
  is_demo: boolean;
  is_saved?: boolean;
  rejection_reason?: string | null;
  images: PropertyImage[];
  amenities: Amenity[];
  assigned_caretaker?: { id: string; full_name: string } | null;
  can_edit_details?: number;
  can_upload_images?: number;
  can_manage_enquiries?: number;
  can_manage_viewings?: number;
  created_at: string;
}

export interface Enquiry {
  id: string;
  property_id: string;
  property_title: string;
  town: string;
  estate?: string;
  monthly_rent_kes?: number;
  student_id: string;
  student_name?: string;
  student_institution?: string;
  subject: string;
  message: string;
  move_in_month: string | null;
  status: 'new' | 'responded' | 'closed';
  host_reply: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface ViewingRequest {
  id: string;
  property_id: string;
  property_title: string;
  town: string;
  estate?: string;
  student_id: string;
  student_name?: string;
  requested_date: string;
  requested_time: string;
  notes: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'rescheduled' | 'completed' | 'cancelled';
  proposed_date: string | null;
  proposed_time: string | null;
  host_notes: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  property_id: string | null;
  property_title: string | null;
  subject: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  participants: Array<{ user_id: string; full_name: string; role: UserRole }>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

export interface DiscoverPost {
  id: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  property_id: string | null;
  property_title: string | null;
  property_town: string | null;
  property_rent: number | null;
  caption: string;
  location_tag: string | null;
  media_type: 'image' | 'video';
  media_url: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface CommunityCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface CommunityPost {
  id: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  title: string;
  body: string;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  is_demo: boolean;
  created_at: string;
}
