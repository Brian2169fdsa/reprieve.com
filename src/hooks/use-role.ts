'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrgRole } from '@/lib/types';

interface UseRoleResult {
  role: OrgRole | null;
  isAdmin: boolean;
  isCompliance: boolean;
  isExecutive: boolean;
  canManageControls: boolean;
  canApprove: boolean;
  isLoading: boolean;
}

export function useRole(): UseRoleResult {
  const [role, setRole] = useState<OrgRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('org_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (data?.role) {
          setRole(data.role as OrgRole);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();
  }, []);

  return {
    role,
    isAdmin: role === 'admin',
    isCompliance: role === 'compliance',
    isExecutive: role === 'executive',
    canManageControls: role === 'admin' || role === 'compliance',
    canApprove: role === 'admin' || role === 'compliance' || role === 'supervisor',
    isLoading,
  };
}
