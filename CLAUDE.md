# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**StudyBuddy** (provisional name) — a tutoring marketplace app: students find tutors, tutors manage their own agenda. Expo (React Native) + Supabase, one codebase for iOS / Android / Web.

**Fasi 1–8, 11–12** are built. F1 auth+onboarding+profile; F2 availability/booking/portfolio; F3 tutor search (radius/subject/level); F4 chat (Realtime); F5 group classes; F6 emergency lessons; F7 university mode woven in (catalog `universities→degree_courses→courses→professors`, "search by exam"); F8 in-app notification centre + DB triggers + push-token registration + Edge Function `supabase/functions/notify`; F12 payments woven in (tutor hourly rate → per-booking price + platform commission, `tutor_earnings` ledger, €5000 threshold gate enforced in a DB trigger, `Compensi` screen); F11 `eas.json` + guide. Roadmap: F9 (activate social/phone login), F10 (admin verification panel), real PSP for payouts. Plan file: `C:\Users\Utente\.claude\plans\voglio-che-tu-sviluppi-fuzzy-lamport.md`. UI copy and user communication are in **Italian**.

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
Without Docker: paste `supabase/migrations/0001_init.sql` then `supabase/seed.sql` into the Supabase SQL Editor.

## Architecture

### Provider tree & startup (`src/app/_layout.tsx`)
`GestureHandlerRootView → SafeAreaProvider → QueryClientProvider → ThemeProvider → SessionProvider → Stack`. Fonts (Bricolage Grotesque + Inter) load here; the layout renders `null` until they're ready while the native splash is held.

### Routing is a redirect gate, not a normal nav tree
`src/app/index.tsx` is the hub: it reads `useSession()` + `useProfile()` and `<Redirect>`s to `(auth)`, `(onboarding)`, or `(app)`. Each group's `_layout.tsx` re-checks the same conditions so a route is never reachable in the wrong state. Onboarding resume point is computed by `nextOnboardingStep(full)` in `src/features/onboarding/steps.ts` from what's already saved in the DB (the tutor `credentials` step upserts an empty `tutor_profiles` row purely to mark progress).

Route groups: `(auth)`, `(onboarding)` (+ `tutor/`, `student/` subfolders), `(app)` (a `Tabs` navigator; `profilo` / `notifiche` / `preferenze` are non-tab screens hidden with `href: null`). `src/app/reset-password.tsx` sits at the **root**, outside `(auth)`, so it stays reachable when Supabase creates a recovery session. Deep-link scheme is `studybuddy` (`app.json` + `APP_SCHEME` must stay in sync).

### Data layer
`src/features/<domain>/hooks.ts` wrap the Supabase client in TanStack Query hooks. **The Supabase client (`src/lib/supabase.ts`) is intentionally untyped** — `createClient()` with no `<Database>` generic — because the hand-written `Database` type didn't satisfy supabase-js's constraint and made every query resolve to `never`. Row types live in `src/types/database.ts` and are applied manually in the hooks (explicit return types, occasional casts).

**Cross-user reads go through `SECURITY DEFINER` Postgres functions, never direct table selects.** RLS on every table is "own row only", so anything that shows another user's data (search results, a tutor's public profile, the student-facing calendar, enriched bookings with the counterpart's name) is an RPC in `0002_search_booking.sql`: `search_tutors`, `get_tutor`, `get_tutor_slots`, `my_bookings`, `my_students`, `my_tutors`. Call them with `supabase.rpc('name', { p_... })`. When you need a new cross-user view, add an RPC — don't loosen a table policy. Direct table writes stay RLS-guarded (student inserts its own `bookings` as `pending`; tutor updates its own rows; a partial unique index blocks double-booking a slot; a trigger adds the student to `tutor_students` on confirm).

- `useProfile()` returns an aggregate `{ profile, tutorProfile, studentProfile }`; query key `['profile', userId]`. Most mutations invalidate that key.
- `SessionProvider` (`src/features/auth/session-provider.tsx`) subscribes to `supabase.auth.onAuthStateChange`; `useSession()` exposes `{ session, userId, initializing }`.
- Sign-up passes `first_name` / `last_name` in `options.data`; a Postgres trigger (`handle_new_user`) creates the `profiles` row — the client never inserts it.
- Subject picking is shared: `src/features/catalog/SubjectPicker.tsx` + `useSubjects(ctx)` (filters the `subjects` catalog by school context); level labels in `src/features/catalog/levels.ts`.

### Design system (`src/components/`, barrel `index.ts`)
Hand-built, plain `StyleSheet` — no NativeWind / UI kit. Every component reads `useTheme()` from `src/theme/theme-provider.tsx`; all colors/spacing/type come from `src/theme/tokens.ts` (`palette`, `lightTheme`/`darkTheme`, `radius`, `spacing`, `typeScale`, `fontFamily`, `accents`). `ThemeProvider` persists a `system | light | dark` preference in AsyncStorage; `useTheme()` → palette only, `useAppTheme()` → palette + `setPreference`.

### Gotchas
- **React Compiler is on** (`app.json` `experiments.reactCompiler` + `babel.config.js`). Don't mutate state/props during render; reanimated shared values and refs are fine.
- **`lucide-react-native` v1.43 has no brand icons** (`Instagram`, `Google`, etc. don't exist). Import icons as PascalCase named exports.
- Social / phone login is deliberately **rendered but disabled** — gated by `src/lib/flags.ts` (`socialAuthEnabled`, `phoneAuthEnabled`). `SocialButtons` shows a "Presto" badge. `Lezioni` / `Messaggi` tabs are `EmptyState` placeholders.
- App identity (name, tagline, scheme, income threshold) is centralized in `src/constants/app.ts` — the name is provisional; change it there and in `app.json`.
- `@/*` path alias → `src/*` (works in Metro via Expo's tsconfig-paths support).
- Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SKIP_EMAIL_CONFIRMATION` (`src/lib/env.ts`; template `.env.example`). App runs without them but every Supabase call fails.

### Database (`supabase/migrations/0001_init.sql`)
Tables are already modeled for the full product vision. RLS everywhere = **own-row access only** (`auth.uid()` checks); `public_profiles` is a definer view exposing non-sensitive columns for future search. `tutor_credentials.verification_status` can't be set to `verified` from the client (RLS `with check`) — verification is a service-role / admin action. Storage buckets: `avatars` (public), `credentials` (private); objects are stored under a `{auth.uid()}/` folder and policies enforce that prefix. `subjects` is reference data from `seed.sql`.
