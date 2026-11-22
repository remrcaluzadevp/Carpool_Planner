/*
 * A fixed locale plus an explicit time zone keeps server-rendered and
 * browser-rendered dates identical (no hydration mismatch), and everyone
 * in the group sees the organizer's local departure time.
 */
function fmt(iso: string, options: Intl.DateTimeFormatOptions, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(new Date(iso))
  } catch {
    return new Intl.DateTimeFormat('en-US', options).format(new Date(iso))
  }
}

export function formatDay(iso: string, timeZone?: string) {
  return fmt(iso, { weekday: 'short', month: 'short', day: 'numeric' }, timeZone)
}

export function formatTime(iso: string, timeZone?: string) {
  return fmt(iso, { hour: 'numeric', minute: '2-digit' }, timeZone)
}

export function formatWhen(iso: string, timeZone?: string) {
  return `${formatDay(iso, timeZone)} · ${formatTime(iso, timeZone)}`
}

/** Short zone label such as "PST", for showing next to times. */
export function zoneLabel(iso: string, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(new Date(iso))
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** ISO string -> value for <input type="datetime-local"> in the viewer's timezone */
export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value -> ISO string (or null when empty) */
export function fromLocalInput(value: string) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'trip'
  )
}
