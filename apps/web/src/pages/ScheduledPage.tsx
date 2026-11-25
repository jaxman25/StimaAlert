import { useEffect, useState } from 'react'
import { ArrowLeft, Calendar, ChevronRight, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchScheduledOutages, type ScheduledOutage } from '../lib/api'
import { formatWindow, providerLabel } from '../lib/format'
import { AppTabBar } from '../components/AppTabBar'
import './ScheduledPage.css'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

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

function splitByWeek(items: ScheduledOutage[]): {
  thisWeek: ScheduledOutage[]
  nextWeek: ScheduledOutage[]
} {
  const cutoff = Date.now() + WEEK_MS
  return {
    thisWeek: items.filter((item) => new Date(item.start_time).getTime() < cutoff),
    nextWeek: items.filter((item) => new Date(item.start_time).getTime() >= cutoff),
  }
}

export function ScheduledPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ScheduledOutage[]>([])

  useEffect(() => {
    let cancelled = false

    fetchScheduledOutages()
      .then((rows) => {
        if (!cancelled) setItems(rows)
      })
      .catch((error: unknown) => {
        console.error('[ScheduledPage] could not load scheduled outages', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const { thisWeek, nextWeek } = splitByWeek(items)

  return (
    <div className="phone-shell scheduled-page">
      <header className="scheduled-header">
        <button
          type="button"
          className="scheduled-header__back"
          aria-label="Go back"
          onClick={() => navigate('/')}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1 className="scheduled-header__title">Scheduled Outages</h1>
      </header>

      <main className="scheduled-body">
        {thisWeek.length > 0 && (
          <section className="scheduled-section">
            <h2 className="scheduled-section__title">This week</h2>
            <div className="outage-list">
              {thisWeek.map((item) => (
                <OutageCard
                  key={item.id}
                  estate={`${providerLabel(item.provider)} · ${item.estate}`}
                  window={formatWindow(item.start_time, item.end_time)}
                />
              ))}
            </div>
          </section>
        )}

        {nextWeek.length > 0 && (
          <section className="scheduled-section">
            <h2 className="scheduled-section__title">Next week</h2>
            <div className="outage-list">
              {nextWeek.map((item) => (
                <OutageCard
                  key={item.id}
                  estate={`${providerLabel(item.provider)} · ${item.estate}`}
                  window={formatWindow(item.start_time, item.end_time)}
                />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="scheduled-empty">
            <Info className="scheduled-empty__icon" aria-hidden="true" />
            <p className="scheduled-empty__text">No scheduled outages right now.</p>
          </div>
        )}
      </main>

      <AppTabBar active="scheduled" />
    </div>
  )
}

export default ScheduledPage
