// StudyBuddy — Edge Function push (F8).
// Deploy:  npx supabase functions deploy notify
// Poi in Dashboard → Database → Webhooks: crea un webhook su INSERT di
// `public.notifications` che chiama questa funzione (header Authorization col
// service_role key). La funzione risolve i push token dell'utente e invia via
// Expo Push API.
//
// Nota: `expo-server-sdk` non è indispensabile — l'endpoint Expo accetta un POST
// JSON semplice.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // payload.record = riga inserita in public.notifications (formato Supabase DB webhook)
    const n = payload.record ?? payload;
    if (!n?.user_id) return new Response('no user', { status: 400 });

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', n.user_id);

    if (!tokens?.length) return new Response('no tokens', { status: 200 });

    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      sound: 'default',
      title: n.title,
      body: n.body,
      data: { link: n.link ?? '' },
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response(await res.text(), { status: res.status });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
