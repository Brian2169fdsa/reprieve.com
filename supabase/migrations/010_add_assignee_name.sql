-- Migration 010: Add assignee_name to checkpoints
-- Allows checkpoints to be assigned to a named person (e.g. "Emily", "Wayne")
-- before they have a user account, without breaking the assigned_to FK.

ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS assignee_name TEXT;
