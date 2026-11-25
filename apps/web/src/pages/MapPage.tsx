import { useState } from 'react'
import { ChevronDown, MapPin, Menu, Search, Wifi, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppTabBar } from '../components/AppTabBar'
import { OutageDetail } from '../components/OutageDetail'
/* The route itself is lazy, so Leaflet is only fetched on the map page. Loading
   it here (rather than with a second lazy() boundary) avoids a request
   waterfall that delayed the first map tiles by half a second. */
import { OutageMap } from '../components/OutageMap'
import type { Outage } from '../lib/api'
import './MapPage.css'

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

      <OutageMap onSelectPin={setSelectedOutage} />

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
