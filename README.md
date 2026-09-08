# StudyBuddy

App per le ripetizioni che mette in contatto **studenti** e **tutor** e permette ai
tutor di gestire in autonomia la propria agenda.

> Nome provvisorio. Per cambiarlo modifica `APP_NAME` in
> [`src/constants/app.ts`](src/constants/app.ts) e i campi `name` / `slug` /
> `scheme` in [`app.json`](app.json).

Stack: **Expo (React Native) SDK 57** + **Supabase**. Un solo codice per
iOS, Android e Web (PC).

---

## Prova la demo (nessun setup)

L'app può girare su un **dataset di esempio in memoria**, senza Supabase:

```bash
npm install
npm run demo        # = EXPO_PUBLIC_DEMO_MODE=true expo start
```

Si entra come studente demo già registrato (Sara Conti): ricerca tutor, prenota,
chat, classi di gruppo, notifiche e — passando al profilo tutor demo — disponibilità,
richieste ed emergenze sono già popolate. Le modifiche non vengono salvate.

---

## Cosa c'è (Fasi 1–8, 11–12)

**Fase 1 — accesso, onboarding, profilo**
- Accesso con **email + password**, registrazione, recupero password (deep link).
  I pulsanti social/telefono sono mostrati ma disattivati ("Presto").
- **Onboarding** differenziato studente / tutor (materie, livelli, ambito,
  modalità, titoli di studio con richiesta di verifica).
- **Profilo** completo e sempre modificabile (`Account ▸ Profilo`).
- Tema chiaro/scuro, permessi notifiche, posizione con geocoding.

**Fase 3 — ricerca tutor**
- Dalla Home studente: barra di ricerca e tile materie → schermata **Cerca**.
- Filtri: materia, modalità (tutte / in presenza / online), livello.
- Ricerca **georeferenziata** (raggio ~30 km via PostGIS) usando la posizione del
  profilo o quella attuale; le lezioni online non hanno vincoli di distanza.
- Scheda tutor pubblica: bio, materie, titoli verificati, slot liberi.

**Fase 2 — disponibilità, prenotazioni, portfolio**
- Il **tutor** pubblica slot (giorno, orario, durata, modalità) da
  `Lezioni ▸ Disponibilità`.
- Lo **studente** apre la scheda tutor → **Prenota lezione**: sceglie giorno e
  slot, materia, modalità, messaggio → invia la richiesta.
- Calendario a visibilità differenziata: lo studente vede gli slot come
  *liberi / occupati*, non chi ha prenotato.
- Il **tutor** vede le richieste in `Lezioni ▸ Richieste` e le **accetta o
  rifiuta**. Alla conferma lo studente entra nel **portfolio** (`Lezioni ▸
  Studenti`), da cui il tutor può rimuoverlo.
- Home tutor con contatori (richieste, lezioni in programma, slot liberi).

**F4 — Chat interna**
- Chat 1-a-1 studente↔tutor (Supabase Realtime). Si apre da scheda tutor
  ("Scrivi"), da una lezione o dal tab **Messaggi** (con badge non letti).

**F5 — Classi di gruppo**
- Il tutor crea una classe, aggiunge studenti (anche fuori dal portfolio) e
  pianifica sessioni condivise. `Account ▸ Classi di gruppo` o dalla Home.

**F6 — Lezione d'emergenza**
- Lo studente invia una richiesta fuori programma (materia, note, quando); i suoi
  tutor o tutor esterni propongono un orario; accettando si crea una lezione
  confermata. `Lezioni ▸ Emergenza`.

**F7 — Università (integrata)**
- Onboarding studente universitario: sceglie il **corso di laurea** dal catalogo.
- Ricerca **"Per esame"**: cerca l'insegnamento (con docente) e vede i tutor che
  lo coprono. La scheda tutor mostra gli esami coperti.

**F8 — Notifiche**
- Centro notifiche in-app (icona campana in Account) alimentato da trigger DB su
  richieste, conferme, messaggi, sessioni di gruppo, proposte d'emergenza.
- Push reali: registrazione token `expo-notifications` + Edge Function
  `supabase/functions/notify` (deploy + webhook a cura dell'utente).

**F12 — Pagamenti e fiscalità (integrati)**
- Tariffa oraria sul profilo tutor → prezzo per lezione con **commissione
  piattaforma** mostrata nel riepilogo di prenotazione.
- `Account ▸ Compensi` (tutor): guadagni dell'anno, barra della **soglia €5.000**
  (prestazione occasionale), campo Partita IVA.
- **Gate**: superata la soglia annua, il tutor non può confermare lezioni a
  pagamento finché non inserisce la Partita IVA (enforcement lato DB).
- Incasso/bonifici reali (PSP tipo Stripe Connect): ultimo step, non incluso.

**F11 — Build store**
- `eas.json` incluso. Guida in fondo a questo README.

Roadmap residua: attivazione login social/telefono (F9), pannello admin verifica
titoli (F10), collegamento PSP per i pagamenti reali.

---

## Requisiti

- Node 20+ e npm
- App **Expo Go** sul telefono (iOS/Android) per il test su dispositivo
- Un progetto **Supabase** (piano gratuito) — oppure Docker per Supabase locale

---

## 1. Configura Supabase

### Opzione A — progetto Supabase online (consigliata per testare su telefono)

1. Crea un progetto su <https://supabase.com> (scegli una region europea).
2. In **Project Settings ▸ API** copia `Project URL` e `anon public key`.
3. Copia `.env.example` in `.env` e incolla i valori:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
4. **Schema**: apri il **SQL Editor** di Supabase ed esegui **in ordine** tutti i
   file in `supabase/migrations/` (`0001` → `0007`), poi `supabase/seed.sql` e
   `supabase/seed_university.sql`. In alternativa con Docker/CLI:
   `npx supabase link --project-ref <ref>` → `npx supabase db push`.
   - Se l'ultimo blocco (policy su `storage.objects`) dà `must be owner of table
     objects`: crea i due bucket a mano da **Storage** (`avatars` = *Public*,
     `credentials` = privato) e aggiungi le policy dal pannello Storage ▸ Policies
     copiando le condizioni dallo stesso file. Tutto il resto dello schema è già
     stato creato.
   - L'advisor di Supabase segnalerà `public_profiles` come *security definer
     view* e le funzioni RPC come *security definer*: è voluto (espongono solo
     campi/righe controllati), si può ignorare.
5. In **Authentication ▸ URL Configuration** aggiungi ai *Redirect URLs*:
   `studybuddy://`, `studybuddy://sign-in`, `studybuddy://reset-password`,
   `http://localhost:8081`.
6. (Facoltativo, solo per sviluppo) In **Authentication ▸ Providers ▸ Email**
   disattiva *Confirm email* e imposta `EXPO_PUBLIC_SKIP_EMAIL_CONFIRMATION=true`
   nel `.env` per entrare subito dopo la registrazione senza passare dall'email.

### Opzione B — Supabase locale (Docker)

```bash
npx supabase start           # avvia i container (serve Docker)
npx supabase db reset        # applica migrazioni + seed
```
Poi in `.env` usa i valori stampati da `supabase start`
(`API URL` e `anon key`).

---

## 2. Avvia l'app

```bash
npm install
npx expo start
```

- **Telefono**: apri Expo Go e inquadra il QR code (stessa rete Wi-Fi).
- **PC / browser**: premi `w` nel terminale.
- **Emulatore**: premi `a` (Android) o `i` (iOS, solo macOS).

---

## 3. Percorso di test end-to-end

Servono **due account**: uno tutor, uno studente (con posizioni vicine, es. stessa
città, per la ricerca georeferenziata).

**Account tutor**
1. Registrati → ruolo **Tutor** → profilo (imposta la **posizione**) → titoli →
   ambito/materie/modalità → fine.
2. `Lezioni ▸ Disponibilità`: pubblica 2–3 slot in giorni diversi.
3. (Facoltativo) da **Supabase Studio** imposta `tutor_profiles.verified = true`
   per vedere il badge.

**Account studente**
4. Registrati → ruolo **Studente** → profilo (**posizione** vicina a quella del
   tutor) → studi/materie → fine.
5. Home → barra di ricerca o tile materia → **Cerca**: applica i filtri, controlla
   che il tutor compaia con la **distanza in km**.
6. Apri la scheda del tutor → **Prenota lezione**: scegli giorno e slot, materia,
   messaggio → invia. Lo trovi in `Lezioni ▸ Richieste`.

**Di nuovo come tutor**
7. `Lezioni ▸ Richieste`: **Accetta**. Lo studente entra in `Lezioni ▸ Studenti`;
   lo slot risulta *Confermato* in `Disponibilità`.
8. Come studente: la lezione passa in `Lezioni ▸ Prossime`; lo stesso slot ora
   appare *occupato* agli altri.

**Verifiche su Supabase (Table editor / SQL)**
- righe in `bookings` (status `pending` → `confirmed`), `tutor_availability`,
  `tutor_students`;
- le policy RLS impediscono a un terzo studente di leggere le `bookings` altrui;
- `select * from search_tutors(<lat>, <lng>, 30)` restituisce i tutor con distanza.

---

## Struttura

```
src/
  app/(auth|onboarding)/               # accesso + onboarding
  app/(app)/  home lezioni messaggi account
              + cerca tutor/[id] prenota disponibilita
              + gruppi gruppi/[id] gruppi/nuovo  emergenza  chat/[id]
              + compensi notifiche-centro profilo notifiche preferenze  (href:null)
  app/reset-password.tsx               # deep link studybuddy://reset-password
  components/                          # design system (~34 componenti)
  features/
    auth profile onboarding catalog
    search availability bookings portfolio
    chat groups emergency payments university notifications
  lib/  supabase.ts  demo/  env geo datetime money validation query-client flags
  theme/  types/database.ts
supabase/
  migrations/0001_init.sql              0002_search_booking.sql
             0003_university.sql        0004_groups_emergency.sql
             0005_chat.sql              0006_payments.sql
             0007_notifications.sql
  functions/notify/index.ts             # Edge Function push (F8)
  seed.sql   seed_university.sql
eas.json                                # config build EAS (F11)
```

Le letture cross-utente (ricerca, scheda tutor, calendario visto dallo studente,
prenotazioni, chat, classi, notifiche, emergenze) passano da funzioni Postgres
**SECURITY DEFINER**. La RLS sulle tabelle resta "solo la propria riga". Ogni
nuova RPC va aggiunta anche in `src/lib/demo/rpc.ts` per funzionare in demo.

## Notifiche push (F8) — passi lato Supabase

1. `npx supabase functions deploy notify`
2. Dashboard → **Database → Webhooks**: nuovo webhook su `INSERT` di
   `public.notifications` che chiama la funzione `notify` (header
   `Authorization: Bearer <service_role_key>`).
3. Su un build EAS (non Expo Go) l'app registra il push token in `push_tokens`.

## Pubblicazione sugli store (F11)

```bash
npm i -g eas-cli          # oppure npx eas-cli
npx eas login
npx eas build:configure   # crea il progetto EAS, aggiorna app.json con projectId
npx eas build -p android --profile production
npx eas build -p ios --profile production      # richiede account Apple Developer
npx eas submit -p android --latest             # richiede service account Google Play
npx eas submit -p ios --latest
```

Prima del primo build: sostituire le icone/splash in `assets/images/`, e in
`app.json` verificare `ios.bundleIdentifier` / `android.package`.

## Verifica account (lato sviluppatori)

I titoli di studio dei tutor finiscono in `tutor_credentials` con
`verification_status = 'requested'`. Finché non c'è un pannello admin dedicato, la
verifica si fa da **Supabase Studio**: rivedere i dati e impostare
`verification_status = 'verified'` (+ `tutor_profiles.verified = true`). Il
`service_role` bypassa la RLS, quindi tutti i dati sono ispezionabili dal team.

## Note

- Icone app / splash sono ancora quelle di default di Expo: sostituire i file in
  `assets/images/` prima della pubblicazione.
- Deep link: lo `scheme` è `studybuddy` (vedi `app.json`).
