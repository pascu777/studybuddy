-- StudyBuddy — F4: chat interna 1-a-1 studente ↔ tutor (Supabase Realtime).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tutor_id, student_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations_parties" on public.conversations
  for select to authenticated using (auth.uid() = tutor_id or auth.uid() = student_id);

create policy "messages_parties_select" on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversations c
      where c.id = conversation_id and (c.tutor_id = auth.uid() or c.student_id = auth.uid()))
  );
create policy "messages_send" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (select 1 from public.conversations c
      where c.id = conversation_id and (c.tutor_id = auth.uid() or c.student_id = auth.uid()))
  );
create policy "messages_mark_read" on public.messages
  for update to authenticated using (
    exists (select 1 from public.conversations c
      where c.id = conversation_id and (c.tutor_id = auth.uid() or c.student_id = auth.uid()))
  );

-- crea/recupera la conversazione per una coppia (chiamata dallo studente o dal tutor)
create or replace function public.get_or_create_conversation(p_tutor_id uuid, p_student_id uuid)
returns table (id uuid, counterpart_first_name text, counterpart_last_name text, counterpart_avatar_url text)
language plpgsql security definer set search_path = public as $$
declare conv_id uuid; cp uuid;
begin
  if auth.uid() not in (p_tutor_id, p_student_id) then
    raise exception 'non autorizzato';
  end if;
  select c.id into conv_id from public.conversations c
    where c.tutor_id = p_tutor_id and c.student_id = p_student_id;
  if conv_id is null then
    insert into public.conversations (tutor_id, student_id)
      values (p_tutor_id, p_student_id) returning conversations.id into conv_id;
  end if;
  cp := case when auth.uid() = p_tutor_id then p_student_id else p_tutor_id end;
  return query
    select conv_id, p.first_name, p.last_name, p.avatar_url
    from public.profiles p where p.id = cp;
end;
$$;
grant execute on function public.get_or_create_conversation to authenticated;

create or replace function public.my_conversations()
returns table (
  id uuid, counterpart_id uuid, counterpart_first_name text, counterpart_last_name text,
  counterpart_avatar_url text, last_body text, last_at timestamptz, unread bigint
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    case when c.tutor_id = auth.uid() then c.student_id else c.tutor_id end,
    p.first_name, p.last_name, p.avatar_url,
    coalesce(lm.body, ''), coalesce(lm.created_at, c.created_at),
    (select count(*) from public.messages m
      where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.read_at is null)
  from public.conversations c
  join public.profiles p
    on p.id = case when c.tutor_id = auth.uid() then c.student_id else c.tutor_id end
  left join lateral (
    select body, created_at from public.messages m
    where m.conversation_id = c.id order by m.created_at desc limit 1
  ) lm on true
  where c.tutor_id = auth.uid() or c.student_id = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
$$;
grant execute on function public.my_conversations to authenticated;

-- aggiorna last_message_at all'invio
create or replace function public.on_message_sent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
create trigger message_bump_conversation
  after insert on public.messages
  for each row execute function public.on_message_sent();
