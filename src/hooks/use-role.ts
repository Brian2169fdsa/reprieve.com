'use client';

import { useState, useEffect } from 'react';
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
    async function fetchRole() {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = await res.json();
        if (data.role) setRole(data.role as OrgRole);
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
