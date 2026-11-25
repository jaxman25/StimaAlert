import { Suspense, lazy, useState } from 'react'
import { ChevronDown, MapPin, Menu, Search, Wifi, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppTabBar } from '../components/AppTabBar'
import { OutageDetail } from '../components/OutageDetail'
import type { Outage } from '../lib/api'
import './MapPage.css'

/* Leaflet is ~150 kB; keep it out of the shell so the header and buttons paint first. */
const OutageMap = lazy(() =>
  import('../components/OutageMap').then((module) => ({ default: module.OutageMap })),
)

export function MapPage() {
  const [selectedOutage, setSelectedOutage] = useState<Outage | null>(null)

  return (
    <div className="phone-shell">
      <h1 className="sr-only">StimaAlert — live power and internet outage map for Kenya</h1>

      <header className="app-header">
        <div className="brand">
          <Zap className="brand__bolt" fill="currentColor" stroke="none" aria-hidden="true" />
          <span className="brand__name">
            Stima<span className="brand__alert">Alert</span>
          </span>
        </div>

        <div className="header-actions">
          <button type="button" className="icon-button" aria-label="Search">
            <Search aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" aria-label="Open menu">
            <Menu aria-hidden="true" />
          </button>
        </div>
      </header>

      <Suspense fallback={<div className="map-area" aria-hidden="true" />}>
        <OutageMap onSelectPin={setSelectedOutage} />
      </Suspense>

      <section className="bottom-sheet" aria-label="Selected estate">
        <button type="button" className="estate-row">
          <MapPin className="estate-row__pin" fill="currentColor" stroke="none" aria-hidden="true" />
          <span className="estate-row__name">Rongai</span>
          <span className="estate-row__count">· 4 active</span>
          <ChevronDown className="estate-row__chevron" aria-hidden="true" />
        </button>

        <Link className="action-button action-button--power" to="/report">
          <Zap fill="currentColor" stroke="none" aria-hidden="true" />
          Report Power Out
        </Link>

        <Link className="action-button action-button--internet" to="/report">
          <Wifi aria-hidden="true" />
          Report Internet Out
        </Link>
      </section>

      <AppTabBar active="map" />

      {selectedOutage && (
        <OutageDetail outage={selectedOutage} onClose={() => setSelectedOutage(null)} />
      )}
    </div>
  )
}

export default MapPage
