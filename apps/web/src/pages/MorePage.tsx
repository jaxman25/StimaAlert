import { ChevronRight, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppTabBar } from './MapPage'
import './MorePage.css'

export function MorePage() {
  const navigate = useNavigate()

  return (
    <div className="phone-shell more-page">
      <header className="more-header">
        <h1 className="more-header__title">More</h1>
      </header>

      <main className="more-body">
        <button type="button" className="more-item" onClick={() => navigate('/admin')}>
          <ShieldCheck className="more-item__icon" aria-hidden="true" />
          <span className="more-item__label">Admin Portal</span>
          <ChevronRight className="more-item__chevron" aria-hidden="true" />
        </button>

        <button type="button" className="more-admin-link" onClick={() => navigate('/login')}>
          Admin Login
        </button>
      </main>

      <AppTabBar active="more" />
    </div>
  )
}

export default MorePage
