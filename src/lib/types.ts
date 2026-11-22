export type Trip = {
  id: string
  name: string
  destination: string
  meetingPoint: string
  /** ISO timestamps */
  departAt: string
  returnAt: string | null
  notes: string
  /** IANA time zone all times are displayed in */
  timeZone: string
}

export type Car = {
  id: number
  driverName: string
  vehicle: string
  /** Passenger seats, driver excluded */
  seats: number
  leavingFrom: string
  contact: string
}

export type Rider = {
  id: number
  carId: number | null
  name: string
  pickup: string
  contact: string
  note: string
}

export type TripBoard = {
  trip: Trip
  cars: Car[]
  riders: Rider[]
}
