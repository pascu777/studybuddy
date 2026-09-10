/**
 * Tipi del database StudyBuddy (scritti a mano, allineati a
 * supabase/migrations/0001_init.sql). In futuro si possono rigenerare con
 * `supabase gen types typescript`.
 */

export type UserRole = 'tutor' | 'student';
export type SchoolContext = 'high_school' | 'university';
export type VerificationStatus = 'none' | 'requested' | 'verified' | 'rejected';
export type FiscalRegime = 'occasional' | 'vat';

// Fase 2/3
export type SlotMode = 'in_person' | 'online' | 'both';
export type BookingMode = 'in_person' | 'online';
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export interface AvailabilityRow {
  id: string;
  tutor_id: string;
  starts_at: string;
  ends_at: string;
  mode: SlotMode;
  note: string;
  created_at: string;
}

export interface BookingRow {
  id: string;
  slot_id: string | null;
  tutor_id: string;
  student_id: string;
  subject_id: string | null;
  starts_at: string;
  ends_at: string;
  mode: BookingMode;
  status: BookingStatus;
  is_emergency: boolean;
  message: string;
  tutor_note: string;
  created_at: string;
  updated_at: string;
}

/** Riga da `search_tutors` / `get_tutor`. */
export interface TutorCardRow {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  location_label: string | null;
  distance_km?: number | null;
  verified: boolean;
  bio: string;
  university_name: string;
  degree_course: string;
  delivery_in_person: boolean;
  delivery_online: boolean;
  teaches_high_school: boolean;
  teaches_university: boolean;
  accepting_students?: boolean;
  subjects: string[];
  credentials?: string[];
  courses?: string[];
  free_slots?: number;
  hourly_rate_cents?: number | null;
}

/** Riga da `get_tutor_slots`. */
export interface TutorSlotRow {
  id: string;
  starts_at: string;
  ends_at: string;
  mode: SlotMode;
  status: 'free' | 'held' | 'booked';
  mine: boolean;
}

/** Riga da `my_bookings`. */
export interface MyBookingRow {
  id: string;
  role: 'student' | 'tutor';
  status: BookingStatus;
  mode: BookingMode;
  starts_at: string;
  ends_at: string;
  is_emergency: boolean;
  message: string;
  tutor_note: string;
  subject_name: string | null;
  price_cents?: number | null;
  commission_cents?: number | null;
  counterpart_id: string;
  counterpart_first_name: string;
  counterpart_last_name: string;
  counterpart_avatar_url: string | null;
  created_at: string;
}

// ---- F7 Università ----
export interface DegreeCourseRow {
  id: string;
  name: string;
  level: 'triennale' | 'magistrale' | 'ciclo_unico';
  university_name: string;
}
export interface CourseRow {
  id: string;
  name: string;
  year: number;
  degree_course_id: string;
  degree_course_name: string;
  university_name: string;
  professor_name: string;
  subject_id: string | null;
  tutors_count: number;
}

// ---- F4 Chat ----
export interface ConversationRow {
  id: string;
  counterpart_id: string;
  counterpart_first_name: string;
  counterpart_last_name: string;
  counterpart_avatar_url: string | null;
  last_body: string;
  last_at: string;
  unread: number;
}
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ---- F5 Classi di gruppo ----
export interface GroupRow {
  id: string;
  name: string;
  subject_name: string | null;
  is_owner: boolean;
  members_count: number;
  next_session_at: string | null;
  next_session_topic: string | null;
}
export interface GroupMemberRow {
  student_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  external: boolean;
}
export interface GroupSessionRow {
  id: string;
  starts_at: string;
  ends_at: string;
  mode: SlotMode;
  topic: string;
}
export interface GroupDetailRow {
  id: string;
  name: string;
  description: string;
  subject_name: string | null;
  is_owner: boolean;
  tutor_name: string;
  members: GroupMemberRow[];
  sessions: GroupSessionRow[];
}

// ---- F6 Emergenza ----
export type EmergencyStatus = 'open' | 'matched' | 'cancelled';
export interface OpenEmergencyRow {
  id: string;
  student_name: string;
  subject_name: string | null;
  note: string;
  mode: BookingMode;
  when_pref: string;
  created_at: string;
}
export interface MyEmergencyRow {
  id: string;
  role: 'student' | 'tutor';
  status: EmergencyStatus;
  subject_name: string | null;
  note: string;
  mode: BookingMode;
  when_pref: string;
  created_at: string;
  offers: {
    id: string;
    tutor_id: string;
    tutor_name: string;
    proposed_at: string;
    status: 'offered' | 'accepted' | 'declined';
    note?: string;
  }[];
}

// ---- F8 Notifiche ----
export interface NotificationRow {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
}

// ---- F12 Pagamenti ----
export interface EarningsSummaryRow {
  ytd_gross_cents: number;
  ytd_net_cents: number;
  lessons_count: number;
  commission_rate: number;
  limit_cents: number;
  over_threshold: boolean;
  has_vat: boolean;
  fiscal_regime: FiscalRegime;
}
export interface PlatformConfigRow {
  commission_rate: number;
  occasional_limit_cents: number;
  currency: string;
}

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export interface ProfileRow extends Timestamps {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: UserRole | null;
  location_label: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_geog: unknown | null;
  school_context: SchoolContext | null;
  onboarding_completed_at: string | null;
  /** F10 — impostabile solo lato service role (vedi 0008_admin.sql). */
  is_admin: boolean;
}

// ---- F10 Pannello admin ----
export interface AdminOverviewRow {
  users_total: number;
  students_total: number;
  tutors_total: number;
  tutors_verified: number;
  tutors_pending: number;
  credentials_pending: number;
  bookings_total: number;
  bookings_upcoming: number;
  gmv_cents: number;
  commission_cents: number;
  emergencies_open: number;
  groups_total: number;
}
export interface AdminPendingCredentialRow {
  id: string;
  tutor_id: string;
  tutor_name: string;
  tutor_avatar_url: string | null;
  tutor_verified: boolean;
  title: string;
  institution: string;
  year: number | null;
  document_url: string | null;
  requested_at: string | null;
}
export interface AdminUserRow {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: UserRole | null;
  is_admin: boolean;
  verified: boolean;
  location_label: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface TutorProfileRow extends Timestamps {
  profile_id: string;
  bio: string;
  university_name: string;
  degree_course: string;
  teaches_high_school: boolean;
  teaches_university: boolean;
  delivery_in_person: boolean;
  delivery_online: boolean;
  verified: boolean;
  accepting_students: boolean;
  fiscal_regime: FiscalRegime;
  partita_iva: string | null;
  degree_course_id?: string | null;
}

export interface TutorCredentialRow extends Timestamps {
  id: string;
  tutor_id: string;
  title: string;
  institution: string;
  year: number | null;
  document_url: string | null;
  verification_status: VerificationStatus;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
}

export interface StudentProfileRow extends Timestamps {
  profile_id: string;
  school_type: SchoolContext;
  school_name: string;
  university_name: string;
  degree_course: string;
  degree_course_id?: string | null;
}

export interface SubjectRow {
  id: string;
  name: string;
  area: string;
  accent: string;
  applies_high_school: boolean;
  applies_university: boolean;
  sort_order: number;
}

export interface TutorSubjectRow {
  id: string;
  tutor_id: string;
  subject_id: string;
  school_context: SchoolContext;
  level_from: number;
  level_to: number;
  created_at: string;
}

export interface StudentSubjectRow {
  id: string;
  student_id: string;
  subject_id: string;
  school_context: SchoolContext;
  level: number;
  created_at: string;
}

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<
        ProfileRow,
        Partial<ProfileRow> & { id: string },
        Partial<ProfileRow>
      >;
      tutor_profiles: TableShape<
        TutorProfileRow,
        Partial<TutorProfileRow> & { profile_id: string },
        Partial<TutorProfileRow>
      >;
      tutor_credentials: TableShape<
        TutorCredentialRow,
        Partial<TutorCredentialRow> & { tutor_id: string; title: string },
        Partial<TutorCredentialRow>
      >;
      student_profiles: TableShape<
        StudentProfileRow,
        Partial<StudentProfileRow> & { profile_id: string; school_type: SchoolContext },
        Partial<StudentProfileRow>
      >;
      subjects: TableShape<SubjectRow>;
      tutor_subjects: TableShape<
        TutorSubjectRow,
        Partial<TutorSubjectRow> & {
          tutor_id: string;
          subject_id: string;
          school_context: SchoolContext;
        }
      >;
      student_subjects: TableShape<
        StudentSubjectRow,
        Partial<StudentSubjectRow> & {
          student_id: string;
          subject_id: string;
          school_context: SchoolContext;
        }
      >;
    };
    Views: {
      public_profiles: {
        Row: Pick<
          ProfileRow,
          'id' | 'first_name' | 'last_name' | 'avatar_url' | 'role' | 'location_label' | 'school_context'
        > & {
          tutor_verified: boolean | null;
          tutor_bio: string | null;
          tutor_university_name: string | null;
          tutor_degree_course: string | null;
          teaches_high_school: boolean | null;
          teaches_university: boolean | null;
          delivery_in_person: boolean | null;
          delivery_online: boolean | null;
          accepting_students: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      school_context: SchoolContext;
      verification_status: VerificationStatus;
      fiscal_regime: FiscalRegime;
    };
    CompositeTypes: Record<string, never>;
  };
}
