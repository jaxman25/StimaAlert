import { useState } from 'react'
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Home,
  MapPin,
  Menu,
  Search,
  Settings,
  Wifi,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { OutageDetail } from '../components/OutageDetail'
import { OutageMap } from '../components/OutageMap'
import type { Outage } from '../lib/api'
import './MapPage.css'

export type TabKey = 'map' | 'status' | 'scheduled' | 'more'

const TAB_PATHS: Record<TabKey, string> = {
  map: '/',
  status: '/status',
  scheduled: '/scheduled',
  more: '/more',
}

type AppTabBarProps = {
  active: TabKey
}

/** Shared bottom navigation. Styles live in MapPage.css. */
export function AppTabBar({ active }: AppTabBarProps) {
  const tabClass = (key: TabKey) => (key === active ? 'tab tab--active' : 'tab')

  // Real links, not buttons, so crawlers can follow every top-level page.
  return (
    <nav className="tab-bar" aria-label="Primary">
      <Link
        className={tabClass('map')}
        to={TAB_PATHS.map}
        aria-current={active === 'map' ? 'page' : undefined}
      >
        <Home fill="currentColor" aria-hidden="true" />
        <span className="tab__label">Map</span>
      </Link>

      <Link
        className={tabClass('status')}
        to={TAB_PATHS.status}
        aria-current={active === 'status' ? 'page' : undefined}
      >
        <BarChart3 aria-hidden="true" />
        <span className="tab__label">Status</span>
      </Link>

      <Link
        className={tabClass('scheduled')}
        to={TAB_PATHS.scheduled}
        aria-current={active === 'scheduled' ? 'page' : undefined}
      >
        <Calendar aria-hidden="true" />
        <span className="tab__label">Scheduled</span>
      </Link>

      <Link
        className={tabClass('more')}
        to={TAB_PATHS.more}
        aria-current={active === 'more' ? 'page' : undefined}
      >
        <Settings aria-hidden="true" />
        <span className="tab__label">More</span>
      </Link>
    </nav>
  )
}

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
