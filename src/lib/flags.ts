/**
 * Feature flag della Fase 1.
 * Il login social/telefono è mostrato nell'interfaccia ma disattivato ("Presto").
 * Per attivarli in futuro: mettere a true e configurare i provider su Supabase.
 */
export const flags = {
  socialAuthEnabled: false,
  phoneAuthEnabled: false,
} as const;
