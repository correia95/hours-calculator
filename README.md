# hours-calculator

Work out the hours between a start and end time, minus breaks, as hours-and-
minutes and decimal hours (for timesheets). Handles shifts crossing midnight,
a Mon-Sun weekly timesheet with a total, and an optional pay rate with an
overtime threshold and multiplier.

**Live:** https://hours-calculator.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/hours.ts`](src/hours.ts): `parseTime` accepts `9`, `9:30`, `9.5`, `0930`,
`9:30am`, `5pm`, `17:00`; `shiftMinutes` = end - start (+1440 if it went past
midnight) - break; `decimalHours`, `fmtHM`, `fmtClock`; `pay(mins, rate,
otAfterH, otMult)` splits regular vs overtime.

Verified in Node: 9:00-17:30 -30 = 8h 00m / 8.5; 22:00-6:00 = 8h 00m (crossed);
8am-6pm -60 = 9h; pay 9h @25 OT after 8 @1.5 = 200 + 37.5 = 237.5; bad times -> invalid.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
