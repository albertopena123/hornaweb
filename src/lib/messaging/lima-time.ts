// Perú no aplica horario de verano: Lima es UTC-5 fijo. Evitamos librerías de zonas horarias.
const LIMA_OFFSET_MS = -5 * 3600 * 1000;

function toLima(d: Date): Date {
  return new Date(d.getTime() + LIMA_OFFSET_MS);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function limaHour(d: Date = new Date()): number {
  return toLima(d).getUTCHours();
}

export function limaDayKey(d: Date = new Date()): string {
  const l = toLima(d);
  return `${l.getUTCFullYear()}-${pad(l.getUTCMonth() + 1)}-${pad(l.getUTCDate())}`;
}

/** Ventana [start, end) en horas Lima. */
export function isWithinWindow(hour: number, start: number, end: number): boolean {
  return hour >= start && hour < end;
}

/** Próximo instante (UTC) en que son las `startHour:00` en Lima, estrictamente después de `now`. */
export function nextWindowStart(now: Date, startHour: number): Date {
  const l = toLima(now);
  let candidate = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), startHour, 0, 0) - LIMA_OFFSET_MS;
  if (candidate <= now.getTime()) candidate += 86_400_000;
  return new Date(candidate);
}

/** Veda: desde 00:00 Lima del día anterior a la elección hasta 00:00 Lima del día siguiente. */
export function isElectoralSilence(now: Date, electionDate: string | undefined): boolean {
  if (!electionDate) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(electionDate.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const start = Date.UTC(y, mo, d - 1, 0, 0, 0) - LIMA_OFFSET_MS;
  const end = Date.UTC(y, mo, d + 1, 0, 0, 0) - LIMA_OFFSET_MS;
  const t = now.getTime();
  return t >= start && t < end;
}

export function randomBetween(minInclusive: number, maxInclusive: number): number {
  const lo = Math.min(minInclusive, maxInclusive);
  const hi = Math.max(minInclusive, maxInclusive);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
