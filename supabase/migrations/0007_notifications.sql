-- StudyBuddy — F8: notifiche in-app (centro notifiche) + trigger su eventi.
-- Le push vere partono da una Edge Function (`supabase/functions/notify`) che
-- legge queste righe: il webhook DB→Function si configura dalla dashboard.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy "notifications_owner_select" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
create policy "notifications_owner_update" on public.notifications
  for update to authenticated using (auth.uid() = user_id);
create policy "push_tokens_owner_all" on public.push_tokens
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.my_notifications()
returns setof public.notifications
language sql stable security definer set search_path = public as $$
  select * from public.notifications where user_id = auth.uid() order by created_at desc limit 100;
$$;
grant execute on function public.my_notifications to authenticated;

create or replace function public.mark_notifications_read()
returns void
language sql security definer set search_path = public as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.mark_notifications_read to authenticated;

create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user, p_kind, p_title, p_body, p_link);
$$;

-- ---- trigger sugli eventi ----
create or replace function public.trg_booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if tg_op = 'INSERT' then
    select first_name || ' ' || last_name into who from public.profiles where id = new.student_id;
    perform public.notify(new.tutor_id, 'booking_request', 'Nuova richiesta di lezione',
      coalesce(who, 'Uno studente') || ' ha richiesto una lezione.', '/(app)/lezioni');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    select first_name || ' ' || last_name into who from public.profiles where id = new.tutor_id;
    if new.status = 'confirmed' then
      perform public.notify(new.student_id, 'booking_confirmed', 'Richiesta accettata',
        coalesce(who, 'Il tutor') || ' ha confermato la lezione.', '/(app)/lezioni');
    elsif new.status = 'declined' then
      perform public.notify(new.student_id, 'booking_declined', 'Richiesta rifiutata',
        coalesce(who, 'Il tutor') || ' non può fare questa lezione.', '/(app)/lezioni');
    end if;
  end if;
  return new;
end;
$$;
create trigger booking_notify_ins after insert on public.bookings
  for each row execute function public.trg_booking_notify();
create trigger booking_notify_upd after update on public.bookings
  for each row execute function public.trg_booking_notify();

create or replace function public.trg_message_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.conversations; other uuid; who text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  other := case when new.sender_id = c.tutor_id then c.student_id else c.tutor_id end;
  select first_name || ' ' || last_name into who from public.profiles where id = new.sender_id;
  perform public.notify(other, 'message', 'Nuovo messaggio',
    coalesce(who, 'Qualcuno') || ': ' || left(new.body, 80), '/(app)/messaggi');
  return new;
end;
$$;
create trigger message_notify after insert on public.messages
  for each row execute function public.trg_message_notify();

create or replace function public.trg_group_session_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare gname text; m record;
begin
  select name into gname from public.study_groups where id = new.group_id;
  for m in select student_id from public.group_members where group_id = new.group_id and status = 'active' loop
    perform public.notify(m.student_id, 'group_session', 'Nuova sessione di gruppo',
      coalesce(gname, 'La tua classe') || ': ' || coalesce(nullif(new.topic, ''), 'sessione pianificata') || '.',
      '/(app)/gruppi');
  end loop;
  return new;
end;
$$;
create trigger group_session_notify after insert on public.group_sessions
  for each row execute function public.trg_group_session_notify();

create or replace function public.trg_emergency_offer_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid; who text;
begin
  select student_id into sid from public.emergency_requests where id = new.request_id;
  select first_name || ' ' || last_name into who from public.profiles where id = new.tutor_id;
  perform public.notify(sid, 'emergency_offer', 'Proposta per la lezione d''emergenza',
    coalesce(who, 'Un tutor') || ' ha proposto un orario.', '/(app)/emergenza');
  return new;
end;
$$;
create trigger emergency_offer_notify after insert on public.emergency_offers
  for each row execute function public.trg_emergency_offer_notify();
