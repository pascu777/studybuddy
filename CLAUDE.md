# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**StudyBuddy** (provisional name) — a tutoring marketplace app: students find tutors, tutors manage their own agenda. Expo (React Native) + Supabase, one codebase for iOS / Android / Web.

**Fasi 1–8, 10–12** are built. F1 auth+onboarding+profile; F2 availability/booking/portfolio; F3 tutor search (radius/subject/level); F4 chat (Realtime); F5 group classes; F6 emergency lessons; F7 university mode woven in (catalog `universities→degree_courses→courses→professors`, "search by exam"); F8 in-app notification centre + DB triggers + push-token registration + Edge Function `supabase/functions/notify`; F10 admin panel — route group `src/app/(admin)/` (dashboard + credential verification queue + user list), gated on `profiles.is_admin`, reads via `SECURITY DEFINER` RPCs `admin_overview` / `admin_pending_credentials` / `admin_list_users` and writes via `admin_review_credential` / `admin_set_tutor_verified` (migration `0008_admin.sql`); F12 payments woven in (tutor hourly rate → per-booking price + platform commission, `tutor_earnings` ledger, €5000 threshold gate enforced in a DB trigger, `Compensi` screen); F11 `eas.json` + guide. Roadmap: F9 (activate social/phone login — needs OAuth provider config), real PSP for payouts. Plan file: `C:\Users\Utente\.claude\plans\voglio-che-tu-sviluppi-fuzzy-lamport.md`. UI copy and user communication are in **Italian**.

**Demo mode**: `EXPO_PUBLIC_DEMO_MODE=true` (`npm run demo`) swaps `supabase` for an in-memory fake (`src/lib/demo/`) — a mini query-builder + `rpc` switch + fake auth/storage/realtime over `dataset.ts`. Every new hook must stay within the supported client surface (`.from().select/insert/update/upsert/delete().eq/neq/in/gte/lte/is/order/limit().maybeSingle/single()`, `.rpc()`), and every new RPC needs a matching `case` in `src/lib/demo/rpc.ts` or it returns `[]` in demo.

## Commands

```bash
npm install
npx expo start                 # dev server — 'w' web, 'a' Android, 'i' iOS, QR for Expo Go
npx tsc --noEmit -p tsconfig.json   # typecheck (primary correctness gate — run after changes)
npm run lint                   # expo lint (ESLint)
npx expo export -p web --output-dir <dir>   # full bundle check without a device
npx expo-doctor                # config / dependency sanity
npx expo install <pkg>         # add deps (picks SDK-compatible versions; use instead of npm install <pkg>)
```

There is **no test runner** configured.

Database (needs Docker for local, or a linked project):
```bash
npx supabase db push           # apply supabase/migrations to a linked project
npx supabase start && npx supabase db reset   # local stack + migrations + seed
```
Without Docker: in the Supabase SQL Editor run, in order, every file in
`supabase/migrations/` (`0001` → `0009`), then `supabase/seed.sql` and
`supabase/seed_university.sql`. Push notifications: `npx supabase functions deploy notify`.

**Live backend** (provisioned 2026-09-10): Supabase project `studybuddy` — ref `xiejfbriamiwkhtmaysp`, region `eu-central-1`, org `pascu777's Org`, free tier. All migrations `0001`–`0009` applied (remote history also has a `0010_fix_admin_overview_ambiguous` that is already folded into the repo's `0008`), both seed files loaded, `notify` Edge Function deployed. Credentials are in `.env` (git-ignored). Test accounts (password `studybuddy`, email confirmation pre-set): `admin@studybuddy.app` (is_admin), `sara@studybuddy.app` (student), `alessandro@studybuddy.app` (tutor, verified), `chiara@studybuddy.app` (tutor, unverified, credential pending). Still TODO on the backend: a DB Webhook on `notifications` INSERT → the `notify` function; enable leaked-password protection; the `auth_rls_initplan` advisor (wrap `auth.uid()` as `(select auth.uid())` in ~40 policies) if scaling.

`npm start` / `npx expo start` now runs against this live project. `npm run demo` still runs the app with no backend at all (see Demo mode above).

## Architecture

### Provider tree & startup (`src/app/_layout.tsx`)
`GestureHandlerRootView → SafeAreaProvider → QueryClientProvider → ThemeProvider → SessionProvider → Stack`. Fonts (Bricolage Grotesque + Inter) load here; the layout renders `null` until they're ready while the native splash is held.

### Routing is a redirect gate, not a normal nav tree
`src/app/index.tsx` is the hub: it reads `useSession()` + `useProfile()` and `<Redirect>`s to `(auth)`, `(onboarding)`, `(admin)` (when `profile.is_admin`, checked *before* the onboarding gate), or `(app)`. Each group's `_layout.tsx` re-checks the same conditions so a route is never reachable in the wrong state. Onboarding resume point is computed by `nextOnboardingStep(full)` in `src/features/onboarding/steps.ts` from what's already saved in the DB (the tutor `credentials` step upserts an empty `tutor_profiles` row purely to mark progress).

Route groups: `(auth)`, `(onboarding)` (+ `tutor/`, `student/` subfolders), `(app)` (a `Tabs` navigator; `profilo` / `notifiche` / `preferenze` are non-tab screens hidden with `href: null`), `(admin)` (a plain `Stack`: `index` dashboard, `verifiche`, `utenti` — `_layout.tsx` redirects non-admins to `/`; route strings are cast to `Href` in `src/features/admin/routes.ts` since typed-routes don't regenerate on `expo export`). `src/app/reset-password.tsx` sits at the **root**, outside `(auth)`, so it stays reachable when Supabase creates a recovery session. Deep-link scheme is `studybuddy` (`app.json` + `APP_SCHEME` must stay in sync).

### Data layer
`src/features/<domain>/hooks.ts` wrap the Supabase client in TanStack Query hooks. **The Supabase client (`src/lib/supabase.ts`) is intentionally untyped** — `createClient()` with no `<Database>` generic — because the hand-written `Database` type didn't satisfy supabase-js's constraint and made every query resolve to `never`. Row types live in `src/types/database.ts` and are applied manually in the hooks (explicit return types, occasional casts).

**Cross-user reads go through `SECURITY DEFINER` Postgres functions, never direct table selects.** RLS on every table is "own row only", so anything that shows another user's data (search results, a tutor's public profile, the student-facing calendar, enriched bookings, conversations, group details, open emergencies, notifications) is an RPC — defined across `0002`–`0008` (`search_tutors`, `get_tutor`, `get_tutor_slots`, `my_bookings`, `my_students`, `my_tutors`, `search_courses`, `search_tutors_by_course`, `list_degree_courses`, `my_conversations`, `get_or_create_conversation`, `my_groups`, `group_detail`, `open_emergencies`, `my_emergencies`, `my_notifications`, `mark_notifications_read`, `tutor_earnings_summary`, `platform_config`, and the admin-only `admin_overview` / `admin_pending_credentials` / `admin_list_users` / `admin_review_credential` / `admin_set_tutor_verified`, each of which `raise`s `42501` unless `is_admin()`). Call them with `supabase.rpc('name', { p_... })`. **When you add a new cross-user view: add an RPC (don't loosen a table policy) AND add a matching `case` to `src/lib/demo/rpc.ts`** or it returns `[]` in demo mode.

Direct table writes stay RLS-guarded (student inserts its own `bookings` as `pending`; tutor updates its own rows; a partial unique index blocks double-booking a slot; triggers fire on state changes: `tutor_students` portfolio insert on confirm, notification rows on booking/message/session/offer events, and `on_booking_paid_confirmed` which **raises an exception** if a tutor over the €5000 YTD threshold confirms a paid booking without a `partita_iva` — callers must surface that error, see `doRespond` in `lezioni.tsx`).

- One feature module per domain under `src/features/`: `auth`, `profile`, `onboarding`, `catalog`, `search`, `availability`, `bookings`, `portfolio`, `chat`, `groups`, `emergency`, `payments`, `university`, `notifications`, `admin`.
- `useProfile()` returns an aggregate `{ profile, tutorProfile, studentProfile }`; query key `['profile', userId]`. Most mutations invalidate that key.
- `SessionProvider` (`src/features/auth/session-provider.tsx`) subscribes to `supabase.auth.onAuthStateChange`; `useSession()` exposes `{ session, userId, initializing }`.
- Sign-up passes `first_name` / `last_name` in `options.data`; a Postgres trigger (`handle_new_user`) creates the `profiles` row — the client never inserts it.
- Subject picking is shared: `src/features/catalog/SubjectPicker.tsx` + `useSubjects(ctx)` (filters the `subjects` catalog by school context); level labels in `src/features/catalog/levels.ts`.
- Role-aware screens (`home`, `lezioni`, `emergenza`) branch on `full.profile.role` and render a `StudentX` / `TutorX` subcomponent. Screens reachable only via navigation (not tabs) are registered in `(app)/_layout.tsx` with `href: null`.
- Booking price is computed client-side in `prenota.tsx` from `get_tutor`'s `hourly_rate_cents` × slot minutes and `platform_config().commission_rate`, then passed to `useCreateBooking`; `src/lib/money.ts` has the helpers.

### Design system (`src/components/`, barrel `index.ts`)
Hand-built, plain `StyleSheet` — no NativeWind / UI kit. Every component reads `useTheme()` from `src/theme/theme-provider.tsx`; all colors/spacing/type come from `src/theme/tokens.ts` (`palette`, `lightTheme`/`darkTheme`, `radius`, `spacing`, `typeScale`, `fontFamily`, `accents`). `ThemeProvider` persists a `system | light | dark` preference in AsyncStorage; `useTheme()` → palette only, `useAppTheme()` → palette + `setPreference`.

### Gotchas
- **React Compiler is on** (`app.json` `experiments.reactCompiler` + `babel.config.js`). Don't mutate state/props during render; reanimated shared values and refs are fine.
- **`lucide-react-native` v1.43 has no brand icons** (`Instagram`, `Google`, etc. don't exist). Import icons as PascalCase named exports.
- Social / phone login is deliberately **rendered but disabled** — gated by `src/lib/flags.ts` (`socialAuthEnabled`, `phoneAuthEnabled`); `SocialButtons` shows a "Presto" badge. (The `Lezioni` / `Messaggi` tabs are now fully built — F2/F4 — not placeholders.)
- App identity (name, tagline, scheme, income threshold) is centralized in `src/constants/app.ts` — the name is provisional; change it there and in `app.json`.
- `@/*` path alias → `src/*` (works in Metro via Expo's tsconfig-paths support).
- Env vars (`src/lib/env.ts`; template `.env.example`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SKIP_EMAIL_CONFIRMATION`, `EXPO_PUBLIC_DEMO_MODE`. Outside demo mode the app runs without the Supabase vars but every call fails.
- Adding new routes: expo-router's typed-route union (`.expo/types/router.d.ts`) only regenerates on `expo start`, not `expo export` — after adding a screen, `tsc` will flag `router.push('/(app)/newroute')` until you've run `expo start` once.
- `supabase/functions/notify/` is a Deno Edge Function — excluded from the app `tsconfig` (`exclude: ["supabase/functions"]`); don't expect it to typecheck with the RN toolchain.

### Database (`supabase/migrations/`, `0001`–`0009`)
`0001` base (profiles/tutor/student/subjects/credentials + storage), `0002` availability/bookings/portfolio + search RPCs, `0003` university catalog + `tutor_rates`, `0004` groups + emergency, `0005` chat, `0006` payments (`platform_settings`, `tutor_earnings`, booking `price_cents`/`commission_cents`, threshold trigger), `0007` notifications + push tokens + event triggers, `0008` admin (`profiles.is_admin` + `protect_admin_flag` BEFORE-UPDATE trigger that silently reverts client writes to the flag, `is_admin()` helper, `admin_*` RPCs), `0009` hardening (`revoke execute` on the trigger/internal functions — esp. `notify()` — so they aren't callable via `/rest/v1/rpc`). Migrations run in order; `0003` must `drop function public.get_tutor(uuid)` before redefining it (its return columns change vs `0002` — `create or replace` alone errors).

RLS everywhere = **own-row access only** (`auth.uid()` checks). `public_profiles` is a definer view of non-sensitive columns. `tutor_credentials.verification_status` can't be set to `verified` from the client (RLS `with check`) — verification is a service-role / admin action: the in-app F10 admin panel (or Supabase Studio). `profiles.is_admin` is likewise only settable by the service role — grant it in the SQL editor: `update public.profiles set is_admin = true where id = '<uuid>';`. Storage buckets `avatars` (public) / `credentials` (private) store objects under `{auth.uid()}/…` and policies enforce that prefix. `subjects` and the university catalog are reference data from the two `seed*.sql` files.

### Git
Local repo, branch `master`, initial commit only, **no remote configured** — a GitHub repo/push is still pending (the machine has cached GCM credentials for `git` but no `gh` CLI). Local git identity is set repo-scoped.
