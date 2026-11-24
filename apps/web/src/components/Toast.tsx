import { useEffect } from 'react'
import './Toast.css'

type ToastProps = {
  message: string
  onDismiss: () => void
}

/** Small floating notice used for live map updates. Auto-dismisses after 3s. */
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 3000)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div className="map-toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}

export default Toast
