// Work-hours maths: time between a start and end (crossing midnight if needed),
// minus breaks, plus a weekly timesheet sum.

// parse "9", "9:30", "9.5", "0930", "9:30 am", "5pm" -> minutes since midnight, or null
export function parseTime(input: string): number | null {
  let s = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;

  let ampm: 'a' | 'p' | null = null;
  if (s.endsWith('am') || s.endsWith('a')) {
    ampm = 'a';
    s = s.replace(/a\.?m?\.?$/, '');
  } else if (s.endsWith('pm') || s.endsWith('p')) {
    ampm = 'p';
    s = s.replace(/p\.?m?\.?$/, '');
  }

  let h: number;
  let m = 0;

  if (/^\d{1,2}:\d{2}$/.test(s)) {
    [h, m] = s.split(':').map(Number);
  } else if (/^\d{3,4}$/.test(s)) {
    h = Math.floor(Number(s) / 100);
    m = Number(s) % 100;
  } else if (/^\d{1,2}(\.\d+)?$/.test(s)) {
    const n = Number(s);
    h = Math.floor(n);
    m = Math.round((n - h) * 60);
  } else {
    return null;
  }

  if (m > 59) return null;
  if (ampm === 'p' && h < 12) h += 12;
  if (ampm === 'a' && h === 12) h = 0;
  if (h > 23 && !(h === 24 && m === 0)) return null;
  return h * 60 + m;
}

export function fmtHM(mins: number): string {
  const neg = mins < 0;
  const t = Math.abs(Math.round(mins));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${neg ? '-' : ''}${h}h ${m.toString().padStart(2, '0')}m`;
}

export function fmtClock(mins: number): string {
  const t = ((Math.round(mins) % 1440) + 1440) % 1440;
  let h = Math.floor(t / 60);
  const m = t % 60;
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ap}`;
}

export interface Shift {
  start: string;
  end: string;
  breakMins: string;
}

export interface ShiftResult {
  worked: number; // minutes
  gross: number; // minutes start->end (before break)
  crossedMidnight: boolean;
  valid: boolean;
}

export function shiftMinutes(s: Shift): ShiftResult {
  const a = parseTime(s.start);
  const b = parseTime(s.end);
  const br = Math.max(0, Math.round(Number(s.breakMins) || 0));
  if (a == null || b == null) return { worked: 0, gross: 0, crossedMidnight: false, valid: false };
  let gross = b - a;
  let crossed = false;
  if (gross < 0) {
    gross += 1440;
    crossed = true;
  }
  return { worked: Math.max(0, gross - br), gross, crossedMidnight: crossed, valid: true };
}

export function decimalHours(mins: number): number {
  return Math.round((mins / 60) * 100) / 100;
}

// pay: worked hours * rate, with optional overtime after `otAfterH` hours at otMult
export function pay(mins: number, rate: number, otAfterH: number, otMult: number): { regular: number; ot: number; total: number } | null {
  if (!(rate > 0)) return null;
  const h = mins / 60;
  const otThreshold = otAfterH > 0 ? otAfterH : Infinity;
  const regH = Math.min(h, otThreshold);
  const otH = Math.max(0, h - otThreshold);
  const regular = regH * rate;
  const ot = otH * rate * (otMult > 0 ? otMult : 1.5);
  return { regular, ot, total: regular + ot };
}
