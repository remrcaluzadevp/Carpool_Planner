import { Loader2, MapPin, MoreHorizontal, Pencil, Sparkles, Trash2, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initials } from '@/lib/format'
import type { Car, Rider } from '@/lib/types'
import type { BoardActions } from './car-card'

export function Waitlist({
  waitlist,
  cars,
  seatedCounts,
  openSeats,
  actions,
  onAutoFill,
  autoFilling,
}: {
  waitlist: Rider[]
  cars: Car[]
  seatedCounts: Map<number, number>
  openSeats: number
  actions: BoardActions
  onAutoFill: () => void
  autoFilling: boolean
}) {
  const withRoom = cars.filter((c) => c.seats - (seatedCounts.get(c.id) ?? 0) > 0)

  return (
    <section
      aria-labelledby="waitlist-title"
      className="overflow-hidden rounded-[1.5rem] border-2 border-primary bg-card shadow-[5px_5px_0_var(--primary)]"
    >
      <div className="flex items-center justify-between gap-2 bg-coral px-5 py-3 text-coral-foreground">
        <h2 id="waitlist-title" className="font-display text-lg font-bold">
          Needs a seat
        </h2>
        <span className="rounded-full bg-coral-foreground/20 px-2.5 py-0.5 font-ticket text-xs">{waitlist.length}</span>
      </div>

      <div className="p-4">
        {waitlist.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border px-4 py-6 text-center">
            <p className="font-display text-base font-bold">Nobody's left behind 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">New riders land here until they get a seat.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {waitlist.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/70 p-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coral/15 font-display text-sm font-extrabold">
                  {initials(r.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  {r.pickup && (
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3" aria-hidden />
                      {r.pickup}
                    </p>
                  )}
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Options for ${r.name}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Seat {r.name} in…</DropdownMenuLabel>
                    {withRoom.length === 0 && (
                      <DropdownMenuItem disabled>No open seats yet</DropdownMenuItem>
                    )}
                    {withRoom.map((c) => (
                      <DropdownMenuItem key={c.id} onSelect={() => actions.assign(r, c.id)}>
                        {c.driverName}'s car · {c.seats - (seatedCounts.get(c.id) ?? 0)} open
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => actions.editRider(r)}>
                      <Pencil /> Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => actions.removeRider(r)}>
                      <Trash2 /> Remove from trip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-2">
          <Button
            onClick={onAutoFill}
            disabled={autoFilling || waitlist.length === 0 || openSeats === 0}
            className="bg-accent text-accent-foreground shadow-[0_3px_0_var(--primary)] hover:bg-accent/90 active:translate-y-0.5 active:shadow-none"
          >
            {autoFilling ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Auto-fill seats
          </Button>
          <Button variant="outline" onClick={() => actions.addRiderToCar(null)}>
            <UserPlus /> Add a rider
          </Button>
          {waitlist.length > 0 && openSeats === 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Every car is full — {waitlist.length === 1 ? 'one more rider needs' : `${waitlist.length} riders need`} another driver.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
