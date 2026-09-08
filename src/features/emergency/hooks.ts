import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';
import type { BookingMode, MyEmergencyRow, OpenEmergencyRow } from '@/types/database';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['open-emergencies'] });
  qc.invalidateQueries({ queryKey: ['my-emergencies'] });
  qc.invalidateQueries({ queryKey: ['my-bookings'] });
};

export function useOpenEmergencies() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['open-emergencies', userId],
    enabled: !!userId,
    queryFn: async (): Promise<OpenEmergencyRow[]> => {
      const { data, error } = await supabase.rpc('open_emergencies');
      if (error) throw error;
      return (data ?? []) as OpenEmergencyRow[];
    },
  });
}

export function useMyEmergencies() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['my-emergencies', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyEmergencyRow[]> => {
      const { data, error } = await supabase.rpc('my_emergencies');
      if (error) throw error;
      return (data ?? []) as MyEmergencyRow[];
    },
  });
}

export function useCreateEmergency() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subjectId: string | null;
      note: string;
      mode: BookingMode;
      whenPref: string;
      broadcast: boolean;
      targetTutorId?: string | null;
    }) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase.from('emergency_requests').insert({
        student_id: userId,
        subject_id: input.subjectId,
        note: input.note.trim(),
        mode: input.mode,
        when_pref: input.whenPref.trim(),
        broadcast: input.broadcast,
        target_tutor_id: input.broadcast ? null : (input.targetTutorId ?? null),
        status: 'open',
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useCancelEmergency() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('emergency_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('student_id', userId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Tutor: propone un orario per una richiesta d'emergenza. */
export function useOfferEmergency() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requestId: string; proposedAt: Date; note: string }) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase.from('emergency_offers').insert({
        request_id: input.requestId,
        tutor_id: userId,
        proposed_at: input.proposedAt.toISOString(),
        note: input.note.trim(),
        status: 'offered',
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Studente: accetta o rifiuta una proposta. */
export function useRespondToOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { offerId: string; decision: 'accepted' | 'declined' }) => {
      const { error } = await supabase
        .from('emergency_offers')
        .update({ status: input.decision })
        .eq('id', input.offerId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
