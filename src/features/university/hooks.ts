import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';
import type { CourseRow, DegreeCourseRow } from '@/types/database';

export function useDegreeCourses() {
  return useQuery({
    queryKey: ['degree-courses'],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<DegreeCourseRow[]> => {
      const { data, error } = await supabase.rpc('list_degree_courses');
      if (error) throw error;
      return (data ?? []) as DegreeCourseRow[];
    },
  });
}

export function useSearchCourses(query: string, degreeCourseId?: string | null) {
  return useQuery({
    queryKey: ['search-courses', query, degreeCourseId],
    queryFn: async (): Promise<CourseRow[]> => {
      const { data, error } = await supabase.rpc('search_courses', {
        p_query: query.trim() || null,
        p_degree_course_id: degreeCourseId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });
}

export function useMyTutorCourses() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['tutor-courses', userId],
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('tutor_courses')
        .select('course_id')
        .eq('tutor_id', userId);
      if (error) throw error;
      return (data ?? []).map((r: { course_id: string }) => r.course_id);
    },
  });
}

export function useSaveTutorCourses() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseIds: string[]) => {
      if (!userId) throw new Error('Sessione mancante');
      await supabase.from('tutor_courses').delete().eq('tutor_id', userId);
      if (courseIds.length) {
        const { error } = await supabase
          .from('tutor_courses')
          .insert(courseIds.map((id) => ({ tutor_id: userId, course_id: id })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-courses'] }),
  });
}
