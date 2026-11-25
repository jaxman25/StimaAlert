import { BarChart3, Calendar, Home, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import './AppTabBar.css'

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

/**
 * Shared bottom navigation. Styles live in MapPage.css.
 *
 * It sits in its own module so pages other than the map can import it without
 * pulling Leaflet into their bundle.
 */
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
