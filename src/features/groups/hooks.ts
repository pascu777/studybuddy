import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase';
import type { GroupDetailRow, GroupRow, SlotMode } from '@/types/database';

export function useMyGroups() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['my-groups', userId],
    enabled: !!userId,
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await supabase.rpc('my_groups');
      if (error) throw error;
      return (data ?? []) as GroupRow[];
    },
  });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['group', id],
    enabled: !!id,
    queryFn: async (): Promise<GroupDetailRow | null> => {
      const { data, error } = await supabase.rpc('group_detail', { p_id: id });
      if (error) throw error;
      return ((data ?? [])[0] as GroupDetailRow) ?? null;
    },
  });
}

export function useCreateGroup() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; subjectId: string | null; description: string }) => {
      if (!userId) throw new Error('Sessione mancante');
      const { data, error } = await supabase
        .from('study_groups')
        .insert({
          tutor_id: userId,
          name: input.name.trim(),
          subject_id: input.subjectId,
          description: input.description.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-groups'] }),
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { groupId: string; studentId: string; external: boolean }) => {
      const { error } = await supabase.from('group_members').upsert(
        {
          group_id: input.groupId,
          student_id: input.studentId,
          status: 'active',
          invited_external: input.external,
        },
        { onConflict: 'group_id,student_id' },
      );
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['group', v.groupId] });
      qc.invalidateQueries({ queryKey: ['my-groups'] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { groupId: string; studentId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'removed' })
        .eq('group_id', input.groupId)
        .eq('student_id', input.studentId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['group', v.groupId] }),
  });
}

export function useAddGroupSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      groupId: string;
      startsAt: Date;
      endsAt: Date;
      mode: SlotMode;
      topic: string;
    }) => {
      const { error } = await supabase.from('group_sessions').insert({
        group_id: input.groupId,
        starts_at: input.startsAt.toISOString(),
        ends_at: input.endsAt.toISOString(),
        mode: input.mode,
        topic: input.topic.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['group', v.groupId] });
      qc.invalidateQueries({ queryKey: ['my-groups'] });
    },
  });
}
