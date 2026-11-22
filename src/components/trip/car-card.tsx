import { useState } from 'react'
import { CircleUserRound, MapPin, MoreHorizontal, Pencil, Phone, Plus, Trash2, Undo2, ArrowRightLeft, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Car, Rider } from '@/lib/types'

export type BoardActions = {
  assign: (rider: Rider, carId: number | null) => void
  editRider: (rider: Rider) => void
  removeRider: (rider: Rider) => void
  addRiderToCar: (carId: number | null) => void
  editCar: (car: Car) => void
  removeCar: (car: Car) => void
}

function chunk<T>(list: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export function CarCard({
  car,
  index,
  seated,
  waitlist,
  otherCars,
  seatedCounts,
  actions,
  busy,
}: {
  car: Car
  index: number
  seated: Rider[]
  waitlist: Rider[]
  otherCars: Car[]
  seatedCounts: Map<number, number>
  actions: BoardActions
  busy: boolean
}) {
  const open = car.seats - seated.length
  const slots: Array<Rider | null> = Array.from({ length: car.seats }, (_, i) => seated[i] ?? null)
  const [front, ...rest] = slots
  const backRows = chunk(rest, 3)

  return (
    <article
      className="rise overflow-hidden rounded-[1.5rem] border-2 border-primary bg-card shadow-[5px_5px_0_var(--primary)]"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
      aria-label={`${car.driverName}'s car`}
    >
      <header className="flex items-start gap-3 border-b-2 border-dashed border-border p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent font-display text-base font-extrabold text-accent-foreground ring-2 ring-primary">
          {initials(car.driverName) || <CircleUserRound />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-ticket text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Car {index + 1}</p>
          <h3 className="truncate font-display text-xl font-bold leading-tight">{car.driverName}</h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {car.vehicle && <span className="truncate">{car.vehicle}</span>}
            {car.leavingFrom && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {car.leavingFrom}
              </span>
            )}
            {car.contact && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" aria-hidden />
                {car.contact}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 font-ticket text-xs font-medium',
              open > 0 ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground',
            )}
          >
            {open > 0 ? `${open} open` : 'Full'}
          </span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Options for ${car.driverName}'s car`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => actions.editCar(car)}>
                <Pencil /> Edit car
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.addRiderToCar(car.id)} disabled={open <= 0}>
                <UserPlus /> Add rider here
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => actions.removeCar(car)}>
                <Trash2 /> Remove car
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Top-down seat map */}
      <div className="p-4">
        <div className="relative rounded-t-[2.5rem] rounded-b-2xl border-2 border-primary/80 bg-muted/60 p-3 pt-5">
          <span className="absolute left-1/2 top-1.5 h-1 w-16 -translate-x-1/2 rounded-full bg-primary/20" aria-hidden />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex h-16 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <SteeringWheel />
              <span className="mt-0.5 font-ticket text-[10px] uppercase tracking-widest opacity-80">Driver</span>
            </div>
            {front !== undefined && (
              <Seat
                rider={front}
                number={1}
                car={car}
                waitlist={waitlist}
                otherCars={otherCars}
                seatedCounts={seatedCounts}
                actions={actions}
                busy={busy}
              />
            )}
          </div>
          {backRows.map((row, r) => (
            <div key={r} className="mt-2 grid grid-cols-3 gap-2">
              {row.map((rider, i) => (
                <Seat
                  key={i}
                  rider={rider}
                  number={2 + r * 3 + i}
                  car={car}
                  waitlist={waitlist}
                  otherCars={otherCars}
                  seatedCounts={seatedCounts}
                  actions={actions}
                  busy={busy}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function SteeringWheel() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3.5 10.5 9.5 12M14.5 12l6-1.5M12 14.5V21" />
    </svg>
  )
}

function Seat({
  rider,
  number,
  car,
  waitlist,
  otherCars,
  seatedCounts,
  actions,
  busy,
}: {
  rider: Rider | null
  number: number
  car: Car
  waitlist: Rider[]
  otherCars: Car[]
  seatedCounts: Map<number, number>
  actions: BoardActions
  busy: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  if (!rider) {
    return (
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className="group flex h-16 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-card/60 text-muted-foreground transition-colors hover:border-coral hover:bg-coral/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 motion-reduce:transition-none"
            aria-label={`Seat ${number} in ${car.driverName}'s car is open. Fill it`}
          >
            <Plus className="size-4 transition-transform group-hover:scale-125 motion-reduce:transition-none" aria-hidden />
            <span className="font-ticket text-[10px] uppercase tracking-widest">Open</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <p className="px-2 pb-2 pt-1 font-ticket text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Seat {number} · {car.driverName}
          </p>
          {waitlist.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto">
              {waitlist.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpen(false)
                      actions.assign(w, car.id)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-coral/15 font-ticket text-[11px] font-medium text-foreground">
                      {initials(w.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{w.name}</span>
                      {w.pickup && <span className="block truncate text-xs text-muted-foreground">{w.pickup}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 pb-2 text-sm text-muted-foreground">No one is waiting for a seat.</p>
          )}
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => {
              setPickerOpen(false)
              actions.addRiderToCar(car.id)
            }}
          >
            <UserPlus /> New rider in this seat
          </Button>
        </PopoverContent>
      </Popover>
    )
  }

  const movable = otherCars.filter((c) => c.seats - (seatedCounts.get(c.id) ?? 0) > 0)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={busy}
          className="flex h-16 min-w-0 flex-col items-center justify-center rounded-xl border-2 border-primary bg-accent px-1 text-accent-foreground shadow-[0_2px_0_var(--primary)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 motion-reduce:transition-none"
          aria-label={`Seat ${number}: ${rider.name}. Options`}
        >
          <span className="font-display text-sm font-extrabold leading-none">{initials(rider.name)}</span>
          <span className="mt-1 w-full truncate text-center text-xs font-medium">{rider.name.split(' ')[0]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>
          <span className="block font-display text-base">{rider.name}</span>
          {(rider.pickup || rider.contact) && (
            <span className="block text-xs font-normal text-muted-foreground">
              {[rider.pickup && `Pickup: ${rider.pickup}`, rider.contact].filter(Boolean).join(' · ')}
            </span>
          )}
          {rider.note && <span className="block text-xs font-normal italic text-muted-foreground">“{rider.note}”</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={movable.length === 0}>
            <ArrowRightLeft className="size-4" /> Move to another car
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {movable.map((c) => (
              <DropdownMenuItem key={c.id} onSelect={() => actions.assign(rider, c.id)}>
                {c.driverName}'s car · {c.seats - (seatedCounts.get(c.id) ?? 0)} open
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => actions.assign(rider, null)}>
          <Undo2 /> Back to waitlist
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.editRider(rider)}>
          <Pencil /> Edit details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => actions.removeRider(rider)}>
          <Trash2 /> Remove from trip
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
