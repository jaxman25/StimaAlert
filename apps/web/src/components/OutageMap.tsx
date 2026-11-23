import { useEffect, useRef } from 'react'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import * as L from 'leaflet'
import './OutageMap.css'

type OutageKind = 'power' | 'internet' | 'scheduled'

const PIN_COLORS: Record<OutageKind, string> = {
  power: '#E00812',
  internet: '#0048DB',
  scheduled: '#FE9800',
}

/* Glyphs sit inside the round top of the teardrop. */
const GLYPHS: Record<OutageKind, string> = {
  power: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  internet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/></svg>`,
  scheduled: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>`,
}

type Outage = {
  id: string
  kind: OutageKind
  label: string
  lat: number
  lng: number
}

/* Hardcoded pins laid out to match reference-ui/01_map_home.png. */
const OUTAGES: Outage[] = [
  { id: 'power-nw', kind: 'power', label: 'Power outage', lat: -1.3874, lng: 36.7411 },
  { id: 'internet-ne', kind: 'internet', label: 'Internet outage', lat: -1.3886, lng: 36.755 },
  { id: 'internet-e', kind: 'internet', label: 'Internet outage', lat: -1.3957, lng: 36.7615 },
  { id: 'power-c', kind: 'power', label: 'Power outage', lat: -1.398, lng: 36.7433 },
  { id: 'scheduled-se', kind: 'scheduled', label: 'Scheduled outage', lat: -1.3999, lng: 36.7531 },
]

/* The callout is anchored to the center-left red pin. */
const CALLOUT_ANCHOR = OUTAGES[3]

const CENTER: L.LatLngExpression = [-1.398, 36.749]
const ZOOM = 14

function pinIcon(kind: OutageKind): L.DivIcon {
  return L.divIcon({
    className: 'outage-pin',
    html: `<svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C8.95 0 0 8.95 0 20c0 14 20 32 20 32s20-18 20-32C40 8.95 31.05 0 20 0z" fill="${PIN_COLORS[kind]}"/><g transform="translate(10,10)">${GLYPHS[kind]}</g></svg>`,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
  })
}

type OutageMapProps = {
  onSelectPin?: () => void
}

export function OutageMap({ onSelectPin }: OutageMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const calloutRef = useRef<HTMLDivElement>(null)

  /* Keep the handler fresh without re-creating the map. */
  const selectPinRef = useRef(onSelectPin)
  selectPinRef.current = onSelectPin

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
    }).addTo(map)

    for (const outage of OUTAGES) {
      L.marker([outage.lat, outage.lng], {
        icon: pinIcon(outage.kind),
        title: outage.label,
        alt: outage.label,
        keyboard: true,
      })
        .on('click', () => selectPinRef.current?.())
        .addTo(map)
    }

    /* Keep the callout bubble above its pin as the map moves or resizes. */
    const placeCallout = () => {
      const el = calloutRef.current
      if (!el) return
      const point = map.latLngToContainerPoint([CALLOUT_ANCHOR.lat, CALLOUT_ANCHOR.lng])
      el.style.left = `${point.x}px`
      el.style.top = `${point.y - 52 - 12}px`
    }

    placeCallout()
    map.on('move zoom resize', placeCallout)

    mapRef.current = map

    return () => {
      map.off('move zoom resize', placeCallout)
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="map-area">
      <div
        ref={containerRef}
        className="outage-map"
        aria-label="Outage map for Rongai showing power, internet and scheduled outages"
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
        Rongai 45
      </div>
    </div>
  )
}

export default OutageMap
