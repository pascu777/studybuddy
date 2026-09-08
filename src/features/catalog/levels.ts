import type { SchoolContext } from '@/types/database';

export type LevelOption = { value: number; label: string };

/** Livelli selezionabili in base al tipo di scuola. */
export function levelOptions(ctx: SchoolContext): LevelOption[] {
  if (ctx === 'high_school') {
    return [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n}ª superiore` }));
  }
  return [
    { value: 1, label: '1º anno' },
    { value: 2, label: '2º anno' },
    { value: 3, label: '3º anno' },
    { value: 4, label: 'Magistrale · 1º anno' },
    { value: 5, label: 'Magistrale · 2º anno' },
  ];
}

export function levelLabel(ctx: SchoolContext, value: number): string {
  return levelOptions(ctx).find((o) => o.value === value)?.label ?? `Livello ${value}`;
}

export function levelRangeLabel(ctx: SchoolContext, from: number, to: number): string {
  if (from >= to) return levelLabel(ctx, from);
  return `${levelLabel(ctx, from)} – ${levelLabel(ctx, to)}`;
}
