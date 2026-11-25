import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Calendar, ChevronDown, Clock, LogOut, Plus, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  createScheduledOutage,
  deleteScheduledOutage,
  fetchScheduledOutages,
  type OutageProvider,
  type ScheduledOutage,
} from '../lib/api'
import { formatWindow, providerLabel } from '../lib/format'
import './AdminPage.css'

/* Values must match the outage_provider enum in the database. */
const PROVIDERS: { value: OutageProvider; label: string }[] = [
  { value: 'KPLC', label: 'KPLC' },
  { value: 'SAFARICOM', label: 'Safaricom' },
  { value: 'ZUKU', label: 'Zuku' },
  { value: 'FAIBA', label: 'Faiba' },
]

const ESTATES = ['Kinoo', 'Rongai', 'Umoja 2']

function toDateInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/** Combine an <input type="date"> and <input type="time"> into an ISO timestamp. */
function toIsoTimestamp(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function AdminPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [provider, setProvider] = useState<OutageProvider>('KPLC')
  const [estate, setEstate] = useState('Kinoo')
  const [startDate, setStartDate] = useState(() => toDateInput(new Date()))
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(() => toDateInput(new Date()))
  const [endTime, setEndTime] = useState('17:00')
  const [source, setSource] = useState('')

  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [items, setItems] = useState<ScheduledOutage[]>([])

  const loadScheduled = useCallback(async () => {
    try {
      const rows = await fetchScheduledOutages()
      setItems(rows)
    } catch (error) {
      console.error('[AdminPage] could not load scheduled outages', error)
      alert('Could not load scheduled outages. Check the console for details.')
    }
  }, [])

  useEffect(() => {
    void loadScheduled()
  }, [loadScheduled])

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    const start = toIsoTimestamp(startDate, startTime)
    const end = toIsoTimestamp(endDate, endTime)

    if (new Date(end) <= new Date(start)) {
      alert('The end time must be after the start time.')
      return
    }

    setSaving(true)
    try {
      await createScheduledOutage({
        provider,
        estate,
        start_time: start,
        end_time: end,
        source_url: source.trim() || null,
      })
      setSource('')
      await loadScheduled()
    } catch (error) {
      console.error('[AdminPage] could not add scheduled outage', error)
      alert(error instanceof Error ? error.message : 'Could not add the scheduled outage.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('[AdminPage] could not sign out', error)
      alert('Could not log out. Check the console for details.')
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return

    setDeletingId(id)
    try {
      await deleteScheduledOutage(id)
      await loadScheduled()
    } catch (error) {
      console.error('[AdminPage] could not delete scheduled outage', error)
      alert(error instanceof Error ? error.message : 'Could not delete the scheduled outage.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="phone-shell admin-page">
      <header className="admin-header">
        <button
          type="button"
          className="admin-header__back"
          aria-label="Go back"
          onClick={() => navigate('/more')}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <ShieldCheck className="admin-header__shield" aria-hidden="true" />
        <h1 className="admin-header__title">StimaAlert Admin</h1>
        <button
          type="button"
          className="admin-header__logout"
          onClick={handleSignOut}
        >
          <LogOut aria-hidden="true" />
          Log Out
        </button>
      </header>

      <main className="admin-body">
        <h2 className="admin-heading">Add Scheduled Outage</h2>

        <form className="admin-form" onSubmit={handleAdd}>
          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-provider">
              Provider:
            </label>
            <div className="admin-control admin-control--select">
              <select
                id="admin-provider"
                className="admin-select"
                value={provider}
                onChange={(event) => setProvider(event.target.value as OutageProvider)}
              >
                {PROVIDERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="admin-control__icon" aria-hidden="true" />
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="admin-estate">
              Estate:
            </label>
            <div className="admin-control admin-control--select">
              <select
                id="admin-estate"
                className="admin-select"
                value={estate}
                onChange={(event) => setEstate(event.target.value)}
              >
                {ESTATES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
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
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  aria-label="Start date"
                />
                <Calendar className="admin-control__icon" aria-hidden="true" />
              </div>
              <div className="admin-control">
                <input
                  type="time"
                  className="admin-input admin-input--time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
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
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  aria-label="End date"
                />
                <Calendar className="admin-control__icon" aria-hidden="true" />
              </div>
              <div className="admin-control">
                <input
                  type="time"
                  className="admin-input admin-input--time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
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
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="admin-add" disabled={saving}>
            <Plus aria-hidden="true" />
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>

        <hr className="admin-divider" />

        <section className="admin-existing">
          <h2 className="admin-existing__title">Existing (this week)</h2>
          <ul className="admin-list">
            {items.map((item) => (
              <li key={item.id} className="admin-list__row">
                <span className="admin-list__label">
                  {providerLabel(item.provider)} · {item.estate} ·{' '}
                  {formatWindow(item.start_time, item.end_time)}
                </span>
                <button
                  type="button"
                  className="admin-delete"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId !== null}
                >
                  {deletingId === item.id ? 'Deleting…' : 'Delete'}
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
