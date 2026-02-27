import { createClient } from './client';

/**
 * Upload a file to org-scoped evidence bucket.
 * Bucket name pattern: org-${orgId}-evidence
 * Storage path: ${checkpointId}/${timestamp}-${file.name}
 */
export async function uploadEvidence(
  orgId: string,
  checkpointId: string,
  file: File
): Promise<{ path: string; error: Error | null }> {
  const supabase = createClient();
  const bucket = `org-${orgId}-evidence`;
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${checkpointId}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return { path: '', error: new Error(error.message) };
  }

  return { path, error: null };
}

/**
 * Get a signed URL for an evidence file (60-minute expiry).
 */
export async function getEvidenceUrl(
  orgId: string,
  path: string
): Promise<string | null> {
  const supabase = createClient();
  const bucket = `org-${orgId}-evidence`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Delete an evidence file from storage.
 */
export async function deleteEvidence(
  orgId: string,
  path: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const bucket = `org-${orgId}-evidence`;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

// ── Policy Document Storage ──────────────────────────────────────────────────

/**
 * Upload a document to org-scoped policy bucket.
 * Bucket: org-${orgId}-policies
 * Path: ${policyId}/${timestamp}-${safeName}
 */
export async function uploadPolicyDocument(
  orgId: string,
  policyId: string,
  file: File
): Promise<{ path: string; error: Error | null }> {
  const supabase = createClient();
  const bucket = `org-${orgId}-policies`;
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${policyId}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    return { path: '', error: new Error(error.message) };
  }

  return { path, error: null };
}

/**
 * Get a signed URL for a policy document (60-minute expiry).
 */
export async function getPolicyDocumentUrl(
  orgId: string,
  path: string
): Promise<string | null> {
  const supabase = createClient();
  const bucket = `org-${orgId}-policies`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Delete a policy document from storage.
 */
export async function deletePolicyDocument(
  orgId: string,
  path: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const bucket = `org-${orgId}-policies`;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
