import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Coords } from '@/lib/geo';
import type { SchoolContext, TutorCardRow } from '@/types/database';

export type SearchMode = 'any' | 'in_person' | 'online';

export type SearchFilters = {
  subjectId?: string | null;
  schoolContext?: SchoolContext | null;
  level?: number | null;
  mode: SearchMode;
  radiusKm?: number;
  query?: string;
};

export function useSearchTutors(filters: SearchFilters, coords: Coords | null) {
  return useQuery({
    queryKey: ['search-tutors', filters, coords],
    queryFn: async (): Promise<TutorCardRow[]> => {
      const { data, error } = await supabase.rpc('search_tutors', {
        p_lat: coords?.lat ?? null,
        p_lng: coords?.lng ?? null,
        p_radius_km: filters.radiusKm ?? 30,
        p_subject_id: filters.subjectId ?? null,
        p_school_context: filters.schoolContext ?? null,
        p_level: filters.level ?? null,
        p_mode: filters.mode,
        p_query: filters.query?.trim() || null,
      });
      if (error) throw error;
      return (data ?? []) as TutorCardRow[];
    },
  });
}

export function useSearchTutorsByCourse(courseId: string | null, query: string) {
  return useQuery({
    queryKey: ['search-tutors-course', courseId, query],
    enabled: !!courseId,
    queryFn: async (): Promise<TutorCardRow[]> => {
      const { data, error } = await supabase.rpc('search_tutors_by_course', {
        p_course_id: courseId,
        p_query: query.trim() || null,
      });
      if (error) throw error;
      return (data ?? []) as TutorCardRow[];
    },
  });
}

export function useTutor(id: string | undefined) {
  return useQuery({
    queryKey: ['tutor', id],
    enabled: !!id,
    queryFn: async (): Promise<TutorCardRow | null> => {
      const { data, error } = await supabase.rpc('get_tutor', { p_id: id });
      if (error) throw error;
      const row = (data ?? [])[0];
      return (row as TutorCardRow) ?? null;
    },
  });
}
