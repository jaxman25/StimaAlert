import { useEffect, useState } from 'react'
import { ArrowLeft, Calendar, History, Send, Wifi, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchEstateStatus, fetchScheduledOutages, type Outage, type ScheduledOutage } from '../lib/api'
import { formatTime, formatWindow, providerLabel } from '../lib/format'
import { AppTabBar } from './MapPage'
import './StatusPage.css'

/* Matches the estate values stored on outages/scheduled rows. */
const ESTATE = 'Rongai'

export function StatusPage() {
  const navigate = useNavigate()
  const [latest, setLatest] = useState<Outage | null>(null)
  const [nextScheduled, setNextScheduled] = useState<ScheduledOutage | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchEstateStatus(ESTATE)
      .then((outage) => {
        if (!cancelled) setLatest(outage)
      })
      .catch((error: unknown) => {
        console.error(`[StatusPage] could not load status for ${ESTATE}`, error)
      })

    fetchScheduledOutages()
      .then((rows) => {
        // The endpoint returns every estate; this screen only covers ESTATE.
        if (!cancelled) setNextScheduled(rows.find((row) => row.estate === ESTATE) ?? null)
      })
      .catch((error: unknown) => {
        console.error('[StatusPage] could not load scheduled outages', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const powerOutage = latest?.type === 'POWER' && latest.status !== 'RESOLVED' ? latest : null
  const internetOutage = latest?.type === 'INTERNET' && latest.status !== 'RESOLVED' ? latest : null

  return (
    <div className="phone-shell status-page">
      <header className="status-header">
        <button type="button" className="status-header__back" aria-label="Go back" onClick={() => navigate('/')}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1 className="status-header__title">{ESTATE}</h1>
      </header>

      <main className="status-body">
        <section
          className={`estate-card ${powerOutage ? 'estate-card--power' : 'estate-card--ok'}`}
          aria-label="Power status"
        >
          <span className="estate-card__disc" aria-hidden="true">
            <Zap fill="currentColor" stroke="none" />
          </span>
          <div className="estate-card__text">
            <h2 className="estate-card__title">{powerOutage ? 'POWER: OUT' : 'POWER: OK'}</h2>
            <p className="estate-card__line">
              {powerOutage ? `Since ${formatTime(powerOutage.reported_at)}` : 'No active outage reported'}
            </p>
            {powerOutage && (
              <p className="estate-card__meta">{powerOutage.reports} confirmations</p>
            )}
          </div>
        </section>

        <section
          className={`estate-card ${internetOutage ? 'estate-card--out' : 'estate-card--internet'}`}
          aria-label="Internet status"
        >
          <Wifi className="estate-card__wifi" strokeWidth={2.4} aria-hidden="true" />
          <div className="estate-card__text">
            <h2 className="estate-card__title">{internetOutage ? 'INTERNET: OUT' : 'INTERNET: OK'}</h2>
            <p className="estate-card__line">
              {internetOutage
                ? `Since ${formatTime(internetOutage.reported_at)}`
                : 'No active outage reported'}
            </p>
            {internetOutage && (
              <p className="estate-card__meta">{internetOutage.reports} confirmations</p>
            )}
          </div>
        </section>

        <button type="button" className="follow-button">
          <Send className="follow-button__icon" aria-hidden="true" />
          Follow on Telegram
        </button>

        <section className="status-section">
          <h2 className="status-section__title">
            <Calendar aria-hidden="true" />
            Scheduled
          </h2>
          <p className="status-section__detail">
            {nextScheduled
              ? `${formatWindow(nextScheduled.start_time, nextScheduled.end_time)} ${providerLabel(nextScheduled.provider)}`
              : 'No scheduled outages'}
          </p>
        </section>

        <section className="status-section">
          <h2 className="status-section__title">
            <History aria-hidden="true" />
            Recent reports
          </h2>
          {/* No history endpoint yet, so there is nothing real to list. */}
          <p className="status-section__detail">No recent reports</p>
        </section>
      </main>

      <AppTabBar active="status" />
    </div>
  )
}

export default StatusPage
