import { useLocalSearchParams, useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatBubble, StepHeader, Text } from '@/components';
import { useSession } from '@/features/auth/session-provider';
import { useMessages, useSendMessage } from '@/features/chat/hooks';
import { useTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { userId } = useSession();
  const { data: messages = [], isLoading } = useMessages(id);
  const send = useSendMessage(id);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messages.length]);

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      await send.mutateAsync(text);
    } catch {
      setDraft(text);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerWrap}>
          <StepHeader title={name || 'Conversazione'} onBack={() => router.back()} />
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.messages}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <Text variant="caption" tone="soft" center style={styles.empty}>
                Nessun messaggio. Scrivi qualcosa per iniziare.
              </Text>
            ) : (
              messages.map((m) => (
                <ChatBubble key={m.id} body={m.body} createdAt={m.created_at} mine={m.sender_id === userId} />
              ))
            )}
          </ScrollView>
        )}

        <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Scrivi un messaggio…"
            placeholderTextColor={theme.textSoft}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            multiline
            onSubmitEditing={submit}
          />
          <Pressable
            onPress={submit}
            disabled={!draft.trim() || send.isPending}
            style={[styles.sendBtn, { backgroundColor: draft.trim() ? theme.primary : theme.border }]}
          >
            <Send size={18} color={theme.primaryText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  loader: { marginTop: spacing.xxxl },
  messages: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexGrow: 1 },
  empty: { marginTop: spacing.xxxl },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 15,
  },
  sendBtn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
