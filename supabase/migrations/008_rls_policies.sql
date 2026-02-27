-- Migration 008: Complete RLS Policies
-- Adds missing INSERT/UPDATE/DELETE policies for core schema tables (002)
-- Tables from migrations 003-007 already use FOR ALL USING which covers all operations

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

-- Any authenticated user can create a new org (signup flow)
CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Org admins can update their org settings
CREATE POLICY "Admins can update their org"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
  );

-- ============================================================
-- ORG_MEMBERS
-- ============================================================

-- Users can add themselves to an org (signup flow creates initial admin membership)
-- Admins can add other members (invite flow)
CREATE POLICY "Users can create own membership or admins can add members"
  ON public.org_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
  );

-- Admins can update member roles and status
CREATE POLICY "Admins can update org members"
  ON public.org_members FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true AND om.role = 'admin'
    )
  );

-- Admins can remove members
CREATE POLICY "Admins can delete org members"
  ON public.org_members FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id FROM public.org_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true AND om.role = 'admin'
    )
  );

-- ============================================================
-- PROFILES
-- ============================================================

-- Allow the trigger to work + users can see profiles of people in their org
CREATE POLICY "Members can view org member profiles"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT om.user_id FROM public.org_members om
      WHERE om.org_id IN (
        SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
    OR id = auth.uid()
  );

-- ============================================================
-- AUDIT_LOG
-- ============================================================

-- Org members can insert audit log entries
CREATE POLICY "Members can insert audit log entries"
  ON public.audit_log FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
