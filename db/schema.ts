import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

/** A planned trip. `id` is a random, unguessable slug used in the share link. */
export const trips = pgTable('trips', {
  id: text().primaryKey(),
  name: text().notNull(),
  destination: text().notNull(),
  meetingPoint: text('meeting_point').notNull().default(''),
  departAt: timestamp('depart_at', { withTimezone: true }).notNull(),
  returnAt: timestamp('return_at', { withTimezone: true }),
  notes: text().notNull().default(''),
  /** IANA zone of the organizer, so every viewer sees the same local departure time. */
  timeZone: text('time_zone').notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

/** A car offered by a driver. `seats` counts passenger seats (driver excluded). */
export const cars = pgTable(
  'cars',
  {
    id: serial().primaryKey(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    driverName: text('driver_name').notNull(),
    vehicle: text().notNull().default(''),
    seats: integer().notNull(),
    leavingFrom: text('leaving_from').notNull().default(''),
    contact: text().notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('cars_trip_idx').on(t.tripId)],
)

/** A rider who needs a seat. `carId` is null while they wait for a ride. */
export const riders = pgTable(
  'riders',
  {
    id: serial().primaryKey(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    carId: integer('car_id').references(() => cars.id, { onDelete: 'set null' }),
    name: text().notNull(),
    pickup: text().notNull().default(''),
    contact: text().notNull().default(''),
    note: text().notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('riders_trip_idx').on(t.tripId)],
)
