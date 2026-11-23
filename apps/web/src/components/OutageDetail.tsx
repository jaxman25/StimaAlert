import { Check, Clock, Flag, ThumbsUp, Users, Zap } from 'lucide-react'
import './OutageDetail.css'

type OutageDetailProps = {
  onClose: () => void
}

/**
 * Outage detail bottom sheet. Content is hardcoded to match
 * reference-ui/03_outage_detail.png until the data layer lands.
 */
export function OutageDetail({ onClose }: OutageDetailProps) {
  return (
    <div className="detail-overlay">
      <div
        className="detail-scrim"
        onClick={onClose}
        aria-hidden="true"
      />

      <section
        className="detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outage-detail-title"
      >
        <span className="detail-handle" aria-hidden="true" />

        <div className="detail-header">
          <span className="detail-disc" aria-hidden="true">
            <Zap fill="currentColor" stroke="none" />
          </span>

          <div className="detail-heading">
            <h2 id="outage-detail-title" className="detail-title">
              Power Outage
            </h2>
            <p className="detail-subtitle">Rongai 45 · KPLC</p>
            <p className="detail-time">
              <Clock aria-hidden="true" />
              Reported 15 min ago
            </p>
          </div>
        </div>

        <div className="detail-confirmations">
          <Users strokeWidth={2.4} aria-hidden="true" />
          <span>4 people confirmed</span>
        </div>

        <p className="detail-status">
          <span className="detail-status__dot" aria-hidden="true" />
          Still active
        </p>

        <div className="detail-actions">
          <button type="button" className="detail-action detail-action--out">
            <ThumbsUp aria-hidden="true" />
            Still out
          </button>
          <button type="button" className="detail-action detail-action--back">
            <Check strokeWidth={2.6} aria-hidden="true" />
            It&rsquo;s back
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
