import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useProfile } from '@/features/profile/hooks';
import { supabase } from '@/lib/supabase';
import type {
  AdminOverviewRow,
  AdminPendingCredentialRow,
  AdminUserRow,
  UserRole,
} from '@/types/database';

/** L'utente corrente è amministratore? (dal profilo aggregato) */
export function useIsAdmin() {
  const { data: full, isLoading } = useProfile();
  return { isAdmin: !!full?.profile.is_admin, isLoading };
}

export function useAdminOverview() {
  const { isAdmin } = useIsAdmin();
  return useQuery({
    queryKey: ['admin', 'overview'],
    enabled: isAdmin,
    queryFn: async (): Promise<AdminOverviewRow | null> => {
      const { data, error } = await supabase.rpc('admin_overview');
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });
}

export function useAdminPendingCredentials() {
  const { isAdmin } = useIsAdmin();
  return useQuery({
    queryKey: ['admin', 'pending-credentials'],
    enabled: isAdmin,
    queryFn: async (): Promise<AdminPendingCredentialRow[]> => {
      const { data, error } = await supabase.rpc('admin_pending_credentials');
      if (error) throw error;
      return (data ?? []) as AdminPendingCredentialRow[];
    },
  });
}

export type AdminUserFilter = 'all' | UserRole;

export function useAdminUsers(query: string, role: AdminUserFilter) {
  const { isAdmin } = useIsAdmin();
  return useQuery({
    queryKey: ['admin', 'users', query.trim().toLowerCase(), role],
    enabled: isAdmin,
    queryFn: async (): Promise<AdminUserRow[]> => {
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_query: query.trim(),
        p_role: role,
        p_limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
  });
}

function invalidateAdmin(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin'] });
  qc.invalidateQueries({ queryKey: ['profile'] });
}

export function useReviewCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean; note?: string }) => {
      const { error } = await supabase.rpc('admin_review_credential', {
        p_id: input.id,
        p_approve: input.approve,
        p_note: input.note ?? '',
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}

export function useSetTutorVerified() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tutorId: string; verified: boolean }) => {
      const { error } = await supabase.rpc('admin_set_tutor_verified', {
        p_tutor_id: input.tutorId,
        p_verified: input.verified,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateAdmin(qc),
  });
}
