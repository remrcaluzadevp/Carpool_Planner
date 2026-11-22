import { formatWhen, slugify } from './format'
import type { TripBoard } from './types'

function saveFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvCell(value: string | number) {
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** One row per seat: who drives, who rides, where they get picked up. */
export function rosterCsv({ trip, cars, riders }: TripBoard) {
  const header = [
    'Trip',
    'Departs',
    'Car',
    'Driver',
    'Vehicle',
    'Leaving from',
    'Driver contact',
    'Seat',
    'Rider',
    'Pickup',
    'Rider contact',
    'Note',
  ]
  const rows: Array<Array<string | number>> = []
  cars.forEach((car, i) => {
    const inCar = riders.filter((r) => r.carId === car.id)
    for (let seat = 0; seat < car.seats; seat++) {
      const r = inCar[seat]
      rows.push([
        trip.name,
        formatWhen(trip.departAt, trip.timeZone),
        `Car ${i + 1}`,
        car.driverName,
        car.vehicle,
        car.leavingFrom,
        car.contact,
        seat + 1,
        r?.name ?? '(open seat)',
        r?.pickup ?? '',
        r?.contact ?? '',
        r?.note ?? '',
      ])
    }
  })
  for (const r of riders.filter((x) => x.carId === null)) {
    rows.push([trip.name, formatWhen(trip.departAt, trip.timeZone), 'Waitlist', '', '', '', '', '', r.name, r.pickup, r.contact, r.note])
  }
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** Plain-text summary that pastes cleanly into a group chat. */
export function summaryText({ trip, cars, riders }: TripBoard, link?: string) {
  const lines: string[] = []
  lines.push(`🚗 ${trip.name} → ${trip.destination}`)
  lines.push(`Leaving ${formatWhen(trip.departAt, trip.timeZone)}${trip.meetingPoint ? ` from ${trip.meetingPoint}` : ''}`)
  if (trip.returnAt) lines.push(`Back ${formatWhen(trip.returnAt, trip.timeZone)}`)
  lines.push('')
  cars.forEach((car, i) => {
    const inCar = riders.filter((r) => r.carId === car.id)
    lines.push(
      `Car ${i + 1}: ${car.driverName}${car.vehicle ? ` (${car.vehicle})` : ''} — ${inCar.length}/${car.seats} seats${
        car.leavingFrom ? `, leaving from ${car.leavingFrom}` : ''
      }`,
    )
    for (const r of inCar) lines.push(`  • ${r.name}${r.pickup ? ` — pickup: ${r.pickup}` : ''}`)
  })
  const waiting = riders.filter((r) => r.carId === null)
  if (waiting.length) {
    lines.push('')
    lines.push(`Still need a seat: ${waiting.map((r) => r.name).join(', ')}`)
  }
  if (trip.notes) {
    lines.push('')
    lines.push(`Notes: ${trip.notes}`)
  }
  if (link) {
    lines.push('')
    lines.push(`Plan: ${link}`)
  }
  return lines.join('\n')
}

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
}

/** Fold long lines to 75 octets as RFC 5545 requires (approximated by chars). */
function fold(line: string) {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function tripIcs(board: TripBoard, link: string) {
  const { trip } = board
  const end = trip.returnAt ?? new Date(new Date(trip.departAt).getTime() + 60 * 60 * 1000).toISOString()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Carpool Planner//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${trip.id}@carpool-planner`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(trip.departAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`Carpool: ${trip.name}`)}`,
    `LOCATION:${icsEscape(trip.meetingPoint || trip.destination)}`,
    `DESCRIPTION:${icsEscape(summaryText(board, link))}`,
    `URL:${link}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Carpool leaves in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n')
}

export function downloadCsv(board: TripBoard) {
  saveFile(`${slugify(board.trip.name)}-roster.csv`, '\uFEFF' + rosterCsv(board), 'text/csv;charset=utf-8')
}

export function downloadIcs(board: TripBoard, link: string) {
  saveFile(`${slugify(board.trip.name)}.ics`, tripIcs(board, link), 'text/calendar;charset=utf-8')
}

export function downloadText(board: TripBoard, link: string) {
  saveFile(`${slugify(board.trip.name)}-plan.txt`, summaryText(board, link), 'text/plain;charset=utf-8')
}
