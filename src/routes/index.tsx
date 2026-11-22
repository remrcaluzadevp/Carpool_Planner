import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  CalendarPlus,
  Car,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Printer,
  Sparkles,
  Ticket,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Logo } from '@/components/brand'
import { InstallAppButton } from '@/components/install-app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { browserTimeZone, formatDay, formatTime, fromLocalInput } from '@/lib/format'
import { forgetTrip, readRecentTrips, rememberTrip, type RecentTrip } from '@/lib/recent-trips'
import { createTrip } from '@/lib/trips.functions'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-content items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <a
            href="#how"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            How it works
          </a>
          <InstallAppButton variant="ghost" label="Get the app" />
        </nav>
      </header>

      <main>
        <Hero />
        <RecentTrips />
        <HowItWorks />
        <TakeItWithYou />
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo compact />
          <p>Made for dorm runs, game days, and every road trip in between.</p>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="mx-auto grid max-w-content gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-14 lg:pt-12">
      <div className="rise">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-1 font-ticket text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-2 rounded-full bg-coral" aria-hidden /> Built for students
        </p>
        <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
          Everyone gets
          <br />
          <span className="relative inline-block">
            a seat.
            <span className="road absolute -bottom-2 left-0 h-1 w-full" aria-hidden />
          </span>
        </h1>
        <p className="mt-7 max-w-reading text-lg text-muted-foreground sm:text-xl">
          Plan the trip, line up drivers, and fill every car without the 200-message group chat. Share one
          link, let riders claim seats, then download the roster.
        </p>

        <div className="drive-in relative mt-10 hidden overflow-hidden rounded-[1.75rem] border-2 border-primary shadow-[8px_8px_0_var(--primary)] lg:block">
          <img
            src="/.netlify/images?url=/img/hero.png&w=1100&fm=webp"
            srcSet="/.netlify/images?url=/img/hero.png&w=700&fm=webp 700w, /.netlify/images?url=/img/hero.png&w=1100&fm=webp 1100w"
            sizes="(min-width: 1024px) 560px, 100vw"
            alt="Four students laughing in a yellow car with backpacks and a guitar on the roof, driving toward campus"
            width={1376}
            height={768}
            className="block h-auto w-full"
          />
        </div>
      </div>

      <div className="rise [animation-delay:120ms]">
        <NewTripPass />
        <div className="mt-8 overflow-hidden rounded-[1.5rem] border-2 border-primary shadow-[6px_6px_0_var(--primary)] lg:hidden">
          <img
            src="/.netlify/images?url=/img/hero.png&w=800&fm=webp"
            alt="Four students laughing in a yellow car with backpacks and a guitar on the roof, driving toward campus"
            width={1376}
            height={768}
            className="block h-auto w-full"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

type FormState = {
  name: string
  destination: string
  meetingPoint: string
  departAt: string
  returnAt: string
  notes: string
}

const emptyForm: FormState = {
  name: '',
  destination: '',
  meetingPoint: '',
  departAt: '',
  returnAt: '',
  notes: '',
}

function NewTripPass() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'Give the trip a name'
    if (!form.destination.trim()) next.destination = 'Where are you headed?'
    const departAt = fromLocalInput(form.departAt)
    const returnAt = fromLocalInput(form.returnAt)
    if (!departAt) next.departAt = 'Pick a departure time'
    if (departAt && returnAt && new Date(returnAt) <= new Date(departAt))
      next.returnAt = 'Return should be after departure'
    setErrors(next)
    if (Object.keys(next).length || !departAt) return

    setSaving(true)
    try {
      const { id } = await createTrip({
        data: {
          name: form.name,
          destination: form.destination,
          meetingPoint: form.meetingPoint,
          departAt,
          returnAt,
          notes: form.notes,
          timeZone: browserTimeZone(),
        },
      })
      rememberTrip({ id, name: form.name.trim(), destination: form.destination.trim(), departAt })
      toast.success('Trip created — now add drivers and riders')
      await navigate({ to: '/trip/$tripId', params: { tripId: id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the trip. Try again.')
      setSaving(false)
    }
  }

  return (
    <form
      id="plan"
      onSubmit={onSubmit}
      noValidate
      className="relative overflow-hidden rounded-[1.75rem] border-2 border-primary bg-card shadow-[8px_8px_0_var(--primary)]"
      aria-labelledby="plan-title"
    >
      <div className="flex items-center justify-between bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Ticket className="size-5 text-sun" aria-hidden />
          <h2 id="plan-title" className="font-display text-xl font-bold">
            Plan a trip
          </h2>
        </div>
        <span className="font-ticket text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
          Boarding pass
        </span>
      </div>

      <div className="space-y-5 p-6">
        <Field label="Trip name" error={errors.name} htmlFor="name">
          <Input
            id="name"
            placeholder="Spring break at the lake"
            value={form.name}
            onChange={set('name')}
            aria-invalid={!!errors.name}
            maxLength={80}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="From (meeting spot)" htmlFor="meetingPoint" hint="Optional">
            <Input
              id="meetingPoint"
              placeholder="North Dorms lot"
              value={form.meetingPoint}
              onChange={set('meetingPoint')}
              maxLength={120}
            />
          </Field>
          <Field label="To (destination)" error={errors.destination} htmlFor="destination">
            <Input
              id="destination"
              placeholder="Lake Tahoe"
              value={form.destination}
              onChange={set('destination')}
              aria-invalid={!!errors.destination}
              maxLength={120}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Departs" error={errors.departAt} htmlFor="departAt">
            <Input
              id="departAt"
              type="datetime-local"
              value={form.departAt}
              onChange={set('departAt')}
              aria-invalid={!!errors.departAt}
            />
          </Field>
          <Field label="Returns" error={errors.returnAt} htmlFor="returnAt" hint="Optional">
            <Input
              id="returnAt"
              type="datetime-local"
              value={form.returnAt}
              onChange={set('returnAt')}
              aria-invalid={!!errors.returnAt}
            />
          </Field>
        </div>

        <Field label="Notes for everyone" htmlFor="notes" hint="Optional">
          <Textarea
            id="notes"
            rows={2}
            placeholder="Gas split $15 each · bring snacks · no one sleeps in the front seat"
            value={form.notes}
            onChange={set('notes')}
            maxLength={1000}
          />
        </Field>
      </div>

      <div className="perforation h-5 border-y border-dashed border-border" aria-hidden />

      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">You'll get a share link for your group chat.</p>
        <Button
          type="submit"
          size="lg"
          disabled={saving}
          className="bg-accent text-accent-foreground shadow-[0_3px_0_var(--primary)] hover:bg-accent/90 active:translate-y-0.5 active:shadow-none"
        >
          {saving ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          {saving ? 'Creating…' : 'Create trip'}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={htmlFor} className="font-ticket text-[11px] uppercase tracking-[0.16em]">
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

/* ------------------------------------------------------------------ */

function RecentTrips() {
  const [trips, setTrips] = useState<RecentTrip[]>([])
  useEffect(() => setTrips(readRecentTrips()), [])
  if (trips.length === 0) return null

  return (
    <section className="mx-auto max-w-content px-4 pb-16 sm:px-6" aria-labelledby="recent-title">
      <h2 id="recent-title" className="mb-5 font-display text-2xl font-bold">
        Your trips
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <li key={t.id} className="group relative">
            <Link
              to="/trip/$tripId"
              params={{ tripId: t.id }}
              className="flex items-stretch overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-[4px_4px_0_var(--primary)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
            >
              <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-accent py-4 text-accent-foreground">
                <span className="font-ticket text-[10px] uppercase tracking-widest">{formatDay(t.departAt).split(',')[0]}</span>
                <span className="font-display text-lg font-extrabold leading-tight">{formatTime(t.departAt)}</span>
              </div>
              <div className="min-w-0 flex-1 p-4 pr-10">
                <p className="truncate font-display text-lg font-bold">{t.name}</p>
                <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {t.destination} · {formatDay(t.departAt)}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => {
                forgetTrip(t.id)
                setTrips(readRecentTrips())
              }}
              className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
              aria-label={`Remove ${t.name} from your list`}
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ */

const steps = [
  {
    icon: Car,
    title: 'Drivers add their cars',
    body: 'Each driver lists open seats and where they leave from — dorms, the library, off-campus.',
  },
  {
    icon: Users,
    title: 'Riders grab a seat',
    body: 'Drop the link in the group chat. Riders add their pickup spot and tap an open seat.',
  },
  {
    icon: Sparkles,
    title: 'Auto-fill the rest',
    body: 'One tap seats everyone still waiting, matching pickup spots to drivers first.',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="border-y-2 border-primary bg-primary text-primary-foreground">
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">
            Three stops <span className="text-sun">to departure.</span>
          </h2>
          <a href="#plan" className="inline-flex items-center gap-2 font-medium text-sun hover:underline">
            Start planning <ArrowRight className="size-4" />
          </a>
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6"
            >
              <span className="absolute right-5 top-4 font-display text-6xl font-extrabold text-primary-foreground/10">
                0{i + 1}
              </span>
              <s.icon className="mb-6 size-8 text-sun" aria-hidden />
              <h3 className="mb-2 font-display text-xl font-bold">{s.title}</h3>
              <p className="text-primary-foreground/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const downloads = [
  { icon: FileSpreadsheet, title: 'Roster spreadsheet', body: 'Every car, seat, and pickup as a CSV for Sheets or Excel.' },
  { icon: CalendarPlus, title: 'Calendar invite', body: 'An .ics file with departure time, meeting spot, and a reminder.' },
  { icon: Printer, title: 'Printable trip sheet', body: 'A clean one-pager — print it or save as PDF for the dashboard.' },
]

function TakeItWithYou() {
  return (
    <section className="mx-auto max-w-content px-4 py-16 sm:px-6" aria-labelledby="download-title">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <p className="mb-3 font-ticket text-xs uppercase tracking-[0.2em] text-coral">Download anything</p>
          <h2 id="download-title" className="font-display text-4xl font-extrabold">
            Take the plan with you.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Export a trip in the format your group actually uses, or install Carpool Planner on your phone so it
            opens like a real app — even when the signal drops on the highway.
          </p>
          <div className="mt-6">
            <InstallAppButton variant="default" />
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {downloads.map((d) => (
            <li key={d.title} className="rounded-2xl border-2 border-primary bg-card p-5 shadow-[4px_4px_0_var(--primary)]">
              <d.icon className="mb-4 size-7 text-coral" aria-hidden />
              <h3 className="mb-1 font-display text-lg font-bold">{d.title}</h3>
              <p className="text-sm text-muted-foreground">{d.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
