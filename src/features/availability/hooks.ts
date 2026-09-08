import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';
import type { AvailabilityRow, BookingRow, SlotMode, TutorSlotRow } from '@/types/database';

/** Slot del tutor loggato (futuri), con eventuale prenotazione collegata. */
export function useMyAvailability() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['my-availability', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { slots: [] as AvailabilityRow[], bookingsBySlot: {} as Record<string, BookingRow> };
      const nowIso = new Date().toISOString();
      const [slotsRes, bookingsRes] = await Promise.all([
        supabase
          .from('tutor_availability')
          .select('*')
          .eq('tutor_id', userId)
          .gte('ends_at', nowIso)
          .order('starts_at', { ascending: true }),
        supabase
          .from('bookings')
          .select('*')
          .eq('tutor_id', userId)
          .in('status', ['pending', 'confirmed']),
      ]);
      if (slotsRes.error) throw slotsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      const bookingsBySlot: Record<string, BookingRow> = {};
      for (const b of (bookingsRes.data ?? []) as BookingRow[]) {
        if (b.slot_id) bookingsBySlot[b.slot_id] = b;
      }
      return { slots: (slotsRes.data ?? []) as AvailabilityRow[], bookingsBySlot };
    },
  });
}

export function useAddSlot() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { startsAt: Date; endsAt: Date; mode: SlotMode }) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase.from('tutor_availability').insert({
        tutor_id: userId,
        starts_at: input.startsAt.toISOString(),
        ends_at: input.endsAt.toISOString(),
        mode: input.mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-availability'] });
      qc.invalidateQueries({ queryKey: ['tutor-slots'] });
    },
  });
}

export function useDeleteSlot() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Sessione mancante');
      const { error } = await supabase
        .from('tutor_availability')
        .delete()
        .eq('id', id)
        .eq('tutor_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-availability'] });
      qc.invalidateQueries({ queryKey: ['tutor-slots'] });
    },
  });
}

/** Slot di un tutor visti da uno studente (free / held / booked). */
export function useTutorSlots(tutorId: string | undefined) {
  return useQuery({
    queryKey: ['tutor-slots', tutorId],
    enabled: !!tutorId,
    queryFn: async (): Promise<TutorSlotRow[]> => {
      const { data, error } = await supabase.rpc('get_tutor_slots', { p_tutor_id: tutorId });
      if (error) throw error;
      return (data ?? []) as TutorSlotRow[];
    },
  });
}
