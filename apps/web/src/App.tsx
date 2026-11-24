import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { MapPage } from './pages/MapPage'
import { MorePage } from './pages/MorePage'
import { ReportPage } from './pages/ReportPage'
import { ScheduledPage } from './pages/ScheduledPage'
import { StatusPage } from './pages/StatusPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/scheduled" element={<ScheduledPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
