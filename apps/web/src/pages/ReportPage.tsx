import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Info,
  MapPin,
  Send,
  Wifi,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createOutage, type OutageProvider, type OutageType } from '../lib/api'
import './ReportPage.css'

type FormOutageType = 'power' | 'net'

const ESTATES = ['Rongai', 'Kinoo', 'Umoja 2']

/* Values must match the outage_provider enum in the database. */
const PROVIDERS: { value: OutageProvider | ''; label: string }[] = [
  { value: '', label: 'No provider' },
  { value: 'KPLC', label: 'KPLC' },
  { value: 'SAFARICOM', label: 'Safaricom' },
  { value: 'ZUKU', label: 'Zuku' },
  { value: 'FAIBA', label: 'Faiba' },
]

/** Decorative flat skyline, tones sampled from reference-ui/02_report_outage.png. */
function Skyline() {
  return (
    <svg
      className="report-footer"
      viewBox="0 0 440 108"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Far skyline — pale blue */}
      <g fill="#DCE7FD">
        <rect x="0" y="62" width="34" height="46" />
        <rect x="34" y="74" width="22" height="34" />
        <rect x="56" y="56" width="18" height="52" />
        <rect x="96" y="66" width="30" height="42" />
        <rect x="126" y="78" width="24" height="30" />
        <rect x="150" y="60" width="16" height="48" />
        <rect x="172" y="72" width="14" height="36" />
        <rect x="186" y="66" width="20" height="42" />
        <rect x="238" y="58" width="18" height="50" />
        <rect x="256" y="74" width="24" height="34" />
        <rect x="280" y="82" width="22" height="26" />
        <rect x="302" y="62" width="18" height="46" />
        <rect x="336" y="74" width="26" height="34" />
        <rect x="362" y="58" width="20" height="50" />
        <rect x="382" y="70" width="34" height="38" />
        <rect x="416" y="80" width="24" height="28" />
        <circle cx="84" cy="84" r="11" />
        <circle cx="78" cy="90" r="7" />
        <circle cx="90" cy="90" r="7" />
        <circle cx="326" cy="88" r="10" />
      </g>

      {/* Near silhouettes — deep blue */}
      <g fill="#4C87EC">
        {/* left tree */}
        <rect x="30" y="84" width="4" height="24" />
        <circle cx="32" cy="76" r="11" />
        <circle cx="23" cy="83" r="7" />
        <circle cx="41" cy="83" r="8" />

        {/* low buildings, left */}
        <rect x="60" y="88" width="24" height="20" />
        <rect x="60" y="80" width="10" height="8" />
        <rect x="104" y="92" width="26" height="16" />
        <rect x="110" y="86" width="8" height="6" />
        <rect x="140" y="90" width="26" height="18" />

        {/* comms tower */}
        <path d="M196 108V80l3-6h18l3 6v28z" />
        <rect x="199" y="68" width="18" height="5" rx="2.5" />
        <rect x="206.5" y="44" width="3" height="24" />
        <circle cx="208" cy="42" r="4.5" />
        <rect x="204" y="47" width="9" height="2.5" rx="1.25" />

        {/* buildings, right of tower */}
        <rect x="244" y="90" width="22" height="18" />
        <rect x="248" y="84" width="8" height="6" />
        <rect x="272" y="94" width="16" height="14" />
        <rect x="298" y="84" width="16" height="24" />
        <rect x="330" y="92" width="18" height="16" />

        {/* right tree */}
        <rect x="388" y="72" width="5" height="36" />
        <path d="M380 108l6-18h10l6 18z" />
        <circle cx="390" cy="62" r="13" />
        <circle cx="377" cy="71" r="9" />
        <circle cx="404" cy="70" r="10" />
      </g>
    </svg>
  )
}

export function ReportPage() {
  const navigate = useNavigate()

  const [outageType, setOutageType] = useState<FormOutageType>('power')
  const [estate, setEstate] = useState('Rongai')
  const [provider, setProvider] = useState<OutageProvider | ''>('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const type: OutageType = outageType === 'power' ? 'POWER' : 'INTERNET'

    setSubmitting(true)
    try {
      await createOutage({
        type,
        estate,
        provider: provider === '' ? null : provider,
      })
      console.log(`[ReportPage] submitted ${type} outage for ${estate}`)
      navigate('/')
    } catch (error) {
      console.error('[ReportPage] could not submit report', error)
      alert(error instanceof Error ? error.message : 'Could not submit the report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="phone-shell report-page">
      <header className="report-header">
        <button
          type="button"
          className="report-header__back"
          aria-label="Go back"
          onClick={() => navigate('/')}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <h1 className="report-header__title">Report Outage</h1>
      </header>

      <main className="report-body">
        <form className="report-form" onSubmit={handleSubmit}>
          <section className="report-field">
            <h2 className="report-label">What&rsquo;s out?</h2>

            <div className="outage-tiles">
              <button
                type="button"
                className={`outage-tile outage-tile--power${outageType === 'power' ? ' is-selected' : ''}`}
                aria-pressed={outageType === 'power'}
                aria-label="Power outage"
                onClick={() => setOutageType('power')}
              >
                <Zap className="outage-tile__icon" fill="currentColor" stroke="none" aria-hidden="true" />
                <span className="outage-tile__label">Power</span>
                {outageType === 'power' && (
                  <span className="outage-tile__badge" aria-hidden="true">
                    <Check strokeWidth={3} />
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`outage-tile outage-tile--net${outageType === 'net' ? ' is-selected' : ''}`}
                aria-pressed={outageType === 'net'}
                aria-label="Internet outage"
                onClick={() => setOutageType('net')}
              >
                <Wifi className="outage-tile__icon" strokeWidth={2.4} aria-hidden="true" />
                <span className="outage-tile__label">Net</span>
                {outageType === 'net' && (
                  <span className="outage-tile__badge" aria-hidden="true">
                    <Check strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>
          </section>

          <section className="report-field report-field--spaced">
            <label className="report-label" htmlFor="report-estate">
              Where?
            </label>
            <div className="select-field">
              <MapPin className="select-field__icon" fill="currentColor" stroke="none" aria-hidden="true" />
              <select
                id="report-estate"
                className="select-field__input"
                value={estate}
                onChange={(event) => setEstate(event.target.value)}
              >
                {ESTATES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-field__chevron" aria-hidden="true" />
            </div>
          </section>

          <section className="report-field report-field--tight">
            <label className="report-label" htmlFor="report-provider">
              Provider (optional)
            </label>
            <div className="select-field">
              <Wifi className="select-field__icon" strokeWidth={2.2} aria-hidden="true" />
              <select
                id="report-provider"
                className="select-field__input"
                value={provider}
                onChange={(event) => setProvider(event.target.value as OutageProvider | '')}
              >
                {PROVIDERS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="select-field__chevron" aria-hidden="true" />
            </div>
          </section>

          <button type="submit" className="submit-button" disabled={submitting}>
            <Send className="submit-button__icon" aria-hidden="true" />
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </form>

        <p className="info-banner">
          <span className="info-banner__badge" aria-hidden="true">
            <Info strokeWidth={3} />
          </span>
          Needs 1 more confirmation to appear on the map
        </p>

        <Skyline />
      </main>
    </div>
  )
}

export default ReportPage
