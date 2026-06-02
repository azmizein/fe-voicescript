import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Reporters from './pages/Reporters';
import Editors from './pages/Editors';
import Transcriptions from './pages/Transcriptions';
import Payments from './pages/Payments';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/jobs', label: 'Jobs', icon: '📋' },
  { to: '/reporters', label: 'Reporters', icon: '🎙️' },
  { to: '/editors', label: 'Editors', icon: '✏️' },
  { to: '/autoscript', label: 'AutoScript', icon: '🤖' },
  { to: '/payments', label: 'Payments', icon: '💰' },
];

export default function App() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚖️</div>
          <span className="sidebar-logo-text">VoiceScript</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              id={`nav-${label.toLowerCase()}`}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px 8px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>VoiceScript v1.0</div>
            Court Reporting<br />Workflow Manager
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/reporters" element={<Reporters />} />
          <Route path="/editors" element={<Editors />} />
          <Route path="/autoscript" element={<Transcriptions />} />
          <Route path="/payments" element={<Payments />} />
        </Routes>
      </main>
    </div>
  );
}
