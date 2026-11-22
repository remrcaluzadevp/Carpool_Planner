import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index'
import { cars, riders, trips } from '../../db/schema'
import type { TripBoard } from './types'

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const tripId = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{6,32}$/, 'Invalid trip link')
const short = (max: number) => z.string().trim().max(max)
const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date and time')

const tripFields = z.object({
  name: short(80).min(1, 'Give the trip a name'),
  destination: short(120).min(1, 'Where are you headed?'),
  meetingPoint: short(120).default(''),
  departAt: isoDate,
  returnAt: isoDate.nullable().default(null),
  notes: short(1000).default(''),
})

const timeZone = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      return true
    } catch {
      return false
    }
  }, 'Unknown time zone')

const carFields = z.object({
  driverName: short(60).min(1, 'Driver name is required'),
  vehicle: short(60).default(''),
  seats: z.coerce.number().int().min(1, 'At least 1 seat').max(12, 'Max 12 seats'),
  leavingFrom: short(120).default(''),
  contact: short(80).default(''),
})

const riderFields = z.object({
  name: short(60).min(1, 'Rider name is required'),
  pickup: short(120).default(''),
  contact: short(80).default(''),
  note: short(200).default(''),
})

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function newTripId() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

async function requireTrip(id: string) {
  const [trip] = await db.select({ id: trips.id }).from(trips).where(eq(trips.id, id))
  if (!trip) throw new Error('This trip no longer exists')
}

async function requireCar(tripIdValue: string, carId: number) {
  const [car] = await db
    .select()
    .from(cars)
    .where(and(eq(cars.id, carId), eq(cars.tripId, tripIdValue)))
  if (!car) throw new Error('That car is no longer on this trip')
  return car
}

async function seatsTaken(carId: number) {
  const [row] = await db
    .select({ n: count() })
    .from(riders)
    .where(eq(riders.carId, carId))
  return row?.n ?? 0
}

/* ------------------------------------------------------------------ */
/* Trips                                                               */
/* ------------------------------------------------------------------ */

export const createTrip = createServerFn({ method: 'POST' })
  .validator(tripFields.extend({ timeZone: timeZone.default('UTC') }))
  .handler(async ({ data }) => {
    const id = newTripId()
    await db.insert(trips).values({
      id,
      name: data.name,
      destination: data.destination,
      meetingPoint: data.meetingPoint,
      departAt: new Date(data.departAt),
      returnAt: data.returnAt ? new Date(data.returnAt) : null,
      notes: data.notes,
      timeZone: data.timeZone,
    })
    return { id }
  })

export const getTripBoard = createServerFn({ method: 'GET' })
  .validator(z.object({ tripId }))
  .handler(async ({ data }): Promise<TripBoard | null> => {
    const [trip] = await db.select().from(trips).where(eq(trips.id, data.tripId))
    if (!trip) return null

    const [carRows, riderRows] = await Promise.all([
      db.select().from(cars).where(eq(cars.tripId, trip.id)).orderBy(asc(cars.createdAt), asc(cars.id)),
      db
        .select()
        .from(riders)
        .where(eq(riders.tripId, trip.id))
        .orderBy(asc(riders.createdAt), asc(riders.id)),
    ])

    return {
      trip: {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        meetingPoint: trip.meetingPoint,
        departAt: trip.departAt.toISOString(),
        returnAt: trip.returnAt ? trip.returnAt.toISOString() : null,
        notes: trip.notes,
        timeZone: trip.timeZone,
      },
      cars: carRows.map((c) => ({
        id: c.id,
        driverName: c.driverName,
        vehicle: c.vehicle,
        seats: c.seats,
        leavingFrom: c.leavingFrom,
        contact: c.contact,
      })),
      riders: riderRows.map((r) => ({
        id: r.id,
        carId: r.carId,
        name: r.name,
        pickup: r.pickup,
        contact: r.contact,
        note: r.note,
      })),
    }
  })

export const updateTrip = createServerFn({ method: 'POST' })
  .validator(tripFields.extend({ tripId }))
  .handler(async ({ data }) => {
    await requireTrip(data.tripId)
    await db
      .update(trips)
      .set({
        name: data.name,
        destination: data.destination,
        meetingPoint: data.meetingPoint,
        departAt: new Date(data.departAt),
        returnAt: data.returnAt ? new Date(data.returnAt) : null,
        notes: data.notes,
      })
      .where(eq(trips.id, data.tripId))
    return { ok: true }
  })

/* ------------------------------------------------------------------ */
/* Cars                                                                */
/* ------------------------------------------------------------------ */

export const addCar = createServerFn({ method: 'POST' })
  .validator(carFields.extend({ tripId }))
  .handler(async ({ data }) => {
    await requireTrip(data.tripId)
    const [car] = await db
      .insert(cars)
      .values({
        tripId: data.tripId,
        driverName: data.driverName,
        vehicle: data.vehicle,
        seats: data.seats,
        leavingFrom: data.leavingFrom,
        contact: data.contact,
      })
      .returning({ id: cars.id })
    return { id: car.id }
  })

export const updateCar = createServerFn({ method: 'POST' })
  .validator(carFields.extend({ tripId, carId: z.number().int() }))
  .handler(async ({ data }) => {
    await requireCar(data.tripId, data.carId)
    const taken = await seatsTaken(data.carId)
    if (data.seats < taken) {
      throw new Error(
        `${taken} riders are already in this car. Move someone out before lowering seats to ${data.seats}.`,
      )
    }
    await db
      .update(cars)
      .set({
        driverName: data.driverName,
        vehicle: data.vehicle,
        seats: data.seats,
        leavingFrom: data.leavingFrom,
        contact: data.contact,
      })
      .where(eq(cars.id, data.carId))
    return { ok: true }
  })

export const removeCar = createServerFn({ method: 'POST' })
  .validator(z.object({ tripId, carId: z.number().int() }))
  .handler(async ({ data }) => {
    await requireCar(data.tripId, data.carId)
    // Riders in this car move back to the waitlist (car_id is set null on delete).
    await db.delete(cars).where(eq(cars.id, data.carId))
    return { ok: true }
  })

/* ------------------------------------------------------------------ */
/* Riders                                                              */
/* ------------------------------------------------------------------ */

export const addRider = createServerFn({ method: 'POST' })
  .validator(riderFields.extend({ tripId, carId: z.number().int().nullable().default(null) }))
  .handler(async ({ data }) => {
    await requireTrip(data.tripId)
    if (data.carId !== null) {
      const car = await requireCar(data.tripId, data.carId)
      if ((await seatsTaken(car.id)) >= car.seats) throw new Error(`${car.driverName}'s car is full`)
    }
    const [rider] = await db
      .insert(riders)
      .values({
        tripId: data.tripId,
        carId: data.carId,
        name: data.name,
        pickup: data.pickup,
        contact: data.contact,
        note: data.note,
      })
      .returning({ id: riders.id })
    return { id: rider.id }
  })

export const updateRider = createServerFn({ method: 'POST' })
  .validator(riderFields.extend({ tripId, riderId: z.number().int() }))
  .handler(async ({ data }) => {
    const result = await db
      .update(riders)
      .set({ name: data.name, pickup: data.pickup, contact: data.contact, note: data.note })
      .where(and(eq(riders.id, data.riderId), eq(riders.tripId, data.tripId)))
      .returning({ id: riders.id })
    if (result.length === 0) throw new Error('That rider is no longer on this trip')
    return { ok: true }
  })

export const removeRider = createServerFn({ method: 'POST' })
  .validator(z.object({ tripId, riderId: z.number().int() }))
  .handler(async ({ data }) => {
    await db.delete(riders).where(and(eq(riders.id, data.riderId), eq(riders.tripId, data.tripId)))
    return { ok: true }
  })

/** Put a rider in a car (or back on the waitlist when `carId` is null). */
export const assignRider = createServerFn({ method: 'POST' })
  .validator(z.object({ tripId, riderId: z.number().int(), carId: z.number().int().nullable() }))
  .handler(async ({ data }) => {
    const [rider] = await db
      .select()
      .from(riders)
      .where(and(eq(riders.id, data.riderId), eq(riders.tripId, data.tripId)))
    if (!rider) throw new Error('That rider is no longer on this trip')
    if (rider.carId === data.carId) return { ok: true }

    if (data.carId !== null) {
      const car = await requireCar(data.tripId, data.carId)
      if ((await seatsTaken(car.id)) >= car.seats) throw new Error(`${car.driverName}'s car is full`)
    }
    await db.update(riders).set({ carId: data.carId }).where(eq(riders.id, rider.id))
    return { ok: true }
  })

/**
 * Seat everyone on the waitlist who fits. Riders whose pickup spot matches a
 * driver's starting point go in that car first; the rest fill the car with the
 * most open seats so passengers spread evenly.
 */
export const autoAssign = createServerFn({ method: 'POST' })
  .validator(z.object({ tripId }))
  .handler(async ({ data }) => {
    await requireTrip(data.tripId)
    const [carRows, allRiders] = await Promise.all([
      db.select().from(cars).where(eq(cars.tripId, data.tripId)).orderBy(asc(cars.id)),
      db.select().from(riders).where(eq(riders.tripId, data.tripId)).orderBy(asc(riders.createdAt), asc(riders.id)),
    ])

    const open = new Map<number, number>()
    for (const c of carRows) {
      const taken = allRiders.filter((r) => r.carId === c.id).length
      open.set(c.id, Math.max(0, c.seats - taken))
    }

    const norm = (s: string) => s.trim().toLowerCase()
    const matches = (pickup: string, from: string) => {
      const a = norm(pickup)
      const b = norm(from)
      return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a))
    }

    const waiting = allRiders.filter((r) => r.carId === null)
    const placements: Array<{ riderId: number; carId: number }> = []
    for (const rider of waiting) {
      const withRoom = carRows.filter((c) => (open.get(c.id) ?? 0) > 0)
      if (withRoom.length === 0) break
      const nearby = withRoom.filter((c) => matches(rider.pickup, c.leavingFrom))
      const pool = nearby.length > 0 ? nearby : withRoom
      const best = pool.reduce((a, b) => ((open.get(b.id) ?? 0) > (open.get(a.id) ?? 0) ? b : a))
      open.set(best.id, (open.get(best.id) ?? 0) - 1)
      placements.push({ riderId: rider.id, carId: best.id })
    }

    for (const p of placements) {
      await db
        .update(riders)
        .set({ carId: p.carId })
        .where(and(eq(riders.id, p.riderId), isNull(riders.carId)))
    }

    return { seated: placements.length, stillWaiting: waiting.length - placements.length }
  })
