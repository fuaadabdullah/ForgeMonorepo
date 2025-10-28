import { Activity, BarChart3, Brain, Hammer, MessageSquare, Settings, Users } from 'lucide-react'
import type { ElementType } from 'react'
import { NavLink, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { cn } from './lib/utils'
import ChatPage from './pages/ChatPage'
import CrewsPage from './pages/CrewsPage'
import ForgePage from './pages/ForgePage'
import MemoryPage from './pages/MemoryPage'
import MetricsPage from './pages/MetricsPage'
import ModelsPage from './pages/ModelsPage'

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card">
          <div className="flex h-16 items-center border-b border-border px-6">
            <Activity className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-xl font-bold">Overmind</h1>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            <NavItem to="/" icon={MessageSquare} label="Chat" />
            <NavItem to="/crews" icon={Users} label="Crews" />
            <NavItem to="/memory" icon={Brain} label="Memory" />
            <NavItem to="/metrics" icon={BarChart3} label="Metrics" />
            <NavItem to="/models" icon={Settings} label="Models" />
            <NavItem to="/forge" icon={Hammer} label="Forge" />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/crews" element={<CrewsPage />} />
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/forge" element={<ForgePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}

export default App
