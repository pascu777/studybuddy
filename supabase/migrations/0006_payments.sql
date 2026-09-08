-- StudyBuddy — F12: pagamenti e fiscalità integrati.
-- Prezzo per lezione = tariffa oraria del tutor pro-rata sulla durata.
-- Commissione di piattaforma trattenuta su ogni lezione.
-- Gate: superata la soglia annua (prestazione occasionale) il tutor non può
-- confermare lezioni a pagamento senza Partita IVA.

create table public.platform_settings (
  id text primary key default 'default',
  commission_rate numeric not null default 0.10,
  occasional_limit_cents int not null default 500000,
  currency text not null default 'EUR'
);
insert into public.platform_settings (id) values ('default') on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
create policy "platform_settings_read" on public.platform_settings
  for select to authenticated using (true);

alter table public.bookings add column price_cents int not null default 0;
alter table public.bookings add column commission_cents int not null default 0;

create table public.tutor_earnings (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  gross_cents int not null,
  commission_cents int not null,
  net_cents int not null,
  occurred_at timestamptz not null default now()
);
create index tutor_earnings_tutor_idx on public.tutor_earnings (tutor_id, occurred_at);

alter table public.tutor_earnings enable row level security;
create policy "tutor_earnings_owner_read" on public.tutor_earnings
  for select to authenticated using (auth.uid() = tutor_id);

-- Gate soglia + registrazione compenso alla conferma.
create or replace function public.on_booking_paid_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg public.platform_settings;
  ytd int;
  has_vat boolean;
begin
  if new.status = 'confirmed' and new.status is distinct from old.status then
    select * into cfg from public.platform_settings where id = 'default';

    if coalesce(new.price_cents, 0) > 0 then
      select coalesce(sum(gross_cents), 0) into ytd
        from public.tutor_earnings
        where tutor_id = new.tutor_id
          and date_trunc('year', occurred_at) = date_trunc('year', now());

      select (partita_iva is not null and partita_iva <> '') into has_vat
        from public.tutor_profiles where profile_id = new.tutor_id;

      if ytd + new.price_cents > cfg.occasional_limit_cents and not coalesce(has_vat, false) then
        raise exception 'Soglia annua prestazione occasionale superata: inserisci la Partita IVA nel profilo per confermare lezioni a pagamento.'
          using errcode = 'P0001';
      end if;

      insert into public.tutor_earnings (tutor_id, booking_id, gross_cents, commission_cents, net_cents)
      values (
        new.tutor_id, new.id, new.price_cents, new.commission_cents,
        new.price_cents - new.commission_cents
      );
    end if;
  end if;
  return new;
end;
$$;
create trigger booking_paid_confirmed
  before update on public.bookings
  for each row execute function public.on_booking_paid_confirmed();

create or replace function public.platform_config()
returns table (commission_rate numeric, occasional_limit_cents int, currency text)
language sql stable security definer set search_path = public as $$
  select commission_rate, occasional_limit_cents, currency from public.platform_settings where id = 'default';
$$;
grant execute on function public.platform_config to authenticated;

create or replace function public.tutor_earnings_summary()
returns table (
  ytd_gross_cents bigint, ytd_net_cents bigint, lessons_count bigint,
  commission_rate numeric, limit_cents int, over_threshold boolean,
  has_vat boolean, fiscal_regime fiscal_regime
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(e.gross_cents), 0),
    coalesce(sum(e.net_cents), 0),
    count(e.id),
    (select commission_rate from public.platform_settings where id = 'default'),
    (select occasional_limit_cents from public.platform_settings where id = 'default'),
    coalesce(sum(e.gross_cents), 0) >= (select occasional_limit_cents from public.platform_settings where id = 'default'),
    (select partita_iva is not null and partita_iva <> '' from public.tutor_profiles where profile_id = auth.uid()),
    (select fiscal_regime from public.tutor_profiles where profile_id = auth.uid())
  from public.tutor_earnings e
  where e.tutor_id = auth.uid()
    and date_trunc('year', e.occurred_at) = date_trunc('year', now());
$$;
grant execute on function public.tutor_earnings_summary to authenticated;
