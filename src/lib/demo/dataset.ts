/**
 * Dataset della modalità demo (in memoria). Popola l'app senza backend.
 * Gli id sono stringhe fisse per referenziarli facilmente tra tabelle.
 */
import { APP_NAME } from '@/constants/app';

const now = Date.now();
const iso = (offsetMinutes: number) => new Date(now + offsetMinutes * 60_000).toISOString();
const day = (d: number, h: number) => {
  const x = new Date(now);
  x.setDate(x.getDate() + d);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};

export const DEMO_STUDENT_ID = 'demo-student-1';
export const DEMO_TUTOR_ID = 'demo-tutor-self';
export const DEMO_ADMIN_ID = 'demo-admin-1';

export type DemoStore = {
  profiles: any[];
  tutor_profiles: any[];
  student_profiles: any[];
  tutor_credentials: any[];
  subjects: any[];
  tutor_subjects: any[];
  student_subjects: any[];
  tutor_availability: any[];
  bookings: any[];
  tutor_students: any[];
  universities: any[];
  degree_courses: any[];
  courses: any[];
  professors: any[];
  tutor_courses: any[];
  student_courses: any[];
  conversations: any[];
  messages: any[];
  study_groups: any[];
  group_members: any[];
  group_sessions: any[];
  emergency_requests: any[];
  emergency_offers: any[];
  platform_settings: any[];
  tutor_rates: any[];
  tutor_earnings: any[];
  notifications: any[];
  push_tokens: any[];
};

const SUBJECTS = [
  ['matematica', 'Matematica', 'STEM', 'sky'],
  ['fisica', 'Fisica', 'STEM', 'sky'],
  ['chimica', 'Chimica', 'STEM', 'sky'],
  ['informatica', 'Informatica', 'STEM', 'sky'],
  ['analisi-matematica', 'Analisi Matematica', 'STEM', 'sky'],
  ['inglese', 'Inglese', 'Lingue', 'peach'],
  ['latino', 'Latino', 'Lingue', 'peach'],
  ['italiano', 'Italiano', 'Umanistiche', 'lavender'],
  ['storia', 'Storia', 'Umanistiche', 'lavender'],
  ['economia-politica', 'Economia Politica', 'Economia e Diritto', 'mint'],
];

const tutorNames: [string, string, string, string, boolean, string][] = [
  ['demo-tutor-1', 'Alessandro', 'Rossi', 'Torino, TO', true, 'Ingegnere, 6 anni di ripetizioni universitarie. Lezioni pratiche, molti esercizi.'],
  ['demo-tutor-2', 'Chiara', 'Serra', 'Torino, TO', false, 'Laureanda in Matematica, disponibile anche nei weekend.'],
  ['demo-tutor-3', 'Marco', 'Bianchi', 'Moncalieri, TO', true, 'Dottorando in Fisica. Preparo esami universitari di analisi e fisica.'],
  ['demo-tutor-4', 'Giulia', 'De Luca', 'Torino, TO', true, 'Laureata in Lettere. Latino, italiano e storia per l\'università.'],
  ['demo-tutor-5', 'Paolo', 'Greco', 'Rivoli, TO', false, 'Sviluppatore software. Informatica e programmazione, anche solo online.'],
];

export function buildDemoStore(): DemoStore {
  const profiles: any[] = [];
  const tutor_profiles: any[] = [];
  const tutor_subjects: any[] = [];
  const tutor_availability: any[] = [];
  const tutor_rates: any[] = [];

  // studente demo (loggato)
  profiles.push({
    id: DEMO_STUDENT_ID,
    first_name: 'Sara',
    last_name: 'Conti',
    avatar_url: null,
    role: 'student',
    location_label: 'Torino, TO',
    location_lat: 45.0703,
    location_lng: 7.6869,
    location_geog: null,
    school_context: 'university',
    onboarding_completed_at: iso(-6000),
    is_admin: false,
    created_at: iso(-6000),
    updated_at: iso(-6000),
  });

  // admin demo (accessibile da Account → "Apri pannello admin")
  profiles.push({
    id: DEMO_ADMIN_ID,
    first_name: 'Admin',
    last_name: 'StudyBuddy',
    avatar_url: null,
    role: 'student',
    location_label: 'Torino, TO',
    location_lat: 45.0703,
    location_lng: 7.6869,
    location_geog: null,
    school_context: 'university',
    onboarding_completed_at: iso(-9000),
    is_admin: true,
    created_at: iso(-9000),
    updated_at: iso(-9000),
  });
  const student_profiles = [
    {
      profile_id: DEMO_ADMIN_ID,
      school_type: 'university',
      school_name: '',
      university_name: '',
      degree_course: '',
      created_at: iso(-9000),
      updated_at: iso(-9000),
    },
    {
      profile_id: DEMO_STUDENT_ID,
      school_type: 'university',
      school_name: '',
      university_name: 'Università di Torino',
      degree_course: 'Matematica',
      created_at: iso(-6000),
      updated_at: iso(-6000),
    },
  ];
  const student_subjects = [
    { id: 'ss1', student_id: DEMO_STUDENT_ID, subject_id: 'matematica', school_context: 'university', level: 3, created_at: iso(-6000) },
    { id: 'ss2', student_id: DEMO_STUDENT_ID, subject_id: 'fisica', school_context: 'university', level: 3, created_at: iso(-6000) },
  ];

  // "me" come tutor (per passare al ruolo tutor in demo) — non elencato nella ricerca
  profiles.push({
    id: DEMO_TUTOR_ID,
    first_name: 'Sara',
    last_name: 'Conti',
    avatar_url: null,
    role: 'tutor',
    location_label: 'Torino, TO',
    location_lat: 45.0703,
    location_lng: 7.6869,
    location_geog: null,
    school_context: null,
    onboarding_completed_at: iso(-5000),
    is_admin: false,
    created_at: iso(-5000),
    updated_at: iso(-5000),
  });
  tutor_profiles.push({
    profile_id: DEMO_TUTOR_ID,
    bio: 'Profilo tutor di prova.',
    university_name: 'Università di Torino',
    degree_course: 'Matematica',
    teaches_high_school: false,
    teaches_university: true,
    delivery_in_person: true,
    delivery_online: true,
    verified: false,
    accepting_students: true,
    fiscal_regime: 'occasional',
    partita_iva: null,
    created_at: iso(-5000),
    updated_at: iso(-5000),
  });
  tutor_rates.push({ tutor_id: DEMO_TUTOR_ID, hourly_rate_cents: 1800, currency: 'EUR', updated_at: iso(-5000) });

  // slot pubblicati dal tutor-self (per la demo lato tutor)
  [1, 2, 4].forEach((d, k) => {
    tutor_availability.push({
      id: `self-slot${k}`,
      tutor_id: DEMO_TUTOR_ID,
      starts_at: day(d, 16 + k),
      ends_at: day(d, 17 + k),
      mode: k === 1 ? 'in_person' : 'both',
      note: '',
      created_at: iso(-1200),
    });
  });

  tutorNames.forEach(([id, fn, ln, loc, verified, bio], i) => {
    const lat = 45.0703 + (i - 2) * 0.02;
    const lng = 7.6869 + (i - 2) * 0.02;
    profiles.push({
      id,
      first_name: fn,
      last_name: ln,
      avatar_url: null,
      role: 'tutor',
      location_label: loc,
      location_lat: lat,
      location_lng: lng,
      location_geog: null,
      school_context: null,
      onboarding_completed_at: iso(-9000 + i * 100),
      is_admin: false,
      created_at: iso(-9000),
      updated_at: iso(-9000),
    });
    tutor_profiles.push({
      profile_id: id,
      bio,
      university_name: i % 2 ? 'Politecnico di Torino' : 'Università di Torino',
      degree_course: ['Ingegneria Informatica', 'Matematica', 'Fisica', 'Lettere', 'Informatica'][i],
      teaches_high_school: false,
      teaches_university: true,
      delivery_in_person: id !== 'demo-tutor-5',
      delivery_online: true,
      verified,
      accepting_students: true,
      fiscal_regime: i === 0 ? 'vat' : 'occasional',
      partita_iva: i === 0 ? 'IT01234567890' : null,
      created_at: iso(-9000),
      updated_at: iso(-9000),
    });
    tutor_rates.push({ tutor_id: id, hourly_rate_cents: 1500 + i * 300, currency: 'EUR', updated_at: iso(-9000) });

    const subs = [
      ['matematica', 'fisica', 'analisi-matematica'],
      ['matematica'],
      ['fisica', 'matematica'],
      ['latino', 'italiano', 'storia'],
      ['informatica'],
    ][i];
    subs.forEach((sid, k) => {
      tutor_subjects.push({
        id: `${id}-tsu${k}`,
        tutor_id: id,
        subject_id: sid,
        school_context: 'university',
        level_from: 1,
        level_to: 5,
        created_at: iso(-9000),
      });
    });

    // 3 slot per tutor su giorni diversi
    [1, 3, 5].forEach((d, k) => {
      tutor_availability.push({
        id: `${id}-slot${k}`,
        tutor_id: id,
        starts_at: day(d, 15 + k),
        ends_at: day(d, 16 + k),
        mode: k === 0 ? 'both' : k === 1 ? 'online' : 'in_person',
        note: '',
        created_at: iso(-4000),
      });
    });
  });

  const tutor_credentials = [
    {
      id: 'cred1',
      tutor_id: 'demo-tutor-1',
      title: 'Laurea in Ingegneria Informatica',
      institution: 'Università di Pisa',
      year: 2019,
      document_url: null,
      verification_status: 'verified',
      requested_at: iso(-8000),
      reviewed_at: iso(-7000),
      reviewer_note: '',
      created_at: iso(-8000),
      updated_at: iso(-7000),
    },
    {
      id: 'cred2',
      tutor_id: DEMO_TUTOR_ID,
      title: 'Laurea in Matematica',
      institution: 'Università di Torino',
      year: 2020,
      document_url: null,
      verification_status: 'requested',
      requested_at: iso(-1000),
      reviewed_at: null,
      reviewer_note: '',
      created_at: iso(-1000),
      updated_at: iso(-1000),
    },
    {
      id: 'cred3',
      tutor_id: 'demo-tutor-2',
      title: 'Laurea triennale in Matematica',
      institution: 'Università di Torino',
      year: 2023,
      document_url: 'certificato_laurea.pdf',
      verification_status: 'requested',
      requested_at: iso(-2600),
      reviewed_at: null,
      reviewer_note: '',
      created_at: iso(-2600),
      updated_at: iso(-2600),
    },
    {
      id: 'cred4',
      tutor_id: 'demo-tutor-5',
      title: 'Certificazione sviluppo software',
      institution: 'Politecnico di Torino',
      year: 2021,
      document_url: null,
      verification_status: 'requested',
      requested_at: iso(-400),
      reviewed_at: null,
      reviewer_note: '',
      created_at: iso(-400),
      updated_at: iso(-400),
    },
  ];

  // una prenotazione confermata + una richiesta in attesa (studente demo → tutor 1 / tutor 3)
  const bookings = [
    {
      id: 'bk1',
      slot_id: 'demo-tutor-1-slot0',
      tutor_id: 'demo-tutor-1',
      student_id: DEMO_STUDENT_ID,
      subject_id: 'matematica',
      starts_at: day(1, 15),
      ends_at: day(1, 16),
      mode: 'online',
      status: 'confirmed',
      is_emergency: false,
      message: 'Vorrei ripassare i limiti.',
      tutor_note: '',
      price_cents: 1500,
      commission_cents: 150,
      created_at: iso(-2000),
      updated_at: iso(-1500),
    },
    {
      id: 'bk2',
      slot_id: 'demo-tutor-3-slot1',
      tutor_id: 'demo-tutor-3',
      student_id: DEMO_STUDENT_ID,
      subject_id: 'fisica',
      starts_at: day(3, 16),
      ends_at: day(3, 17),
      mode: 'online',
      status: 'pending',
      is_emergency: false,
      message: 'Preparazione verifica di cinematica.',
      tutor_note: '',
      price_cents: 2100,
      commission_cents: 210,
      created_at: iso(-200),
      updated_at: iso(-200),
    },
  ];
  // richieste/lezioni verso il tutor-self (demo lato tutor)
  bookings.push(
    {
      id: 'bk-self-1',
      slot_id: 'self-slot0',
      tutor_id: DEMO_TUTOR_ID,
      student_id: 'demo-student-2',
      subject_id: 'matematica',
      starts_at: day(1, 16),
      ends_at: day(1, 17),
      mode: 'online',
      status: 'pending',
      is_emergency: false,
      message: 'Vorrei ripassare le derivate prima del compito.',
      tutor_note: '',
      price_cents: 1800,
      commission_cents: 180,
      created_at: iso(-120),
      updated_at: iso(-120),
    },
    {
      id: 'bk-self-2',
      slot_id: 'self-slot1',
      tutor_id: DEMO_TUTOR_ID,
      student_id: 'demo-student-2',
      subject_id: 'fisica',
      starts_at: day(2, 17),
      ends_at: day(2, 18),
      mode: 'in_person',
      status: 'confirmed',
      is_emergency: false,
      message: '',
      tutor_note: '',
      price_cents: 1800,
      commission_cents: 180,
      created_at: iso(-3000),
      updated_at: iso(-2900),
    },
  );

  // secondo studente di esempio (per la demo lato tutor)
  profiles.push({
    id: 'demo-student-2',
    first_name: 'Giulia',
    last_name: 'Semiglia',
    avatar_url: null,
    role: 'student',
    location_label: 'Torino, TO',
    location_lat: 45.07,
    location_lng: 7.69,
    location_geog: null,
    school_context: 'university',
    onboarding_completed_at: iso(-4000),
    is_admin: false,
    created_at: iso(-4000),
    updated_at: iso(-4000),
  });

  const tutor_students = [
    { tutor_id: 'demo-tutor-1', student_id: DEMO_STUDENT_ID, status: 'active', created_at: iso(-1500) },
    { tutor_id: DEMO_TUTOR_ID, student_id: 'demo-student-2', status: 'active', created_at: iso(-2900) },
  ];

  // università
  const universities = [
    { id: 'unito', name: 'Università di Torino', city: 'Torino' },
    { id: 'polito', name: 'Politecnico di Torino', city: 'Torino' },
    { id: 'unipi', name: 'Università di Pisa', city: 'Pisa' },
  ];
  const degree_courses = [
    { id: 'dc-inf-polito', university_id: 'polito', name: 'Ingegneria Informatica', level: 'triennale' },
    { id: 'dc-mat-unito', university_id: 'unito', name: 'Matematica', level: 'triennale' },
    { id: 'dc-fis-unito', university_id: 'unito', name: 'Fisica', level: 'triennale' },
  ];
  const professors = [
    { id: 'prof-1', name: 'Prof. Elena Ferri' },
    { id: 'prof-2', name: 'Prof. Luca Marino' },
    { id: 'prof-3', name: 'Prof. Anna Villa' },
  ];
  const courses = [
    { id: 'crs-analisi1', degree_course_id: 'dc-inf-polito', name: 'Analisi Matematica 1', year: 1, professor_id: 'prof-1', subject_id: 'analisi-matematica' },
    { id: 'crs-fisica1', degree_course_id: 'dc-inf-polito', name: 'Fisica 1', year: 1, professor_id: 'prof-2', subject_id: 'fisica' },
    { id: 'crs-prog', degree_course_id: 'dc-inf-polito', name: 'Programmazione', year: 1, professor_id: 'prof-3', subject_id: 'informatica' },
    { id: 'crs-algebra', degree_course_id: 'dc-mat-unito', name: 'Algebra 1', year: 1, professor_id: 'prof-1', subject_id: 'matematica' },
  ];
  const tutor_courses = [
    { tutor_id: 'demo-tutor-1', course_id: 'crs-analisi1', created_at: iso(-9000) },
    { tutor_id: 'demo-tutor-1', course_id: 'crs-prog', created_at: iso(-9000) },
    { tutor_id: 'demo-tutor-3', course_id: 'crs-fisica1', created_at: iso(-9000) },
  ];
  const student_courses: any[] = [];

  // chat
  const conversations = [
    { id: 'conv1', tutor_id: 'demo-tutor-1', student_id: DEMO_STUDENT_ID, last_message_at: iso(-30), created_at: iso(-1500) },
  ];
  const messages = [
    { id: 'm1', conversation_id: 'conv1', sender_id: DEMO_STUDENT_ID, body: 'Buonasera! Confermo per domani alle 15.', created_at: iso(-90) },
    { id: 'm2', conversation_id: 'conv1', sender_id: 'demo-tutor-1', body: 'Perfetto Sara, a domani. Porta gli esercizi che non ti tornano.', created_at: iso(-30) },
  ];

  // classe di gruppo
  const study_groups = [
    { id: 'grp1', tutor_id: 'demo-tutor-1', name: 'Maturità Matematica — 5ª B', subject_id: 'matematica', description: 'Ripasso intensivo verso la maturità.', created_at: iso(-3000) },
  ];
  const group_members = [
    { group_id: 'grp1', student_id: DEMO_STUDENT_ID, status: 'active', invited_external: false, created_at: iso(-3000) },
  ];
  const group_sessions = [
    { id: 'gs1', group_id: 'grp1', starts_at: day(2, 17), ends_at: day(2, 19), mode: 'online', topic: 'Studio di funzione', created_at: iso(-2000) },
  ];

  const emergency_requests: any[] = [];
  const emergency_offers: any[] = [];

  const platform_settings = [{ id: 'default', commission_rate: 0.1, occasional_limit_cents: 500000, currency: 'EUR' }];
  const tutor_earnings = [
    { id: 'e1', tutor_id: 'demo-tutor-1', booking_id: 'bk1', gross_cents: 1500, commission_cents: 150, net_cents: 1350, occurred_at: iso(-1500) },
    { id: 'e2', tutor_id: DEMO_TUTOR_ID, booking_id: 'bk-self-2', gross_cents: 1800, commission_cents: 180, net_cents: 1620, occurred_at: iso(-2900) },
    { id: 'e3', tutor_id: DEMO_TUTOR_ID, booking_id: null, gross_cents: 1800, commission_cents: 180, net_cents: 1620, occurred_at: iso(-20000) },
    { id: 'e4', tutor_id: DEMO_TUTOR_ID, booking_id: null, gross_cents: 3600, commission_cents: 360, net_cents: 3240, occurred_at: iso(-40000) },
  ];

  const notifications = [
    { id: 'n1', user_id: DEMO_STUDENT_ID, kind: 'booking_confirmed', title: 'Richiesta accettata', body: 'Alessandro Rossi ha confermato la lezione di domani.', link: '/(app)/lezioni', read_at: null, created_at: iso(-1500) },
    { id: 'n2', user_id: DEMO_STUDENT_ID, kind: 'message', title: 'Nuovo messaggio', body: 'Alessandro Rossi: Perfetto Sara, a domani…', link: '/(app)/messaggi', read_at: null, created_at: iso(-30) },
    { id: 'n3', user_id: DEMO_STUDENT_ID, kind: 'group_session', title: `Sessione di gruppo`, body: 'Maturità Matematica — 5ª B: Studio di funzione, tra 2 giorni.', link: '/(app)/gruppi', read_at: iso(-100), created_at: iso(-500) },
  ];
  const push_tokens: any[] = [];

  return {
    profiles,
    tutor_profiles,
    student_profiles,
    tutor_credentials,
    subjects: SUBJECTS.map(([id, name, area, accent], i) => ({
      id,
      name,
      area,
      accent,
      applies_high_school: true,
      applies_university: true,
      sort_order: i * 10,
    })),
    tutor_subjects,
    student_subjects,
    tutor_availability,
    bookings,
    tutor_students,
    universities,
    degree_courses,
    courses,
    professors,
    tutor_courses,
    student_courses,
    conversations,
    messages,
    study_groups,
    group_members,
    group_sessions,
    emergency_requests,
    emergency_offers,
    platform_settings,
    tutor_rates,
    tutor_earnings,
    notifications,
    push_tokens,
  };
}

export const DEMO_APP_NAME = APP_NAME;
