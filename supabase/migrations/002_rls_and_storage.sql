-- UniNest Supabase Row Level Security (RLS), Transactional RPC, and Storage Policies

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_property(prop_id UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = prop_id AND p.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.property_caretakers pc
    WHERE pc.property_id = prop_id AND pc.caretaker_id = auth.uid() AND pc.status = 'active'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_caretakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update only their own profile; cannot self-escalate role
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY profiles_update_own_no_role_change ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
    AND status = (SELECT status FROM public.profiles WHERE user_id = auth.uid())
  );

-- Properties: public sees approved; owners/active caretakers/admins see managed properties
CREATE POLICY properties_select ON public.properties
  FOR SELECT USING (listing_status = 'approved' OR public.can_manage_property(id));

CREATE POLICY properties_insert_owner ON public.properties
  FOR INSERT WITH CHECK (
    owner_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY properties_update_authorized ON public.properties
  FOR UPDATE USING (public.can_manage_property(id));

-- Caretaker assignments: strictly owner of property or admin
CREATE POLICY caretakers_manage ON public.property_caretakers
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.owner_id = auth.uid()
    )
  );

-- Favourites, Enquiries, Viewing Requests
CREATE POLICY saved_own ON public.saved_properties
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY enquiries_select ON public.enquiries
  FOR SELECT USING (student_id = auth.uid() OR public.can_manage_property(property_id));

CREATE POLICY enquiries_insert ON public.enquiries
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY viewings_select ON public.viewing_requests
  FOR SELECT USING (student_id = auth.uid() OR public.can_manage_property(property_id));

-- Conversations & Messages: strictly participants
CREATE POLICY conversations_participant ON public.conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = id AND cp.user_id = auth.uid())
  );

CREATE POLICY messages_participant ON public.messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid())
  );

-- Notifications: strictly recipient
CREATE POLICY notifications_own ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Audit logs: admin read-only
CREATE POLICY audit_admin_only ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('discover-media', 'discover-media', true)
ON CONFLICT (id) DO NOTHING;
