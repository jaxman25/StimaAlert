import { useEffect, useState } from 'react'
import { Check, Clock, Flag, ThumbsUp, Users, Wifi, Zap } from 'lucide-react'
import {
  DEMO_USER_ID,
  submitConfirmation,
  type ConfirmationKind,
  type Outage,
} from '../lib/api'
import { providerLabel } from '../lib/format'
import { supabase } from '../lib/supabase'
import './OutageDetail.css'

type OutageDetailProps = {
  outage: Outage
  onClose: () => void
}

const STATUS_LABEL: Record<Outage['status'], string> = {
  ACTIVE: 'Still active',
  PENDING: 'Awaiting confirmations',
  RESOLVED: 'Resolved',
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

/** Outage detail bottom sheet for the pin the user tapped. */
export function OutageDetail({ outage, onClose }: OutageDetailProps) {
  const isPower = outage.type === 'POWER'
  const [pending, setPending] = useState<ConfirmationKind | null>(null)
  const [reports, setReports] = useState(outage.reports)

  /* Live count: this outage's confirmations, including other people's votes. */
  useEffect(() => {
    setReports(outage.reports)

    const channel = supabase
      .channel(`outage-${outage.id}-confirmations`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'confirmations',
          filter: `outage_id=eq.${outage.id}`,
        },
        () => setReports((current) => current + 1),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [outage.id, outage.reports])

  const subtitle = outage.provider
    ? `${outage.estate} · ${providerLabel(outage.provider)}`
    : outage.estate

  const confirm = async (kind: ConfirmationKind) => {
    if (pending) return

    setPending(kind)
    try {
      await submitConfirmation(outage.id, DEMO_USER_ID, kind)
      onClose()
    } catch (error) {
      console.error('[OutageDetail] could not save confirmation', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Could not save your confirmation. Please try again.',
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="detail-overlay">
      <div className="detail-scrim" onClick={onClose} aria-hidden="true" />

      <section
        className="detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outage-detail-title"
      >
        <span className="detail-handle" aria-hidden="true" />

        <div className="detail-header">
          <span className="detail-disc" aria-hidden="true">
            {isPower ? (
              <Zap fill="currentColor" stroke="none" />
            ) : (
              <Wifi strokeWidth={2.4} />
            )}
          </span>

          <div className="detail-heading">
            <h2 id="outage-detail-title" className="detail-title">
              {isPower ? 'Power Outage' : 'Internet Outage'}
            </h2>
            <p className="detail-subtitle">{subtitle}</p>
            <p className="detail-time">
              <Clock aria-hidden="true" />
              Reported {timeAgo(outage.reported_at)}
            </p>
          </div>
        </div>

        <div className="detail-confirmations">
          <Users strokeWidth={2.4} aria-hidden="true" />
          <span>
            {reports} {reports === 1 ? 'person' : 'people'} confirmed
          </span>
        </div>

        <p className="detail-status">
          <span className="detail-status__dot" aria-hidden="true" />
          {STATUS_LABEL[outage.status]}
        </p>

        <div className="detail-actions">
          <button
            type="button"
            className="detail-action detail-action--out"
            onClick={() => confirm('STILL_OUT')}
            disabled={pending !== null}
          >
            <ThumbsUp aria-hidden="true" />
            {pending === 'STILL_OUT' ? 'Saving…' : 'Still out'}
          </button>
          <button
            type="button"
            className="detail-action detail-action--back"
            onClick={() => confirm('BACK')}
            disabled={pending !== null}
          >
            <Check strokeWidth={2.6} aria-hidden="true" />
            {pending === 'BACK' ? 'Saving…' : 'It’s back'}
          </button>
        </div>

        <div className="detail-footer">
          <button type="button" className="detail-flag-button">
            <Flag fill="currentColor" stroke="none" aria-hidden="true" />
            Flag as fake
          </button>
        </div>
      </section>
    </div>
  )
}

export default OutageDetail
