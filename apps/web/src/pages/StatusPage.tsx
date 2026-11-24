import { ArrowLeft, Calendar, History, Send, Wifi, Zap } from 'lucide-react'
import { AppTabBar, type TabKey } from './MapPage'
import './StatusPage.css'

type StatusPageProps = {
  onBack?: () => void
  onNavigate?: (screen: TabKey) => void
}

export function StatusPage({ onBack, onNavigate }: StatusPageProps) {
  return (
    <div className="phone-shell status-page">
      <header className="status-header">
        <button type="button" className="status-header__back" aria-label="Go back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1 className="status-header__title">Rongai 45</h1>
      </header>

      <main className="status-body">
        <section className="estate-card estate-card--power" aria-label="Power status">
          <span className="estate-card__disc" aria-hidden="true">
            <Zap fill="currentColor" stroke="none" />
          </span>
          <div className="estate-card__text">
            <h2 className="estate-card__title">POWER: OUT</h2>
            <p className="estate-card__line">Since 2:15 PM</p>
            <p className="estate-card__meta">4 confirmations</p>
          </div>
        </section>

        <section className="estate-card estate-card--internet" aria-label="Internet status">
          <Wifi className="estate-card__wifi" strokeWidth={2.4} aria-hidden="true" />
          <div className="estate-card__text">
            <h2 className="estate-card__title">INTERNET: OK</h2>
            <p className="estate-card__line">Last checked 5m ago</p>
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
          <p className="status-section__detail">Sat 23 Nov, 9am – 5pm KPLC</p>
        </section>

        <section className="status-section">
          <h2 className="status-section__title">
            <History aria-hidden="true" />
            Recent reports
          </h2>
          <ul className="report-list">
            <li className="report-list__item">
              <span className="report-list__dot report-list__dot--ok" aria-hidden="true" />
              Power back – 11:02 AM
            </li>
            <li className="report-list__item">
              <span className="report-list__dot report-list__dot--out" aria-hidden="true" />
              Power out – 2:15 PM
            </li>
          </ul>
        </section>
      </main>

      <AppTabBar active="status" onNavigate={onNavigate} />
    </div>
  )
}

export default StatusPage
