import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';

export type PortfolioStudent = {
  student_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  location_label: string | null;
  since: string;
  lessons_count: number;
};

export type EnrolledTutor = {
  tutor_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  verified: boolean;
  since: string;
};

export function useMyStudents() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['my-students', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PortfolioStudent[]> => {
      const { data, error } = await supabase.rpc('my_students');
      if (error) throw error;
      return (data ?? []) as PortfolioStudent[];
    },
  });
}

export function useMyTutors() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['my-tutors', userId],
    enabled: !!userId,
    queryFn: async (): Promise<EnrolledTutor[]> => {
      const { data, error } = await supabase.rpc('my_tutors');
      if (error) throw error;
      return (data ?? []) as EnrolledTutor[];
    },
  });
}

export function useRemoveStudent() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('tutor_students')
        .update({ status: 'removed' })
        .eq('tutor_id', userId)
        .eq('student_id', studentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-students'] }),
  });
}
