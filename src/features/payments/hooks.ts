import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';
import type { EarningsSummaryRow, PlatformConfigRow } from '@/types/database';

export function usePlatformConfig() {
  return useQuery({
    queryKey: ['platform-config'],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<PlatformConfigRow> => {
      const { data, error } = await supabase.rpc('platform_config');
      if (error) throw error;
      return (
        (data ?? [])[0] ?? { commission_rate: 0.1, occasional_limit_cents: 500000, currency: 'EUR' }
      );
    },
  });
}

export function useEarningsSummary() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['earnings-summary', userId],
    enabled: !!userId,
    queryFn: async (): Promise<EarningsSummaryRow | null> => {
      const { data, error } = await supabase.rpc('tutor_earnings_summary');
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });
}

export function useTutorRate() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['tutor-rate', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('tutor_rates')
        .select('hourly_rate_cents')
        .eq('tutor_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data?.hourly_rate_cents ?? 1500;
    },
  });
}

export function useSetTutorRate() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hourlyCents: number) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('tutor_rates')
        .upsert(
          { tutor_id: userId, hourly_rate_cents: hourlyCents, updated_at: new Date().toISOString() },
          { onConflict: 'tutor_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tutor-rate'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
