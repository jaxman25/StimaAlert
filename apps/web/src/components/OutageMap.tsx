import { useCallback, useEffect, useRef, useState } from 'react'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import * as L from 'leaflet'
import {
  fetchActiveOutages,
  fetchScheduledOutages,
  parsePoint,
  type Outage,
} from '../lib/api'
import { providerLabel } from '../lib/format'
import { supabase } from '../lib/supabase'
import { Toast } from './Toast'
import './OutageMap.css'

type PinKind = 'power' | 'internet' | 'scheduled'

const PIN_COLORS: Record<PinKind, string> = {
  power: '#E00812',
  internet: '#0048DB',
  scheduled: '#FE9800',
}

/* Glyphs sit inside the round top of the teardrop. */
const GLYPHS: Record<PinKind, string> = {
  power: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  internet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/></svg>`,
  scheduled: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
}

type Pin = Outage & {
  kind: PinKind
  lat: number
  lng: number
}

/* The scheduled table has no coordinates yet, so use each estate's centre. */
const ESTATE_COORDS: Record<string, [number, number]> = {
  Rongai: [-1.396, 36.75],
  Kinoo: [-1.247, 36.663],
  'Umoja 2': [-1.283, 36.892],
}

type ScheduledPin = {
  id: string
  estate: string
  lat: number
  lng: number
  title: string
}

const CENTER: L.LatLngExpression = [-1.398, 36.749]
const ZOOM = 14

function pinIcon(kind: PinKind): L.DivIcon {
  return L.divIcon({
    className: 'outage-pin',
    html: `<svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C8.95 0 0 8.95 0 20c0 14 20 32 20 32s20-18 20-32C40 8.95 31.05 0 20 0z" fill="${PIN_COLORS[kind]}"/><g transform="translate(10,10)">${GLYPHS[kind]}</g></svg>`,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
  })
}

/** Turn outage rows into pins, dropping any without a parseable location. */
function toPins(rows: Outage[]): Pin[] {
  const next: Pin[] = []

  for (const outage of rows) {
    const point = parsePoint(outage.location)
    if (!point) continue

    const kind: PinKind = outage.type === 'POWER' ? 'power' : 'internet'
    next.push({ ...outage, kind, lat: point.lat, lng: point.lng })
  }

  return next
}

type OutageMapProps = {
  onSelectPin?: (outage: Outage) => void
}

export function OutageMap({ onSelectPin }: OutageMapProps) {
  /* A still of the same view, served from our origin, so the map area paints
     immediately instead of waiting on third-party raster tiles. */
  const [posterHidden, setPosterHidden] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const calloutRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<Pin | null>(null)
  const placeCalloutRef = useRef<() => void>(() => {})

  const [pins, setPins] = useState<Pin[]>([])
  const [scheduledPins, setScheduledPins] = useState<ScheduledPin[]>([])
  const [calloutLabel, setCalloutLabel] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  /* Keep the handler fresh without re-creating the map. */
  const selectPinRef = useRef(onSelectPin)
  selectPinRef.current = onSelectPin

  const dismissToast = useCallback(() => setToast(null), [])

  /* ---------- Load outages ---------- */

  const loadActive = useCallback(async () => {
    const next = toPins(await fetchActiveOutages())

    const anchor = next.find((pin) => pin.kind === 'power') ?? next[0] ?? null
    anchorRef.current = anchor
    setCalloutLabel(anchor?.estate ?? '')
    setPins(next)
  }, [])

  const loadScheduled = useCallback(async () => {
    const scheduledRows = await fetchScheduledOutages()
    const upcoming: ScheduledPin[] = []

    for (const item of scheduledRows) {
      const coords = ESTATE_COORDS[item.estate]
      if (!coords) continue

      upcoming.push({
        id: item.id,
        estate: item.estate,
        lat: coords[0],
        lng: coords[1],
        title: `${providerLabel(item.provider)} scheduled outage · ${item.estate}`,
      })
    }

    setScheduledPins(upcoming)
  }, [])

  useEffect(() => {
    let cancelled = false

    loadActive().catch((error: unknown) => {
      if (cancelled) return
      console.error('[OutageMap] could not load active outages', error)
    })

    loadScheduled().catch((error: unknown) => {
      if (cancelled) return
      console.error('[OutageMap] could not load scheduled outages', error)
    })

    return () => {
      cancelled = true
    }
  }, [loadActive, loadScheduled])

  /* ---------- Live updates from the outages table ---------- */

  useEffect(() => {
    const channel = supabase
      .channel('map-outages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outages' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const removedId = (payload.old as { id?: string }).id
            if (!removedId) return

            setPins((current) => current.filter((pin) => pin.id !== removedId))
            if (anchorRef.current?.id === removedId) {
              anchorRef.current = null
              setCalloutLabel('')
            }
            placeCalloutRef.current()
            return
          }

          if (payload.eventType === 'INSERT') {
            const estate = (payload.new as { estate?: string }).estate
            if (estate) setToast(`New outage reported in ${estate}`)
          }

          /* New rows and status changes both need the filtered list re-read. */
          loadActive().catch((error: unknown) => {
            console.error('[OutageMap] could not refresh after a live change', error)
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadActive])

  /* ---------- Live updates from the scheduled table ---------- */

  useEffect(() => {
    const channel = supabase
      .channel('map-scheduled')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled' },
        () => {
          loadScheduled().catch((error: unknown) => {
            console.error('[OutageMap] could not refresh scheduled outages', error)
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadScheduled])

  /* ---------- Create the map once ---------- */

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: CENTER,
      zoom: ZOOM,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on('load', () => setPosterHidden(true))
      .addTo(map)

    layerRef.current = L.layerGroup().addTo(map)

    /* Keep the callout bubble above its pin as the map moves or resizes. */
    const placeCallout = () => {
      const el = calloutRef.current
      if (!el) return

      const anchor = anchorRef.current
      if (!anchor) {
        el.style.opacity = '0'
        return
      }

      el.style.opacity = '1'
      const point = map.latLngToContainerPoint([anchor.lat, anchor.lng])
      el.style.left = `${point.x}px`
      el.style.top = `${point.y - 52 - 12}px`
    }

    placeCalloutRef.current = placeCallout
    placeCallout()
    map.on('move zoom resize', placeCallout)

    mapRef.current = map

    return () => {
      map.off('move zoom resize', placeCallout)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  /* ---------- Sync pins whenever the data changes ---------- */

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    layer.clearLayers()

    /* Scheduled pins go in first so the tappable outage pins stay on top
       when an estate has both. */
    for (const pin of scheduledPins) {
      L.marker([pin.lat, pin.lng], {
        icon: pinIcon('scheduled'),
        title: pin.title,
        alt: pin.title,
        keyboard: false,
        interactive: false,
      }).addTo(layer)
    }

    for (const pin of pins) {
      const label = `${pin.estate} ${pin.kind === 'power' ? 'power' : 'internet'} outage`

      L.marker([pin.lat, pin.lng], {
        icon: pinIcon(pin.kind),
        title: label,
        alt: label,
        keyboard: true,
      })
        .on('click', () => selectPinRef.current?.(pin))
        .addTo(layer)
    }

    placeCalloutRef.current()
  }, [pins, scheduledPins])

  return (
    <div className="map-area">
      {!posterHidden && (
        <img className="map-poster" src="/map-poster.webp" alt="" aria-hidden="true" />
      )}
      <div
        ref={containerRef}
        className="outage-map"
        aria-label="Outage map showing active, pending and scheduled outages"
      />
      <div className="map-controls" role="group" aria-label="Map zoom">
        <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          <Plus aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          <Minus aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Recenter map"
          onClick={() => mapRef.current?.setView(CENTER, ZOOM)}
        >
          <LocateFixed aria-hidden="true" />
        </button>
      </div>
      <div ref={calloutRef} className="estate-callout" aria-hidden="true">
        {calloutLabel}
      </div>
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </div>
  )
}

export default OutageMap
