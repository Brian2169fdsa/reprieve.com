'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Checkpoint, CheckpointStatus } from '@/lib/types';

interface UseCheckpointsFilters {
  period?: string;
  status?: CheckpointStatus;
  assignedTo?: string;
}

interface UseCheckpointsResult {
  checkpoints: Checkpoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCheckpoints(filters: UseCheckpointsFilters = {}): UseCheckpointsResult {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const supabase = createClient();

    async function fetchCheckpoints() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Not authenticated');
          return;
        }

        const { data: memberData } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!memberData?.org_id) {
          setError('No organization found');
          return;
        }

        let query = supabase
          .from('checkpoints')
          .select('*, control:controls(*), assignee:profiles!assigned_to(*)')
          .eq('org_id', memberData.org_id)
          .order('due_date', { ascending: true });

        if (filters.period) {
          query = query.eq('period', filters.period);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.assignedTo) {
          query = query.eq('assigned_to', filters.assignedTo);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          setError(queryError.message);
          return;
        }

        setCheckpoints((data as Checkpoint[]) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCheckpoints();
  }, [filters.period, filters.status, filters.assignedTo, tick]);

  return { checkpoints, isLoading, error, refetch };
}
