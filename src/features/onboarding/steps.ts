import type { Href } from 'expo-router';

import type { FullProfile } from '@/features/profile/hooks';
import type { UserRole } from '@/types/database';

export const TUTOR_STEPS = ['profilo', 'titoli', 'materie'] as const;
export const STUDENT_STEPS = ['profilo', 'studi'] as const;

export function stepCount(role: UserRole | null): number {
  if (role === 'tutor') return TUTOR_STEPS.length;
  if (role === 'student') return STUDENT_STEPS.length;
  return 1;
}

/** Prossima schermata di onboarding da mostrare in base ai dati già salvati. */
export function nextOnboardingStep(full: FullProfile | null): Href {
  if (!full) return '/(onboarding)/role';
  const { profile, tutorProfile, studentProfile } = full;

  if (!profile.role) return '/(onboarding)/role';

  const profileDone =
    !!profile.first_name.trim() && !!profile.last_name.trim() && !!profile.location_label;
  if (!profileDone) return '/(onboarding)/profile';

  if (profile.role === 'tutor') {
    if (!tutorProfile) return '/(onboarding)/tutor/credentials';
    const teachingDone = tutorProfile.teaches_high_school || tutorProfile.teaches_university;
    if (!teachingDone) return '/(onboarding)/tutor/teaching';
    return '/(onboarding)/done';
  }

  if (!studentProfile) return '/(onboarding)/student/studies';
  return '/(onboarding)/done';
}
