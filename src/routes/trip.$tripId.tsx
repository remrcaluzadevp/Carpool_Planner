import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { ArrowRight, CalendarClock, Car as CarIcon, Link2, Loader2, MapPin, Pencil, Plus, StickyNote, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Logo } from '@/components/brand'
import { InstallAppButton } from '@/components/install-app'
import { CarCard, type BoardActions } from '@/components/trip/car-card'
import { CarDialog, RiderDialog, TripDialog } from '@/components/trip/dialogs'
import { DownloadMenu } from '@/components/trip/download-menu'
import { PrintSheet } from '@/components/trip/print-sheet'
import { Waitlist } from '@/components/trip/waitlist'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDay, formatTime, zoneLabel } from '@/lib/format'
import { rememberTrip } from '@/lib/recent-trips'
import {
  addCar,
  addRider,
  assignRider,
  autoAssign,
  getTripBoard,
  removeCar,
  removeRider,
  updateCar,
  updateRider,
  updateTrip,
} from '@/lib/trips.functions'
import type { Car, Rider, Trip } from '@/lib/types'

export const Route = createFileRoute('/trip/$tripId')({
  loader: async ({ params }) => {
    if (!/^[a-z0-9]{6,32}$/.test(params.tripId)) throw notFound()
    const board = await getTripBoard({ data: { tripId: params.tripId } })
    if (!board) throw notFound()
    return board
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.trip.name} · Carpool Planner` },
          { property: 'og:title', content: `${loaderData.trip.name} — grab a seat` },
          {
            property: 'og:description',
            content: `Carpool to ${loaderData.trip.destination} on ${formatDay(loaderData.trip.departAt, loaderData.trip.timeZone)}. Pick your seat.`,
          },
        ]
      : [],
  }),
  pendingComponent: BoardSkeleton,
  component: TripPage,
})

type Confirm = { title: string; body: string; action: () => Promise<unknown>; cta: string } | null

function TripPage() {
  const board = Route.useLoaderData()
  const { trip, cars, riders } = board
  const router = useRouter()

  const [busy, setBusy] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const [shareUrl, setShareUrl] = useState(`/trip/${trip.id}`)

  const [tripOpen, setTripOpen] = useState(false)
  const [carDialog, setCarDialog] = useState<{ open: boolean; car?: Car }>({ open: false })
  const [riderDialog, setRiderDialog] = useState<{ open: boolean; rider?: Rider; carId?: number | null }>({
    open: false,
  })
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setShareUrl(`${window.location.origin}/trip/${trip.id}`)
    rememberTrip({ id: trip.id, name: trip.name, destination: trip.destination, departAt: trip.departAt })
  }, [trip.id, trip.name, trip.destination, trip.departAt])

  // Pick up changes other riders made while this tab was in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.invalidate()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [router])

  const seatedCounts = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of riders) if (r.carId !== null) m.set(r.carId, (m.get(r.carId) ?? 0) + 1)
    return m
  }, [riders])

  const waitlist = riders.filter((r) => r.carId === null)
  const totalSeats = cars.reduce((n, c) => n + c.seats, 0)
  const filled = riders.length - waitlist.length
  const openSeats = totalSeats - filled

  /** Run a mutation, refresh the board, toast the outcome. Rethrows so dialogs stay open on failure. */
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string) => {
      setBusy(true)
      try {
        const result = await fn()
        await router.invalidate()
        if (success) toast.success(success)
        return result
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong. Try again.')
        await router.invalidate()
        throw err
      } finally {
        setBusy(false)
      }
    },
    [router],
  )

  const tripId = trip.id
  const actions: BoardActions = {
    assign: (rider, carId) => {
      const car = cars.find((c) => c.id === carId)
      run(
        () => assignRider({ data: { tripId, riderId: rider.id, carId } }),
        car ? `${rider.name} is riding with ${car.driverName}` : `${rider.name} is back on the waitlist`,
      ).catch(() => {})
    },
    editRider: (rider) => setRiderDialog({ open: true, rider }),
    removeRider: (rider) =>
      setConfirm({
        title: `Remove ${rider.name}?`,
        body: 'They lose their seat and come off the trip. You can always add them back.',
        cta: 'Remove rider',
        action: () => run(() => removeRider({ data: { tripId, riderId: rider.id } }), `${rider.name} removed`),
      }),
    addRiderToCar: (carId) => setRiderDialog({ open: true, carId }),
    editCar: (car) => setCarDialog({ open: true, car }),
    removeCar: (car) =>
      setConfirm({
        title: `Remove ${car.driverName}'s car?`,
        body: `Anyone in this car (${seatedCounts.get(car.id) ?? 0}) moves back to the waitlist.`,
        cta: 'Remove car',
        action: () => run(() => removeCar({ data: { tripId, carId: car.id } }), 'Car removed'),
      }),
  }

  async function autoFill() {
    setAutoFilling(true)
    try {
      const r = await run(() => autoAssign({ data: { tripId } }))
      if (r.seated === 0) toast.info('No one could be seated — add another driver')
      else
        toast.success(
          `Seated ${r.seated} ${r.seated === 1 ? 'rider' : 'riders'}${r.stillWaiting ? ` · ${r.stillWaiting} still waiting` : ''}`,
        )
    } catch {
      /* toasted by run */
    } finally {
      setAutoFilling(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied — send it to your group')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="no-print">
        <header className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <Logo />
          <div className="flex flex-wrap items-center gap-2">
            <InstallAppButton variant="ghost" label="Get the app" className="hidden md:inline-flex" />
            <Button variant="outline" onClick={copyLink}>
              <Link2 /> Share link
            </Button>
            <DownloadMenu board={board} shareUrl={shareUrl} />
          </div>
        </header>

        <main className="mx-auto max-w-content px-4 pb-20 sm:px-6">
          <BoardingPass
            onEdit={() => setTripOpen(true)}
            trip={trip}
            filled={filled}
            totalSeats={totalSeats}
            waiting={waitlist.length}
            drivers={cars.length}
          />

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
            <section aria-labelledby="cars-title">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h2 id="cars-title" className="font-display text-3xl font-extrabold">
                    Cars
                  </h2>
                  <p className="text-sm text-muted-foreground">Tap an open seat to fill it, or a rider to move them.</p>
                </div>
                <Button onClick={() => setCarDialog({ open: true })} disabled={busy}>
                  <Plus /> Add driver
                </Button>
              </div>

              {cars.length === 0 ? (
                <EmptyCars onAdd={() => setCarDialog({ open: true })} />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {cars.map((car, i) => (
                    <CarCard
                      key={car.id}
                      car={car}
                      index={i}
                      seated={riders.filter((r) => r.carId === car.id)}
                      waitlist={waitlist}
                      otherCars={cars.filter((c) => c.id !== car.id)}
                      seatedCounts={seatedCounts}
                      actions={actions}
                      busy={busy}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setCarDialog({ open: true })}
                    className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-primary/30 text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
                  >
                    <Plus className="size-6" aria-hidden />
                    <span className="font-display text-lg font-bold">Another driver?</span>
                    <span className="text-sm">Add a car with open seats</span>
                  </button>
                </div>
              )}
            </section>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <Waitlist
                waitlist={waitlist}
                cars={cars}
                seatedCounts={seatedCounts}
                openSeats={openSeats}
                actions={actions}
                onAutoFill={autoFill}
                autoFilling={autoFilling}
              />
              {trip.notes && (
                <div className="mt-6 rounded-2xl border-2 border-primary/20 bg-card p-4">
                  <p className="mb-1 flex items-center gap-1.5 font-ticket text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <StickyNote className="size-3.5" aria-hidden /> Trip notes
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{trip.notes}</p>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>

      <PrintSheet board={board} shareUrl={shareUrl} />

      <TripDialog
        open={tripOpen}
        onOpenChange={setTripOpen}
        trip={trip}
        onSave={(input) => run(() => updateTrip({ data: { tripId, ...input } }), 'Trip updated')}
      />
      <CarDialog
        open={carDialog.open}
        onOpenChange={(open) => setCarDialog((d) => ({ ...d, open }))}
        car={carDialog.car}
        minSeats={carDialog.car ? (seatedCounts.get(carDialog.car.id) ?? 0) : 1}
        onSave={(input) =>
          carDialog.car
            ? run(() => updateCar({ data: { tripId, carId: carDialog.car!.id, ...input } }), 'Car updated')
            : run(() => addCar({ data: { tripId, ...input } }), `${input.driverName.trim()} is driving 🚗`)
        }
      />
      <RiderDialog
        open={riderDialog.open}
        onOpenChange={(open) => setRiderDialog((d) => ({ ...d, open }))}
        rider={riderDialog.rider}
        presetCarId={riderDialog.carId ?? null}
        cars={cars}
        seatedCounts={seatedCounts}
        onSave={(input) =>
          riderDialog.rider
            ? run(
                () =>
                  updateRider({
                    data: {
                      tripId,
                      riderId: riderDialog.rider!.id,
                      name: input.name,
                      pickup: input.pickup,
                      contact: input.contact,
                      note: input.note,
                    },
                  }),
                'Rider updated',
              )
            : run(
                () => addRider({ data: { tripId, ...input } }),
                input.carId ? `${input.name.trim()} has a seat` : `${input.name.trim()} joined the waitlist`,
              )
        }
      />

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && !confirming && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={confirming}>
              Keep
            </Button>
            <Button
              variant="destructive"
              disabled={confirming}
              onClick={async () => {
                if (!confirm) return
                setConfirming(true)
                try {
                  await confirm.action()
                  setConfirm(null)
                } catch {
                  /* toasted */
                } finally {
                  setConfirming(false)
                }
              }}
            >
              {confirming && <Loader2 className="animate-spin" />}
              {confirm?.cta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function BoardingPass({
  trip,
  filled,
  totalSeats,
  waiting,
  drivers,
  onEdit,
}: {
  trip: Trip
  filled: number
  totalSeats: number
  waiting: number
  drivers: number
  onEdit: () => void
}) {
  const pct = totalSeats ? Math.round((filled / totalSeats) * 100) : 0
  return (
    <section
      aria-labelledby="trip-title"
      className="rise grid overflow-hidden rounded-[1.75rem] border-2 border-primary bg-card shadow-[8px_8px_0_var(--primary)] md:grid-cols-[1fr_auto_16rem]"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-ticket text-[11px] uppercase tracking-[0.22em] text-coral">Carpool · Boarding pass</p>
            <h1 id="trip-title" className="mt-1 break-words font-display text-4xl font-extrabold leading-none sm:text-5xl">
              {trip.name}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
            <Pencil /> Edit
          </Button>
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="min-w-0">
            <p className="font-ticket text-[10px] uppercase tracking-[0.2em] text-muted-foreground">From</p>
            <p className="truncate font-display text-xl font-bold sm:text-2xl">{trip.meetingPoint || 'Campus'}</p>
          </div>
          <div className="flex w-16 items-center gap-1 sm:w-32" aria-hidden>
            <span className="road h-1 flex-1" />
            <CarIcon className="size-5 shrink-0 text-coral" />
            <ArrowRight className="size-4 shrink-0 text-primary/40" />
          </div>
          <div className="min-w-0 text-right">
            <p className="font-ticket text-[10px] uppercase tracking-[0.2em] text-muted-foreground">To</p>
            <p className="truncate font-display text-xl font-bold sm:text-2xl">
              <MapPin className="mr-1 inline size-5 text-coral" aria-hidden />
              {trip.destination}
            </p>
          </div>
        </div>

        <dl className="mt-7 grid grid-cols-2 gap-4 border-t-2 border-dashed border-border pt-5 sm:grid-cols-3">
          <Stat
            label="Departs"
            value={formatDay(trip.departAt, trip.timeZone)}
            sub={`${formatTime(trip.departAt, trip.timeZone)} ${zoneLabel(trip.departAt, trip.timeZone)}`}
          />
          <Stat
            label="Returns"
            value={trip.returnAt ? formatDay(trip.returnAt, trip.timeZone) : 'One way'}
            sub={trip.returnAt ? `${formatTime(trip.returnAt, trip.timeZone)} ${zoneLabel(trip.returnAt, trip.timeZone)}` : '—'}
          />
          <Stat label="Drivers" value={String(drivers)} sub={drivers === 1 ? 'car' : 'cars'} />
        </dl>
      </div>

      <div className="perforation-y hidden w-5 border-x-2 border-dashed border-border md:block" aria-hidden />
      <div className="perforation h-5 border-y-2 border-dashed border-border md:hidden" aria-hidden />

      <div className="flex flex-col justify-between gap-5 bg-primary p-6 text-primary-foreground">
        <div>
          <p className="font-ticket text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">Seats filled</p>
          <p className="font-display text-6xl font-extrabold leading-none">
            {filled}
            <span className="text-2xl text-primary-foreground/50">/{totalSeats}</span>
          </p>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary-foreground/15"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Seats filled"
          >
            <div className="h-full rounded-full bg-sun transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 p-3">
          <Users className="size-5 text-sun" aria-hidden />
          <p className="text-sm">
            {waiting === 0 ? (
              'Everyone has a seat'
            ) : (
              <>
                <strong className="text-sun">{waiting}</strong> {waiting === 1 ? 'rider needs' : 'riders need'} a seat
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 font-ticket text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label === 'Departs' && <CalendarClock className="size-3" aria-hidden />}
        {label}
      </dt>
      <dd className="font-display text-lg font-bold leading-tight">{value}</dd>
      <dd className="text-sm text-muted-foreground">{sub}</dd>
    </div>
  )
}

function EmptyCars({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[1.5rem] border-2 border-dashed border-primary/30 bg-card/60 px-6 py-14 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-accent ring-2 ring-primary">
        <CarIcon className="size-8" aria-hidden />
      </div>
      <h3 className="font-display text-2xl font-extrabold">No drivers yet</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Add the first car and its open seats. Riders can join the waitlist in the meantime — share the link in your
        group chat.
      </p>
      <Button onClick={onAdd} className="mt-6">
        <Plus /> Add the first driver
      </Button>
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="mx-auto max-w-content px-4 py-5 sm:px-6" role="status" aria-label="Loading trip">
      <div className="mb-6 flex justify-between">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-72 w-full rounded-[1.75rem]" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-[1.5rem]" />
          <Skeleton className="h-80 rounded-[1.5rem]" />
        </div>
        <Skeleton className="h-96 rounded-[1.5rem]" />
      </div>
    </div>
  )
}
