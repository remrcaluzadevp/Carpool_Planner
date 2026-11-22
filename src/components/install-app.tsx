import { useEffect, useState, useSyncExternalStore } from 'react'
import { MonitorDown, Share, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/* Tiny store so the install prompt captured at startup is available to any button. */
let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Mounted once in the root shell: registers the service worker and captures the install prompt. */
export function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferred = e as InstallPromptEvent
      emit()
    }
    const onInstalled = () => {
      deferred = null
      emit()
      toast.success('Carpool Planner is installed on this device')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  return null
}

/** "Download the app" button: native install prompt when the browser offers one, instructions otherwise. */
export function InstallAppButton({
  variant = 'outline',
  className,
  label = 'Download the app',
}: {
  variant?: 'outline' | 'default' | 'secondary' | 'ghost'
  className?: string
  label?: string
}) {
  const prompt = useSyncExternalStore(
    subscribe,
    () => deferred,
    () => null,
  )
  const [helpOpen, setHelpOpen] = useState(false)

  async function install() {
    if (prompt) {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') {
        deferred = null
        emit()
      }
      return
    }
    setHelpOpen(true)
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={install}>
        <MonitorDown />
        {label}
      </Button>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Put Carpool Planner on your home screen</DialogTitle>
            <DialogDescription>
              It installs straight from your browser, with no app store, and opens like any other app.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Share className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden />
              <span>
                <strong>iPhone / iPad (Safari):</strong> tap the Share button, then <em>Add to Home Screen</em>.
              </span>
            </li>
            <li className="flex gap-3">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden />
              <span>
                <strong>Android (Chrome):</strong> open the ⋮ menu and choose <em>Install app</em> or{' '}
                <em>Add to Home screen</em>.
              </span>
            </li>
            <li className="flex gap-3">
              <MonitorDown className="mt-0.5 size-5 shrink-0 text-coral" aria-hidden />
              <span>
                <strong>Laptop (Chrome / Edge):</strong> click the install icon at the right end of the address bar.
              </span>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Already installed? Look for the yellow car icon on your home screen or in your apps list.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
