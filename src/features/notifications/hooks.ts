import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useSession } from '@/features/auth/session-provider';
import { DEMO_MODE } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { NotificationRow } from '@/types/database';

export function useNotifications() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    refetchInterval: DEMO_MODE ? false : 60_000,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase.rpc('my_notifications');
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });
}

export function useUnreadNotifications() {
  const { data } = useNotifications();
  return (data ?? []).filter((n) => !n.read_at).length;
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Registra il push token Expo per l'utente corrente (no-op in demo / su web). */
export function useRegisterPushToken() {
  const { userId } = useSession();
  useEffect(() => {
    if (!userId || DEMO_MODE || Platform.OS === 'web' || !Device.isDevice) return;
    (async () => {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted') return;
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined))
          .data;
        await supabase
          .from('push_tokens')
          .upsert(
            { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,token' },
          );
      } catch {
        /* silenzioso */
      }
    })();
  }, [userId]);
}
