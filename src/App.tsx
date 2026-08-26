import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import CreatePage from './pages/CreatePage'

export default function App() {
  return (
    <BrowserRouter basename="/confluence">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreatePage />} />
      </Routes>
    </BrowserRouter>
  )
}
