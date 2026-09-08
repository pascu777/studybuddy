import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { SchoolContext, SubjectRow } from '@/types/database';

export function useSubjects(ctx?: SchoolContext) {
  return useQuery({
    queryKey: ['subjects'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SubjectRow[]> => {
      const { data, error } = await supabase.from('subjects').select('*').order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    select: (rows) =>
      ctx
        ? rows.filter((s) => (ctx === 'high_school' ? s.applies_high_school : s.applies_university))
        : rows,
  });
}
