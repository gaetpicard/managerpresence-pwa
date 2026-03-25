import React from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../App'

function Layout({ children, title }) {
  const { clubName, licence, deconnecter, generatedBy, termes } = useApp()

  // 🏷️ Navigation avec termes dynamiques
  const navItems = [
    { path: '/', icon: '🏠', label: 'Tableau de bord' },
    { path: '/presences', icon: '✅', label: 'Présences' },
    { path: '/membres', icon: '👥', label: termes?.eleves || 'Membres' },
    { path: '/creneaux', icon: '📅', label: termes?.creneaux || 'Créneaux' },
    { path: '/dates', icon: '🗓️', label: termes?.seances || 'Dates' },
    { path: '/cadres', icon: '👔', label: termes?.cadres || 'Cadres' },
    { path: '/statistiques', icon: '📊', label: 'Statistiques' },
    { path: '/exports', icon: '📤', label: 'Exports' },
    { path: '/forum', icon: '💬', label: 'Forum' },
    { path: '/audit', icon: '📋', label: 'Audit' },
  ]

  const getPlanBadgeClass = () => {
    if (!licence) return 'badge-trial'
    switch (licence.plan) {
      case 'premium': return 'badge-premium'
      case 'standard': return 'badge-standard'
      default: return 'badge-trial'
    }
  }

  const getPlanEmoji = () => {
    if (!licence) return '⏳'
    switch (licence.plan) {
      case 'premium': return '🌟'
      case 'standard': return '📘'
      default: return '⏳'
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">MP</div>
            <div className="sidebar-logo-text">
              <h1>{clubName || 'ManagerPresence'}</h1>
              <p>
                <span className={`badge ${getPlanBadgeClass()}`}>
                  {getPlanEmoji()} {licence?.planNom || licence?.plan?.toUpperCase() || 'TRIAL'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink 
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {licence && (
            <div className="licence-info">
              {licence.joursRestants > 0 ? (
                <span>✅ {licence.joursRestants} jours restants</span>
              ) : (
                <span style={{ color: 'var(--danger)' }}>❌ Licence expirée</span>
              )}
            </div>
          )}
          {generatedBy && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
              Connecté par {generatedBy}
            </div>
          )}
          <button className="btn btn-danger btn-block btn-sm" onClick={deconnecter}>
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      <main className="main-content">
        {title && (
          <div className="page-header">
            <h1 className="page-title">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

export default Layout
