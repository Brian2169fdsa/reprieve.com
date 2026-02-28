-- Migration 009: Fix infinite recursion in org_members RLS
--
-- The "Members can view org members" SELECT policy on org_members was
-- self-referential: its USING clause queried the same table, causing
-- PostgreSQL to raise "infinite recursion detected in policy for
-- relation org_members". This also broke every other table whose
-- policies reference org_members (controls, checkpoints, vault, etc.)
--
-- Fix: introduce a SECURITY DEFINER helper function so the inner
-- lookup bypasses RLS, breaking the recursion chain.

-- ── 1. Helper function ──────────────────────────────────────────────────
-- Runs as the function owner (postgres), so org_members is read without
-- triggering RLS — safe because it only returns rows for auth.uid().
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id
  FROM public.org_members
  WHERE user_id = auth.uid() AND is_active = true
$$;

-- ── 2. Drop the recursive policies on org_members ───────────────────────
DROP POLICY IF EXISTS "Members can view org members"                        ON public.org_members;
DROP POLICY IF EXISTS "Admins can update org members"                       ON public.org_members;
DROP POLICY IF EXISTS "Admins can delete org members"                       ON public.org_members;
DROP POLICY IF EXISTS "Users can create own membership or admins can add members" ON public.org_members;

-- ── 3. Drop dependent policies on other tables that also self-referenced ─
DROP POLICY IF EXISTS "Members can view their org"             ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their org"            ON public.organizations;
DROP POLICY IF EXISTS "Members can view org audit log"         ON public.audit_log;
DROP POLICY IF EXISTS "Members can insert audit log entries"   ON public.audit_log;
DROP POLICY IF EXISTS "Members can view org member profiles"   ON public.profiles;

-- ── 4. Recreate org_members policies using the helper ───────────────────

-- SELECT: own row always visible, plus all rows in the same org
CREATE POLICY "Members can view org members"
  ON public.org_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT get_my_org_ids())
  );

-- INSERT: user adding themselves, or existing admin adding someone
CREATE POLICY "Users can create own membership or admins can add members"
  ON public.org_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR org_id IN (SELECT get_my_org_ids())
  );

-- UPDATE: admins only
CREATE POLICY "Admins can update org members"
  ON public.org_members FOR UPDATE
  USING (org_id IN (SELECT get_my_org_ids()));

-- DELETE: admins only
CREATE POLICY "Admins can delete org members"
  ON public.org_members FOR DELETE
  USING (org_id IN (SELECT get_my_org_ids()));

-- ── 5. Recreate dependent policies on other tables ───────────────────────

CREATE POLICY "Members can view their org"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT get_my_org_ids()));

CREATE POLICY "Admins can update their org"
  ON public.organizations FOR UPDATE
  USING (id IN (SELECT get_my_org_ids()));

CREATE POLICY "Members can view org audit log"
  ON public.audit_log FOR SELECT
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Members can insert audit log entries"
  ON public.audit_log FOR INSERT
  WITH CHECK (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Members can view org member profiles"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT om.user_id FROM public.org_members om
      WHERE om.org_id IN (SELECT get_my_org_ids())
    )
  );
