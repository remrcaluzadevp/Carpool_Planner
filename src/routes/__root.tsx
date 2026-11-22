import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { ServiceWorker } from '@/components/install-app'

import '../styles.css'

const siteName = 'Carpool Planner'
const siteDescription =
  'Plan student road trips in minutes: add drivers and seats, sign up riders, auto-fill cars, and download the roster.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        property: 'og:image',
        content: '/.netlify/images?url=/img/hero.png&w=1200&fm=jpg',
      },
      { name: 'theme-color', content: '#1c2452' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Carpool' },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.webmanifest' },
      {
        rel: 'apple-touch-icon',
        href: '/.netlify/images?url=/img/icon.png&w=180&h=180&fit=cover&fm=png',
      },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=DM+Mono:wght@400;500&family=Figtree:wght@400..700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="paper">
        <TooltipProvider>{children}</TooltipProvider>
        <ServiceWorker />
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}
