export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Inserisci la tua email.';
  if (!EMAIL_RE.test(value.trim())) return 'Email non valida.';
  return null;
}

export function validatePassword(value: string, { min = 8 } = {}): string | null {
  if (!value) return 'Inserisci una password.';
  if (value.length < min) return `Almeno ${min} caratteri.`;
  return null;
}

export function validateRequired(value: string, label = 'Campo'): string | null {
  return value.trim() ? null : `${label} obbligatorio.`;
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
