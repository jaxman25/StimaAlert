import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import seo from './seo.json'

export type FaqItem = { question: string; answer: string }

export type RouteMeta = {
  path: string
  title: string
  description: string
  priority?: string
  inSitemap?: boolean
  faq?: FaqItem[]
}

export const SITE_ORIGIN = seo.origin
export const ROUTES = seo.routes as RouteMeta[]

export function metaForPath(pathname: string): RouteMeta {
  return ROUTES.find((route) => route.path === pathname) ?? ROUTES[0]
}

export const moreFaq: FaqItem[] = ROUTES.find((route) => route.path === '/more')?.faq ?? []

const DESCRIPTION = document.querySelector<HTMLMetaElement>('meta[name="description"]')
const CANONICAL = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')

/**
 * The prerendered HTML already has per-route tags; this keeps the document in
 * step when someone navigates inside the app.
 */
export function SeoMeta() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = metaForPath(pathname)
    document.title = meta.title
    DESCRIPTION?.setAttribute('content', meta.description)
    CANONICAL?.setAttribute('href', `${SITE_ORIGIN}${meta.path}`)
  }, [pathname])

  return null
}
