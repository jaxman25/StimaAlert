import { useState } from 'react'
import { AdminPage } from './pages/AdminPage'
import { MapPage } from './pages/MapPage'
import { ReportPage } from './pages/ReportPage'
import { ScheduledPage } from './pages/ScheduledPage'
import { StatusPage } from './pages/StatusPage'

type Screen = 'map' | 'report' | 'status' | 'scheduled' | 'admin'

function App() {
  const [screen, setScreen] = useState<Screen>('map')

  return (
    <>
      {screen === 'map' && (
        <MapPage
          onNavigate={setScreen}
          onReportOutage={() => setScreen('report')}
          onOpenAdmin={() => setScreen('admin')}
        />
      )}

      {screen === 'report' && <ReportPage onBack={() => setScreen('map')} />}

      {screen === 'status' && (
        <StatusPage onBack={() => setScreen('map')} onNavigate={setScreen} />
      )}

      {screen === 'scheduled' && (
        <ScheduledPage onBack={() => setScreen('map')} onNavigate={setScreen} />
      )}

      {screen === 'admin' && <AdminPage onBack={() => setScreen('map')} />}
    </>
  )
}

export default App
