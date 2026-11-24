import { ArrowLeft, Calendar, ChevronDown, Clock, Plus, ShieldCheck } from 'lucide-react'
import './AdminPage.css'

type AdminPageProps = {
  onBack?: () => void
}

const EXISTING = [
  { id: 'kplc-kinoo', label: 'KPLC · Kinoo · Sat 9am–5pm' },
  { id: 'safaricom-rongai', label: 'Safaricom · Rongai · Sun 1am–4am' },
]

export function AdminPage({ onBack }: AdminPageProps) {
  return (
    <div className="phone-shell admin-page">
      <header className="admin-header">
        <button type="button" className="admin-header__back" aria-label="Go back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <ShieldCheck className="admin-header__shield" aria-hidden="true" />
        <h1 className="admin-header__title">StimaAlert Admin</h1>
      </header>

      <main className="admin-body">
        <h2 className="admin-heading">Add Scheduled Outage</h2>

        <form className="admin-form" onSubmit={(event) => event.preventDefault()}>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-provider">
              Provider:
            </label>
            <div className="admin-control admin-control--select">
              <select id="admin-provider" className="admin-select" defaultValue="KPLC">
                <option>KPLC</option>
                <option>Safaricom</option>
                <option>Kenya Power</option>
              </select>
              <ChevronDown className="admin-control__icon" aria-hidden="true" />
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-estate">
              Estate:
            </label>
            <div className="admin-control admin-control--select">
              <select id="admin-estate" className="admin-select" defaultValue="Kinoo">
                <option>Kinoo</option>
                <option>Rongai</option>
                <option>Umoja 2</option>
              </select>
              <ChevronDown className="admin-control__icon" aria-hidden="true" />
            </div>
          </div>

          <div className="admin-field">
            <span className="admin-label" id="admin-start-label">
              Start:
            </span>
            <div className="admin-split" role="group" aria-labelledby="admin-start-label">
              <div className="admin-control">
                <input
                  type="date"
                  className="admin-input admin-input--date"
                  defaultValue="2024-11-23"
                  aria-label="Start date"
                />
                <Calendar className="admin-control__icon" aria-hidden="true" />
              </div>
              <div className="admin-control">
                <input
                  type="time"
                  className="admin-input admin-input--time"
                  defaultValue="09:00"
                  aria-label="Start time"
                />
                <Clock className="admin-control__icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="admin-field">
            <span className="admin-label" id="admin-end-label">
              End:
            </span>
            <div className="admin-split" role="group" aria-labelledby="admin-end-label">
              <div className="admin-control">
                <input
                  type="date"
                  className="admin-input admin-input--date"
                  defaultValue="2024-11-23"
                  aria-label="End date"
                />
                <Calendar className="admin-control__icon" aria-hidden="true" />
              </div>
              <div className="admin-control">
                <input
                  type="time"
                  className="admin-input admin-input--time"
                  defaultValue="17:00"
                  aria-label="End time"
                />
                <Clock className="admin-control__icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-source">
              Source:
            </label>
            <div className="admin-control">
              <input
                id="admin-source"
                type="text"
                className="admin-input"
                placeholder="https://kpcl.co.ke/.../pdf"
              />
            </div>
          </div>

          <button type="submit" className="admin-add">
            <Plus aria-hidden="true" />
            Add
          </button>
        </form>

        <hr className="admin-divider" />

        <section className="admin-existing">
          <h2 className="admin-existing__title">Existing (this week)</h2>
          <ul className="admin-list">
            {EXISTING.map((item) => (
              <li key={item.id} className="admin-list__row">
                <span className="admin-list__label">{item.label}</span>
                <button type="button" className="admin-delete">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default AdminPage
