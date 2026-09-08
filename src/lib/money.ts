const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

export function formatEUR(cents: number | null | undefined): string {
  return EUR.format((cents ?? 0) / 100);
}

/** Prezzo lezione = tariffa oraria pro-rata sulla durata in minuti. */
export function priceForDuration(hourlyCents: number, minutes: number): number {
  return Math.round((hourlyCents * minutes) / 60);
}

export function commissionCents(priceCents: number, rate: number): number {
  return Math.round(priceCents * rate);
}
