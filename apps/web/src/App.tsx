import { useState } from 'react'
import { MapPage } from './pages/MapPage'
import { ReportPage } from './pages/ReportPage'

type Screen = 'map' | 'report' | 'status' | 'scheduled'

function App() {
  const [screen, setScreen] = useState<Screen>('map')

  return (
    <>
      {screen === 'map' && (
        <MapPage
          onNavigate={setScreen}
          onReportOutage={() => setScreen('report')}
        />
      )}

      {screen === 'report' && <ReportPage onBack={() => setScreen('map')} />}

      {(screen === 'status' || screen === 'scheduled') && (
        <div className="phone-shell">
          <p
            style={{
              margin: 'auto',
              padding: 24,
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--navy)',
            }}
          >
            {screen === 'status' ? 'Status coming soon' : 'Scheduled outages coming soon'}
          </p>
        </div>
      )}
    </>
  )
}

export default App
