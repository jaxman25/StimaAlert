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
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  const go = (key: TabKey) => navigate(TAB_PATHS[key])
  const tabClass = (key: TabKey) => (key === active ? 'tab tab--active' : 'tab')

  return (
    <nav className="tab-bar" aria-label="Primary">
      <button
        type="button"
        className={tabClass('map')}
        aria-current={active === 'map' ? 'page' : undefined}
        onClick={() => go('map')}
      >
        <Home fill="currentColor" aria-hidden="true" />
        <span className="tab__label">Map</span>
      </button>

      <button
        type="button"
        className={tabClass('status')}
        aria-current={active === 'status' ? 'page' : undefined}
        onClick={() => go('status')}
      >
        <BarChart3 aria-hidden="true" />
        <span className="tab__label">Status</span>
      </button>

      <button
        type="button"
        className={tabClass('scheduled')}
        aria-current={active === 'scheduled' ? 'page' : undefined}
        onClick={() => go('scheduled')}
      >
        <Calendar aria-hidden="true" />
        <span className="tab__label">Scheduled</span>
      </button>

      <button
        type="button"
        className={tabClass('more')}
        aria-current={active === 'more' ? 'page' : undefined}
        onClick={() => go('more')}
      >
        <Settings aria-hidden="true" />
        <span className="tab__label">More</span>
      </button>
    </nav>
  )
}

export function MapPage() {
  const [selectedOutage, setSelectedOutage] = useState<Outage | null>(null)
  const navigate = useNavigate()

  return (
    <div className="phone-shell">
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

        <button
          type="button"
          className="action-button action-button--power"
          onClick={() => navigate('/report')}
        >
          <Zap fill="currentColor" stroke="none" aria-hidden="true" />
          Report Power Out
        </button>

        <button
          type="button"
          className="action-button action-button--internet"
          onClick={() => navigate('/report')}
        >
          <Wifi aria-hidden="true" />
          Report Internet Out
        </button>
      </section>

      <AppTabBar active="map" />

      {selectedOutage && (
        <OutageDetail outage={selectedOutage} onClose={() => setSelectedOutage(null)} />
      )}
    </div>
  )
}

export default MapPage
