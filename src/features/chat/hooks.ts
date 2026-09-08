import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/session-provider';
import { DEMO_MODE } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { ConversationRow, MessageRow } from '@/types/database';

export function useConversations() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['conversations', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationRow[]> => {
      const { data, error } = await supabase.rpc('my_conversations');
      if (error) throw error;
      return (data ?? []) as ConversationRow[];
    },
  });
}

export function useUnreadMessages() {
  const { data } = useConversations();
  return (data ?? []).reduce((n, c) => n + (c.unread || 0), 0);
}

/** Ricava/crea la conversazione con un tutor e ne restituisce l'id. */
export function useOpenConversation() {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tutorId: string; studentId?: string }) => {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_tutor_id: input.tutorId,
        p_student_id: input.studentId ?? userId,
      });
      if (error) throw error;
      return (data ?? [])[0] as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useMessages(conversationId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  useEffect(() => {
    if (!conversationId || DEMO_MODE) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['messages', conversationId] });
          qc.invalidateQueries({ queryKey: ['conversations'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  return query;
}

export function useSendMessage(conversationId: string | undefined) {
  const { userId } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!userId || !conversationId) throw new Error('Conversazione mancante');
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
