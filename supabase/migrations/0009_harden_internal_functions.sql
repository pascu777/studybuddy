-- StudyBuddy — hardening: le funzioni trigger / interne non devono essere
-- invocabili via PostgREST (/rest/v1/rpc/...). In particolare `public.notify()`
-- è SECURITY DEFINER e, essendo eseguibile da PUBLIC, permetterebbe a qualunque
-- utente autenticato di inserire notifiche arbitrarie per altri utenti.
-- (Advisor Supabase: 0028/0029 anon/authenticated_security_definer_function_executable.)

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.on_booking_confirmed() from public, anon, authenticated;
revoke execute on function public.on_booking_paid_confirmed() from public, anon, authenticated;
revoke execute on function public.on_emergency_offer_accepted() from public, anon, authenticated;
revoke execute on function public.on_message_sent() from public, anon, authenticated;
revoke execute on function public.protect_admin_flag() from public, anon, authenticated;
revoke execute on function public.trg_booking_notify() from public, anon, authenticated;
revoke execute on function public.trg_message_notify() from public, anon, authenticated;
revoke execute on function public.trg_group_session_notify() from public, anon, authenticated;
revoke execute on function public.trg_emergency_offer_notify() from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;
