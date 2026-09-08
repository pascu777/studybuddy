import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { toGeographyPoint, type Coords } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import type {
  ProfileRow,
  StudentProfileRow,
  TutorCredentialRow,
  TutorProfileRow,
} from '@/types/database';

export type FullProfile = {
  profile: ProfileRow;
  tutorProfile: TutorProfileRow | null;
  studentProfile: StudentProfileRow | null;
};

const profileKey = (userId: string | null) => ['profile', userId];

export function useProfile() {
  const { userId } = useSession();
  return useQuery({
    queryKey: profileKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<FullProfile | null> => {
      if (!userId) return null;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!profile) return null;

      let tutorProfile: TutorProfileRow | null = null;
      let studentProfile: StudentProfileRow | null = null;

      if (profile.role === 'tutor') {
        const r = await supabase
          .from('tutor_profiles')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();
        if (r.error) throw r.error;
        tutorProfile = r.data;
      } else if (profile.role === 'student') {
        const r = await supabase
          .from('student_profiles')
          .select('*')
          .eq('profile_id', userId)
          .maybeSingle();
        if (r.error) throw r.error;
        studentProfile = r.data;
      }

      return { profile, tutorProfile, studentProfile };
    },
  });
}

export function useUpdateProfile() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<ProfileRow> & { coords?: Coords | null },
    ) => {
      if (!userId) throw new Error('Sessione mancante');
      const { coords, ...rest } = patch;
      const payload: Partial<ProfileRow> = { ...rest };
      if (coords !== undefined) {
        payload.location_lat = coords?.lat ?? null;
        payload.location_lng = coords?.lng ?? null;
        payload.location_geog = toGeographyPoint(coords) as unknown as null;
      }
      const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}

export function useUpsertTutorProfile() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<TutorProfileRow>) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('tutor_profiles')
        .upsert({ profile_id: userId, ...patch }, { onConflict: 'profile_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}

export function useUpsertStudentProfile() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<StudentProfileRow> & { school_type: StudentProfileRow['school_type'] }) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('student_profiles')
        .upsert({ profile_id: userId, ...patch }, { onConflict: 'profile_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}

export function useCompleteOnboarding() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}

/** Carica una foto locale nel bucket `avatars` e restituisce l'URL pubblico. */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const path = `${userId}/avatar_${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/* -------------------------------------------------------------------------- */
/*  Titoli di studio (tutor)                                                  */
/* -------------------------------------------------------------------------- */

export function useTutorCredentials() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['tutor-credentials', userId],
    enabled: !!userId,
    queryFn: async (): Promise<TutorCredentialRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('tutor_credentials')
        .select('*')
        .eq('tutor_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type CredentialInput = {
  id?: string;
  title: string;
  institution: string;
  year: number | null;
  requestVerification: boolean;
};

export function useSaveCredential() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CredentialInput) => {
      if (!userId) throw new Error('Sessione mancante');
      const row = {
        tutor_id: userId,
        title: input.title.trim(),
        institution: input.institution.trim(),
        year: input.year,
        verification_status: input.requestVerification
          ? ('requested' as const)
          : ('none' as const),
        requested_at: input.requestVerification ? new Date().toISOString() : null,
      };
      const query = input.id
        ? supabase.from('tutor_credentials').update(row).eq('id', input.id).eq('tutor_id', userId)
        : supabase.from('tutor_credentials').insert(row);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-credentials', userId] }),
  });
}

export function useDeleteCredential() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('tutor_credentials')
        .delete()
        .eq('id', id)
        .eq('tutor_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tutor-credentials', userId] }),
  });
}

/* -------------------------------------------------------------------------- */
/*  Materie (tutor / studente) — sostituzione integrale delle righe           */
/* -------------------------------------------------------------------------- */

export type TutorSubjectInput = {
  subjectId: string;
  schoolContext: 'high_school' | 'university';
  levelFrom: number;
  levelTo: number;
};

export function useSaveTutorSubjects() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: TutorSubjectInput[]) => {
      if (!userId) throw new Error('Sessione mancante');
      await supabase.from('tutor_subjects').delete().eq('tutor_id', userId);
      if (items.length) {
        const { error } = await supabase.from('tutor_subjects').insert(
          items.map((i) => ({
            tutor_id: userId,
            subject_id: i.subjectId,
            school_context: i.schoolContext,
            level_from: i.levelFrom,
            level_to: i.levelTo,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export type StudentSubjectInput = {
  subjectId: string;
  schoolContext: 'high_school' | 'university';
  level: number;
};

export function useSaveStudentSubjects() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: StudentSubjectInput[]) => {
      if (!userId) throw new Error('Sessione mancante');
      await supabase.from('student_subjects').delete().eq('student_id', userId);
      if (items.length) {
        const { error } = await supabase.from('student_subjects').insert(
          items.map((i) => ({
            student_id: userId,
            subject_id: i.subjectId,
            school_context: i.schoolContext,
            level: i.level,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

type TutorSubjectRow = {
  subject_id: string;
  school_context: 'high_school' | 'university';
  level_from: number;
  level_to: number;
};
type StudentSubjectRow = { subject_id: string; school_context: string; level: number };

export function useTutorSubjects() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['tutor-subjects', userId],
    enabled: !!userId,
    queryFn: async (): Promise<TutorSubjectRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('tutor_subjects')
        .select('*')
        .eq('tutor_id', userId);
      if (error) throw error;
      return (data ?? []) as TutorSubjectRow[];
    },
  });
}

export function useStudentSubjects() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['student-subjects', userId],
    enabled: !!userId,
    queryFn: async (): Promise<StudentSubjectRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', userId);
      if (error) throw error;
      return (data ?? []) as StudentSubjectRow[];
    },
  });
}
