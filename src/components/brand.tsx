import { Link } from '@tanstack/react-router'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
      <img
        src="/.netlify/images?url=/img/icon.png&w=80&h=80&fit=cover&fm=webp"
        alt=""
        width={36}
        height={36}
        className="size-9 rounded-[10px] shadow-[0_2px_0_var(--primary)] transition-transform group-hover:-rotate-6 motion-reduce:transition-none"
      />
      <span className="font-display text-lg font-extrabold leading-none tracking-tight">
        Carpool{!compact && <span className="text-coral"> Planner</span>}
      </span>
    </Link>
  )
}
