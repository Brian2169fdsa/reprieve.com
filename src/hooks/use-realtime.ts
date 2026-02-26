'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  callback: (payload: Record<string, unknown>) => void;
}

export function useRealtime({ table, filter, callback }: UseRealtimeOptions): RealtimeChannel | null {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const supabase = createClient();

    const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as Parameters<RealtimeChannel['on']>[0],
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: Record<string, unknown>) => {
          callbackRef.current(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);

  return channelRef.current;
}
