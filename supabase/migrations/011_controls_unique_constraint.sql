-- Migration 011: Add unique constraint on controls(org_id, code)
-- Required for upsert ON CONFLICT (org_id, code) to work correctly.
-- Each org can only have one control with a given code.

ALTER TABLE public.controls
  ADD CONSTRAINT controls_org_id_code_key UNIQUE (org_id, code);
