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
import { OutageDetail } from '../components/OutageDetail'
import { OutageMap } from '../components/OutageMap'
import './MapPage.css'

type MapPageProps = {
  onNavigate?: (screen: 'map' | 'status' | 'scheduled') => void
  onReportOutage?: (type: 'power' | 'net') => void
}

export function MapPage({ onNavigate, onReportOutage }: MapPageProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false)

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

      <OutageMap onSelectPin={() => setIsDetailOpen(true)} />

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
          onClick={() => onReportOutage?.('power')}
        >
          <Zap fill="currentColor" stroke="none" aria-hidden="true" />
          Report Power Out
        </button>

        <button
          type="button"
          className="action-button action-button--internet"
          onClick={() => onReportOutage?.('net')}
        >
          <Wifi aria-hidden="true" />
          Report Internet Out
        </button>
      </section>

      <nav className="tab-bar" aria-label="Primary">
        <button
          type="button"
          className="tab tab--active"
          aria-current="page"
          onClick={() => onNavigate?.('map')}
        >
          <Home fill="currentColor" aria-hidden="true" />
          <span className="tab__label">Map</span>
        </button>

        <button type="button" className="tab" onClick={() => onNavigate?.('status')}>
          <BarChart3 aria-hidden="true" />
          <span className="tab__label">Status</span>
        </button>

        <button type="button" className="tab" onClick={() => onNavigate?.('scheduled')}>
          <Calendar aria-hidden="true" />
          <span className="tab__label">Scheduled</span>
        </button>

        <button type="button" className="tab">
          <Settings aria-hidden="true" />
          <span className="tab__label">More</span>
        </button>
      </nav>

      {isDetailOpen && <OutageDetail onClose={() => setIsDetailOpen(false)} />}
    </div>
  )
}

export default MapPage
