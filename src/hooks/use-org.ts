'use client';

import { useState, useEffect } from 'react';
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
    async function fetchOrg() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/me');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Failed to load organization');
          return;
        }
        const data = await res.json();
        setOrg(data.org ?? null);
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
