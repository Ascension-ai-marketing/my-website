// Time-zone helpers. Every conversion names the zone; nothing uses the machine's zone.
// SOP: architecture/availability.md

const formatters = new Map();

function formatterFor(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        timeZoneName: 'longOffset',
      }),
    );
  }
  return formatters.get(timeZone);
}

// Wall-clock parts of an instant in a zone, plus the zone's offset from UTC in minutes at that instant.
export function zonedParts(date, timeZone) {
  const parts = Object.fromEntries(formatterFor(timeZone).formatToParts(date).map((p) => [p.type, p.value]));
  const offset = /GMT(?:([+-])(\d{2}):(\d{2}))?/.exec(parts.timeZoneName);
  const offsetMinutes = offset[1] ? (offset[1] === '-' ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3])) : 0;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
    offsetMinutes,
  };
}

// The instant at which the zone's clocks show the given wall-clock time.
// The offset is looked up twice so the answer is right on both sides of a daylight-saving change.
export function zonedToUtc({ year, month, day, hour, minute }, timeZone) {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = asIfUtc - zonedParts(new Date(asIfUtc), timeZone).offsetMinutes * 60_000;
  return new Date(asIfUtc - zonedParts(new Date(firstGuess), timeZone).offsetMinutes * 60_000);
}

// ISO 8601 with the zone's offset, for example 2026-10-06T09:00:00-04:00.
export function toZonedIso(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  const sign = p.offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(p.offsetMinutes);
  return (
    `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

const ISO_WITH_OFFSET = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d{1,3})?)?(Z|([+-])(\d{2}):(\d{2}))$/;

// Parses an ISO 8601 date-time that states its offset. Returns null for anything else,
// including impossible dates such as February 30.
export function parseIsoWithOffset(value) {
  if (typeof value !== 'string') return null;
  const match = ISO_WITH_OFFSET.exec(value);
  if (!match) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const offsetMinutes = match[2] === 'Z' ? 0 : (match[3] === '-' ? -1 : 1) * (Number(match[4]) * 60 + Number(match[5]));
  const wallClock = new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 16);
  return wallClock === match[1] ? date : null;
}

// A calendar date moved by n days. Dates are plain { year, month, day } numbers.
export function addDays({ year, month, day }, n) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayOf({ year, month, day }) {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}
