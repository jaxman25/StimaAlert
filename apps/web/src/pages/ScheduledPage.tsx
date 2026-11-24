import { ArrowLeft, Calendar, ChevronRight, Info } from 'lucide-react'
import { AppTabBar, type TabKey } from './MapPage'
import './ScheduledPage.css'

type ScheduledPageProps = {
  onBack?: () => void
  onNavigate?: (screen: TabKey) => void
}

const THIS_WEEK = [
  { id: 'kplc-kinoo', estate: 'KPLC · Kinoo', window: 'Sat 23 Nov · 9am – 5pm' },
  { id: 'safaricom-rongai', estate: 'Safaricom · Rongai', window: 'Sun 24 Nov · 1am – 4am' },
]

const NEXT_WEEK = [
  { id: 'kplc-umoja-2', estate: 'KPLC · Umoja 2', window: 'Mon 25 Nov · 8am – 6pm' },
]

type OutageCardProps = {
  estate: string
  window: string
}

function OutageCard({ estate, window }: OutageCardProps) {
  return (
    <button type="button" className="outage-card">
      <span className="outage-card__disc" aria-hidden="true">
        <Calendar strokeWidth={2.2} />
      </span>
      <span className="outage-card__text">
        <span className="outage-card__estate">{estate}</span>
        <span className="outage-card__window">{window}</span>
      </span>
      <ChevronRight className="outage-card__chevron" aria-hidden="true" />
    </button>
  )
}

export function ScheduledPage({ onBack, onNavigate }: ScheduledPageProps) {
  return (
    <div className="phone-shell scheduled-page">
      <header className="scheduled-header">
        <button
          type="button"
          className="scheduled-header__back"
          aria-label="Go back"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1 className="scheduled-header__title">Scheduled Outages</h1>
      </header>

      <main className="scheduled-body">
        <section className="scheduled-section">
          <h2 className="scheduled-section__title">This week</h2>
          <div className="outage-list">
            {THIS_WEEK.map((item) => (
              <OutageCard key={item.id} estate={item.estate} window={item.window} />
            ))}
          </div>
        </section>

        <section className="scheduled-section">
          <h2 className="scheduled-section__title">Next week</h2>
          <div className="outage-list">
            {NEXT_WEEK.map((item) => (
              <OutageCard key={item.id} estate={item.estate} window={item.window} />
            ))}
          </div>
        </section>

        <div className="scheduled-empty">
          <Info className="scheduled-empty__icon" aria-hidden="true" />
          <p className="scheduled-empty__text">
            No more scheduled outages this week — check back Friday.
          </p>
        </div>
      </main>

      <AppTabBar active="scheduled" onNavigate={onNavigate} />
    </div>
  )
}

export default ScheduledPage
