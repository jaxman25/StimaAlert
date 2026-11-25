import { ChevronRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { moreFaq } from '../lib/seo'
import { AppTabBar } from '../components/AppTabBar'
import './MorePage.css'

export function MorePage() {
  return (
    <div className="phone-shell more-page">
      <header className="more-header">
        <h1 className="more-header__title">More</h1>
      </header>

      <main className="more-body">
        <Link className="more-item" to="/admin">
          <ShieldCheck className="more-item__icon" aria-hidden="true" />
          <span className="more-item__label">Admin Portal</span>
          <ChevronRight className="more-item__chevron" aria-hidden="true" />
        </Link>

        <section className="more-faq" aria-labelledby="more-faq-title">
          <h2 className="more-faq__title" id="more-faq-title">Questions</h2>
          {moreFaq.map((item) => (
            <details className="more-faq__item" key={item.question}>
              <summary className="more-faq__question">{item.question}</summary>
              <p className="more-faq__answer">{item.answer}</p>
            </details>
          ))}
        </section>

        <Link className="more-admin-link" to="/login">
          Admin Login
        </Link>
      </main>

      <AppTabBar active="more" />
    </div>
  )
}

export default MorePage
