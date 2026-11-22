-- UniNest Policy Documents & Version History Migration
-- Non-destructive additive migration preserving host_terms_acceptances and platform_settings.

CREATE TABLE IF NOT EXISTS public.policy_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('host_terms', 'community_standards')),
  title TEXT NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_initial_draft BOOLEAN NOT NULL DEFAULT false,
  change_notes TEXT,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  published_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_type, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_published_policy_type
  ON public.policy_document_versions(document_type)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_policy_doc_type_created
  ON public.policy_document_versions(document_type, created_at DESC);

ALTER TABLE public.policy_document_versions ENABLE ROW LEVEL SECURITY;

-- Public & applicants may read ONLY currently published policy documents
CREATE POLICY policy_documents_select_published ON public.policy_document_versions
  FOR SELECT USING (status = 'published' OR public.is_admin());

-- Only verified administrators may create or update policy drafts and publish versions
CREATE POLICY policy_documents_admin_insert ON public.policy_document_versions
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY policy_documents_admin_update ON public.policy_document_versions
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());
