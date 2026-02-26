'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Organization } from '@/lib/types';

interface UseOrgResult {
  org: Organization | null;
  isLoading: boolean;
  error: string | null;
}

export function useOrg(): UseOrgResult {
  const [org, setOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchOrg() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Not authenticated');
          return;
        }

        const { data, error: memberError } = await supabase
          .from('org_members')
          .select('org_id, organizations(*)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (memberError) {
          setError(memberError.message);
          return;
        }

        if (data?.organizations) {
          setOrg(data.organizations as unknown as Organization);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrg();
  }, []);

  return { org, isLoading, error };
}
