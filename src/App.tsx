import { useEffect, useMemo, useState } from 'react';
import { Shift, decimalHours, fmtClock, fmtHM, parseTime, pay, shiftMinutes } from './hours';

type Mode = 'shift' | 'week';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LS = 'hours-calculator:v1';

const emptyShift = (): Shift => ({ start: '', end: '', breakMins: '' });

function loadWeek(): Shift[] {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const j = JSON.parse(raw);
      if (Array.isArray(j) && j.length === 7) return j;
    }
  } catch {
    /* ignore */
  }
  return DAYS.map(() => emptyShift());
}

function read() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      mode: (p.get('m') === 'week' ? 'week' : 'shift') as Mode,
      start: p.get('s') || '09:00',
      end: p.get('e') || '17:30',
      brk: p.get('b') || '30',
      rate: p.get('r') || '',
      otAfter: p.get('oa') || '8',
      otMult: p.get('om') || '1.5',
      currency: p.get('c') || 'USD',
    };
  } catch {
    return { mode: 'shift' as Mode, start: '09:00', end: '17:30', brk: '30', rate: '', otAfter: '8', otMult: '1.5', currency: 'USD' };
  }
}

function money(n: number, c: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(n);
  } catch {
    return `${c} ${n.toFixed(2)}`;
  }
}
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'NZD', 'INR', 'ZAR'];

export default function App() {
  const init = read();
  const [mode, setMode] = useState<Mode>(init.mode);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);
  const [brk, setBrk] = useState(init.brk);
  const [rate, setRate] = useState(init.rate);
  const [otAfter, setOtAfter] = useState(init.otAfter);
  const [otMult, setOtMult] = useState(init.otMult);
  const [currency, setCurrency] = useState(init.currency);
  const [week, setWeek] = useState<Shift[]>(loadWeek);
  const [payOpen, setPayOpen] = useState(!!init.rate);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify(week));
    } catch {
      /* ignore */
    }
  }, [week]);

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const q = u.searchParams;
      q.set('m', mode); q.set('s', start); q.set('e', end); q.set('b', brk);
      q.set('c', currency); q.set('oa', otAfter); q.set('om', otMult);
      if (rate) q.set('r', rate); else q.delete('r');
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [mode, start, end, brk, rate, otAfter, otMult, currency]);

  const shift = useMemo(() => shiftMinutes({ start, end, breakMins: brk }), [start, end, brk]);
  const weekResults = useMemo(() => week.map((s) => shiftMinutes(s)), [week]);
  const weekTotal = weekResults.reduce((a, r) => a + (r.valid ? r.worked : 0), 0);

  const activeMins = mode === 'shift' ? (shift.valid ? shift.worked : 0) : weekTotal;
  const payBreakdown = useMemo(
    () => pay(activeMins, Number(rate), Number(otAfter), Number(otMult)),
    [activeMins, rate, otAfter, otMult],
  );

  const setDay = (i: number, patch: Partial<Shift>) =>
    setWeek((w) => w.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const m = (n: number) => money(n, currency);

  return (
    <div className="app">
      <header>
        <h1>Work Hours Calculator</h1>
        <p className="tag">
          Time between a start and finish, minus breaks — as hours and minutes and as decimal hours
          for a timesheet. Overnight shifts and an optional pay rate too.
        </p>
      </header>

      <div className="seg">
        <button className={mode === 'shift' ? 'on' : ''} onClick={() => setMode('shift')}>One shift</button>
        <button className={mode === 'week' ? 'on' : ''} onClick={() => setMode('week')}>Weekly timesheet</button>
      </div>

      {mode === 'shift' ? (
        <>
          <div className="shiftrow">
            <label className="f"><span>Start</span><input type="text" value={start} placeholder="9:00" onChange={(e) => setStart(e.target.value)} /></label>
            <label className="f"><span>End</span><input type="text" value={end} placeholder="17:30" onChange={(e) => setEnd(e.target.value)} /></label>
            <label className="f"><span>Break (min)</span><input type="text" inputMode="numeric" value={brk} onChange={(e) => setBrk(e.target.value.replace(/[^0-9]/g, ''))} /></label>
          </div>
          {shift.valid ? (
            <div className="result">
              <div className="big">
                <div><b>{fmtHM(shift.worked)}</b><span>worked</span></div>
                <div><b>{decimalHours(shift.worked)}</b><span>decimal hours</span></div>
              </div>
              <p className="detail">
                {fmtClock(parseTime(start)!)} → {fmtClock(parseTime(end)!)}
                {shift.crossedMidnight && ' (next day)'} · {fmtHM(shift.gross)} before the {brk || 0}-minute break
              </p>
            </div>
          ) : (
            <p className="hint">Enter a start and end time (try 9:00 and 17:30, or 9am and 5pm).</p>
          )}
        </>
      ) : (
        <div className="week">
          {week.map((s, i) => {
            const r = weekResults[i];
            return (
              <div className="wrow" key={i}>
                <span className="day">{DAYS[i]}</span>
                <input className="wt" type="text" placeholder="start" value={s.start} onChange={(e) => setDay(i, { start: e.target.value })} />
                <input className="wt" type="text" placeholder="end" value={s.end} onChange={(e) => setDay(i, { end: e.target.value })} />
                <input className="wt br" type="text" inputMode="numeric" placeholder="brk" value={s.breakMins} onChange={(e) => setDay(i, { breakMins: e.target.value.replace(/[^0-9]/g, '') })} />
                <span className="wtot">{s.start || s.end ? (r.valid ? decimalHours(r.worked) : '—') : ''}</span>
              </div>
            );
          })}
          <div className="wsum">
            <span>Week total</span>
            <b>{fmtHM(weekTotal)} · {decimalHours(weekTotal)} h</b>
          </div>
        </div>
      )}

      <details className="paybox" open={payOpen} onToggle={(e) => setPayOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Add a pay rate</summary>
        <div className="payrow">
          <label className="f"><span>Rate / hour</span>
            <div className="ibox">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
              <input type="text" inputMode="decimal" value={rate} placeholder="0.00" onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ''))} />
            </div>
          </label>
          <label className="f"><span>Overtime after (h)</span><input type="text" inputMode="decimal" value={otAfter} onChange={(e) => setOtAfter(e.target.value.replace(/[^0-9.]/g, ''))} /></label>
          <label className="f"><span>OT multiplier</span><input type="text" inputMode="decimal" value={otMult} onChange={(e) => setOtMult(e.target.value.replace(/[^0-9.]/g, ''))} /></label>
        </div>
        {payBreakdown && (
          <div className="paysum">
            <span>Regular {m(payBreakdown.regular)}</span>
            {payBreakdown.ot > 0 && <span>Overtime {m(payBreakdown.ot)}</span>}
            <b>Total {m(payBreakdown.total)}</b>
          </div>
        )}
      </details>

      <button className="share" onClick={share}>{copied ? 'Link copied' : 'Copy shareable link'}</button>

      <section className="explainer">
        <h2>How the time is worked out</h2>
        <p>
          The end time minus the start time gives the gross span. If the end is earlier than the
          start — a night shift finishing after midnight — a day is added automatically. The break is
          subtracted to give the hours actually worked. <strong>Decimal hours</strong> is that figure
          divided by 60 (8h&nbsp;30m = 8.5), which is what most payroll and invoicing systems expect.
        </p>
        <h3>Entering times</h3>
        <p>
          Almost any format works: <code>9</code>, <code>9:30</code>, <code>9.5</code>,
          <code> 0930</code>, <code>9:30 am</code>, <code>5pm</code>, <code>17:00</code>. A bare
          number under 24 is read as an hour; a decimal is read as hours (9.5 = 9:30).
        </p>
        <h3>Overtime</h3>
        <p>
          The optional pay section splits the total at your overtime threshold — anything above it is
          paid at the multiplier (1.5× by default). It's a simple daily or weekly threshold; real
          overtime rules vary by country, employer and award, so check yours. This is an estimate,
          not a payslip.
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. It's arithmetic in your browser. The weekly timesheet is saved locally; the single shift is in the page link.</p>
        <footer>Work Hours Calculator · an estimate · no sign-up · works offline once loaded</footer>
      </section>
    </div>
  );
}
