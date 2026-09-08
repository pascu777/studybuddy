import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';
import type { BookingMode, BookingStatus, MyBookingRow } from '@/types/database';

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['my-bookings'] });
  qc.invalidateQueries({ queryKey: ['tutor-slots'] });
  qc.invalidateQueries({ queryKey: ['my-availability'] });
  qc.invalidateQueries({ queryKey: ['my-students'] });
  qc.invalidateQueries({ queryKey: ['my-tutors'] });
};

export function useMyBookings() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['my-bookings', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MyBookingRow[]> => {
      const { data, error } = await supabase.rpc('my_bookings');
      if (error) throw error;
      return (data ?? []) as MyBookingRow[];
    },
  });
}

export function useCreateBooking() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      slotId: string;
      tutorId: string;
      startsAt: string;
      endsAt: string;
      mode: BookingMode;
      subjectId: string | null;
      message: string;
      priceCents?: number;
      commissionCents?: number;
      isEmergency?: boolean;
    }) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase.from('bookings').insert({
        slot_id: input.slotId,
        tutor_id: input.tutorId,
        student_id: userId,
        subject_id: input.subjectId,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        mode: input.mode,
        status: 'pending',
        is_emergency: input.isEmergency ?? false,
        message: input.message.trim(),
        price_cents: input.priceCents ?? 0,
        commission_cents: input.commissionCents ?? 0,
      });
      if (error) {
        if (error.code === '23505') {
          throw new Error('Questo slot è appena stato prenotato da un altro studente.');
        }
        throw error;
      }
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Tutor: accetta o rifiuta una richiesta. */
export function useRespondToBooking() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: Extract<BookingStatus, 'confirmed' | 'declined'>;
      note?: string;
    }) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('bookings')
        .update({ status: input.decision, tutor_note: input.note?.trim() ?? '' })
        .eq('id', input.id)
        .eq('tutor_id', userId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Studente: annulla una propria richiesta / lezione. */
export function useCancelBooking() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('student_id', userId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
