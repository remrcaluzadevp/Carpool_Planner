/** Trips this browser has opened, so students can jump back in from the home page. */
export type RecentTrip = { id: string; name: string; destination: string; departAt: string }

const KEY = 'carpool:recent-trips'

export function readRecentTrips(): RecentTrip[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as RecentTrip[]) : []
    return Array.isArray(list) ? list.filter((t) => t && typeof t.id === 'string') : []
  } catch {
    return []
  }
}

export function rememberTrip(trip: RecentTrip) {
  try {
    const rest = readRecentTrips().filter((t) => t.id !== trip.id)
    localStorage.setItem(KEY, JSON.stringify([trip, ...rest].slice(0, 6)))
  } catch {
    /* storage unavailable (private mode) — nothing to remember */
  }
}

export function forgetTrip(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(readRecentTrips().filter((t) => t.id !== id)))
  } catch {
    /* ignore */
  }
}
