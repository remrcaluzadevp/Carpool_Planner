import { formatWhen } from '@/lib/format'
import type { TripBoard } from '@/lib/types'

/** Black-and-white one-page trip sheet, shown only when printing / saving as PDF. */
export function PrintSheet({ board, shareUrl }: { board: TripBoard; shareUrl: string }) {
  const { trip, cars, riders } = board
  const waiting = riders.filter((r) => r.carId === null)

  return (
    <div className="print-only text-black" aria-hidden>
      <div style={{ borderBottom: '3px solid black', paddingBottom: 10, marginBottom: 16 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Carpool Planner · Trip sheet</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '4px 0' }}>{trip.name}</h1>
        <p style={{ fontSize: 14 }}>
          {trip.meetingPoint ? `${trip.meetingPoint} → ` : ''}
          {trip.destination}
        </p>
        <p style={{ fontSize: 14 }}>
          Departs {formatWhen(trip.departAt, trip.timeZone)}
          {trip.returnAt ? ` · Returns ${formatWhen(trip.returnAt, trip.timeZone)}` : ''}
        </p>
        {trip.notes && <p style={{ fontSize: 13, marginTop: 6 }}>Notes: {trip.notes}</p>}
      </div>

      {cars.map((car, i) => {
        const inCar = riders.filter((r) => r.carId === car.id)
        return (
          <div key={car.id} style={{ breakInside: 'avoid', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              Car {i + 1}: {car.driverName}
              {car.vehicle ? ` — ${car.vehicle}` : ''}{' '}
              <span style={{ fontWeight: 400, fontSize: 13 }}>
                ({inCar.length}/{car.seats} seats{car.leavingFrom ? `, leaves from ${car.leavingFrom}` : ''}
                {car.contact ? `, ${car.contact}` : ''})
              </span>
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 4 }}>
              <thead>
                <tr>
                  {['Seat', 'Rider', 'Pickup', 'Contact', 'Note', '✓'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid black', padding: '3px 4px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: car.seats }, (_, s) => inCar[s]).map((r, s) => (
                  <tr key={s}>
                    <td style={{ padding: '3px 4px', borderBottom: '1px solid #ccc' }}>{s + 1}</td>
                    <td style={{ padding: '3px 4px', borderBottom: '1px solid #ccc' }}>{r?.name ?? '— open —'}</td>
                    <td style={{ padding: '3px 4px', borderBottom: '1px solid #ccc' }}>{r?.pickup ?? ''}</td>
                    <td style={{ padding: '3px 4px', borderBottom: '1px solid #ccc' }}>{r?.contact ?? ''}</td>
                    <td style={{ padding: '3px 4px', borderBottom: '1px solid #ccc' }}>{r?.note ?? ''}</td>
                    <td style={{ padding: '3px 4px', borderBottom: '1px solid #ccc', width: 24 }}>☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {waiting.length > 0 && (
        <p style={{ fontSize: 13, marginTop: 8 }}>
          <strong>Still need a seat:</strong> {waiting.map((r) => r.name).join(', ')}
        </p>
      )}
      <p style={{ fontSize: 11, marginTop: 18, color: '#444' }}>Live plan: {shareUrl}</p>
    </div>
  )
}
