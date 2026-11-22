import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { fromLocalInput, toLocalInput } from '@/lib/format'
import type { Car, Rider, Trip } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="font-ticket text-[11px] uppercase tracking-[0.16em]">
          {label}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

type Errors<T> = Partial<Record<keyof T, string>>

function useForm<T extends Record<string, string>>(open: boolean, initial: () => T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Errors<T>>({})
  const [saving, setSaving] = useState(false)

  // Reset whenever the dialog opens so edits start from the current record.
  useEffect(() => {
    if (open) {
      setValues(initial())
      setErrors({})
      setSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const bind = (key: keyof T) => ({
    id: String(key),
    value: values[key],
    'aria-invalid': !!errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }))
      setErrors((er) => ({ ...er, [key]: undefined }))
    },
  })

  return { values, setValues, errors, setErrors, saving, setSaving, bind }
}

function SaveButton({ saving, children }: { saving: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={saving}>
      {saving && <Loader2 className="animate-spin" />}
      {saving ? 'Saving…' : children}
    </Button>
  )
}

/** Runs the save; returns true on success. Failures keep the dialog open. */
async function runSave(setSaving: (b: boolean) => void, fn: () => Promise<unknown>) {
  setSaving(true)
  try {
    await fn()
    return true
  } catch {
    setSaving(false)
    return false
  }
}

/* ------------------------------------------------------------------ */
/* Trip                                                                */
/* ------------------------------------------------------------------ */

export type TripInput = Omit<Trip, 'id' | 'timeZone'>

export function TripDialog({
  open,
  onOpenChange,
  trip,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  trip: Trip
  onSave: (input: TripInput) => Promise<unknown>
}) {
  const f = useForm(open, () => ({
    name: trip.name,
    destination: trip.destination,
    meetingPoint: trip.meetingPoint,
    departAt: toLocalInput(trip.departAt),
    returnAt: toLocalInput(trip.returnAt),
    notes: trip.notes,
  }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = f.values
    const errs: Errors<typeof v> = {}
    const departAt = fromLocalInput(v.departAt)
    const returnAt = fromLocalInput(v.returnAt)
    if (!v.name.trim()) errs.name = 'Give the trip a name'
    if (!v.destination.trim()) errs.destination = 'Where are you headed?'
    if (!departAt) errs.departAt = 'Pick a departure time'
    if (departAt && returnAt && new Date(returnAt) <= new Date(departAt))
      errs.returnAt = 'Return should be after departure'
    f.setErrors(errs)
    if (Object.keys(errs).length || !departAt) return
    const ok = await runSave(f.setSaving, () =>
      onSave({
        name: v.name,
        destination: v.destination,
        meetingPoint: v.meetingPoint,
        departAt,
        returnAt,
        notes: v.notes,
      }),
    )
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Edit trip details</DialogTitle>
            <DialogDescription>Changes show up for everyone with the link.</DialogDescription>
          </DialogHeader>
          <Field id="name" label="Trip name" error={f.errors.name}>
            <Input {...f.bind('name')} maxLength={80} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="meetingPoint" label="From" hint="Optional">
              <Input {...f.bind('meetingPoint')} maxLength={120} />
            </Field>
            <Field id="destination" label="To" error={f.errors.destination}>
              <Input {...f.bind('destination')} maxLength={120} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="departAt" label="Departs" error={f.errors.departAt}>
              <Input type="datetime-local" {...f.bind('departAt')} />
            </Field>
            <Field id="returnAt" label="Returns" hint="Optional" error={f.errors.returnAt}>
              <Input type="datetime-local" {...f.bind('returnAt')} />
            </Field>
          </div>
          <Field id="notes" label="Notes" hint="Optional">
            <Textarea rows={3} {...f.bind('notes')} maxLength={1000} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SaveButton saving={f.saving}>Save trip</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Car                                                                 */
/* ------------------------------------------------------------------ */

export type CarInput = Omit<Car, 'id'>

export function CarDialog({
  open,
  onOpenChange,
  car,
  minSeats = 1,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  car?: Car
  /** Riders already seated; seats can't drop below this. */
  minSeats?: number
  onSave: (input: CarInput) => Promise<unknown>
}) {
  const f = useForm(open, () => ({
    driverName: car?.driverName ?? '',
    vehicle: car?.vehicle ?? '',
    seats: String(car?.seats ?? 4),
    leavingFrom: car?.leavingFrom ?? '',
    contact: car?.contact ?? '',
  }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = f.values
    const errs: Errors<typeof v> = {}
    const seats = Number(v.seats)
    if (!v.driverName.trim()) errs.driverName = 'Who is driving?'
    if (!Number.isInteger(seats) || seats < 1 || seats > 12) errs.seats = 'Between 1 and 12 seats'
    else if (seats < minSeats) errs.seats = `${minSeats} riders are already in this car`
    f.setErrors(errs)
    if (Object.keys(errs).length) return
    const ok = await runSave(f.setSaving, () =>
      onSave({
        driverName: v.driverName,
        vehicle: v.vehicle,
        seats,
        leavingFrom: v.leavingFrom,
        contact: v.contact,
      }),
    )
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{car ? 'Edit car' : 'Add a driver'}</DialogTitle>
            <DialogDescription>
              Count passenger seats only — the driver's seat is already taken care of.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <Field id="driverName" label="Driver" error={f.errors.driverName}>
              <Input {...f.bind('driverName')} placeholder="Maya Chen" maxLength={60} autoFocus />
            </Field>
            <Field id="seats" label="Open seats" error={f.errors.seats}>
              <Input type="number" inputMode="numeric" min={Math.max(1, minSeats)} max={12} {...f.bind('seats')} />
            </Field>
          </div>
          <Field id="vehicle" label="Car" hint="Optional">
            <Input {...f.bind('vehicle')} placeholder="Blue Honda Civic" maxLength={60} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="leavingFrom" label="Leaving from" hint="Optional">
              <Input {...f.bind('leavingFrom')} placeholder="West Hall" maxLength={120} />
            </Field>
            <Field id="contact" label="Phone or @handle" hint="Optional">
              <Input {...f.bind('contact')} placeholder="@maya.drives" maxLength={80} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SaveButton saving={f.saving}>{car ? 'Save car' : 'Add car'}</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Rider                                                               */
/* ------------------------------------------------------------------ */

export type RiderInput = Omit<Rider, 'id'>

const WAITLIST = 'waitlist'

export function RiderDialog({
  open,
  onOpenChange,
  rider,
  cars,
  seatedCounts,
  presetCarId = null,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  rider?: Rider
  cars: Car[]
  seatedCounts: Map<number, number>
  presetCarId?: number | null
  onSave: (input: RiderInput) => Promise<unknown>
}) {
  const f = useForm(open, () => ({
    name: rider?.name ?? '',
    pickup: rider?.pickup ?? '',
    contact: rider?.contact ?? '',
    note: rider?.note ?? '',
    car: String(rider ? (rider.carId ?? WAITLIST) : (presetCarId ?? WAITLIST)),
  }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = f.values
    const errs: Errors<typeof v> = {}
    if (!v.name.trim()) errs.name = 'What should we call you?'
    f.setErrors(errs)
    if (Object.keys(errs).length) return
    const ok = await runSave(f.setSaving, () =>
      onSave({
        name: v.name,
        pickup: v.pickup,
        contact: v.contact,
        note: v.note,
        carId: v.car === WAITLIST ? null : Number(v.car),
      }),
    )
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{rider ? 'Edit rider' : 'Add a rider'}</DialogTitle>
            <DialogDescription>
              {rider ? 'Update pickup details for this rider.' : 'Claim a seat now, or join the waitlist and get auto-filled.'}
            </DialogDescription>
          </DialogHeader>
          <Field id="name" label="Name" error={f.errors.name}>
            <Input {...f.bind('name')} placeholder="Jordan Rivera" maxLength={60} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pickup" label="Pickup spot" hint="Optional">
              <Input {...f.bind('pickup')} placeholder="West Hall" maxLength={120} />
            </Field>
            <Field id="contact" label="Phone or @handle" hint="Optional">
              <Input {...f.bind('contact')} placeholder="@jordan" maxLength={80} />
            </Field>
          </div>
          {!rider && (
            <div className="space-y-1.5">
              <Label htmlFor="car" className="font-ticket text-[11px] uppercase tracking-[0.16em]">
                Seat
              </Label>
              <Select value={f.values.car} onValueChange={(car) => f.setValues((v) => ({ ...v, car }))}>
                <SelectTrigger id="car" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WAITLIST}>Waitlist — seat me automatically</SelectItem>
                  {cars.map((c) => {
                    const left = c.seats - (seatedCounts.get(c.id) ?? 0)
                    return (
                      <SelectItem key={c.id} value={String(c.id)} disabled={left <= 0}>
                        {c.driverName}'s car {left > 0 ? `· ${left} open` : '· full'}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <Field id="note" label="Note" hint="Optional">
            <Input {...f.bind('note')} placeholder="Bringing a big suitcase" maxLength={200} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <SaveButton saving={f.saving}>{rider ? 'Save rider' : 'Add rider'}</SaveButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
