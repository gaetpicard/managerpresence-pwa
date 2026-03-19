import React from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../App'

function Layout({ children, title }) {
  const { clubName, licence, deconnecter } = useApp()

  const navItems = [
    { path: '/', icon: '🏠', label: 'Tableau de bord' },
    { path: '/presences', icon: '✅', label: 'Présences' },
    { path: '/membres', icon: '👥', label: 'Membres' },
    { path: '/creneaux', icon: '📅', label: 'Créneaux' },
    { path: '/statistiques', icon: '📊', label: 'Statistiques' },
    { path: '/settings', icon: '⚙️', label: 'Paramètres' },
  ]

  const getPlanBadgeClass = () => {
    if (!licence) return 'badge-trial'
    switch (licence.plan) {
      case 'premium': return 'badge-premium'
      case 'standard': return 'badge-standard'
      default: return 'badge-trial'
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
                <span className={`badge ${getPlanBadgeClass()}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {licence?.planNom || licence?.plan?.toUpperCase() || 'TRIAL'}
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
            <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {licence.joursRestants > 0 ? (
                <span>✅ {licence.joursRestants} jours restants</span>
              ) : (
                <span style={{ color: 'var(--danger)' }}>❌ Licence expirée</span>
              )}
            </div>
          )}
          <button className="btn btn-secondary btn-block btn-sm" onClick={deconnecter}>
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      <main className="main-content">
        {title && (
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700' }}>{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

export default Layout
