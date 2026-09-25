import React from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../App'

function Layout({ children, title }) {
  const { clubName, licence, deconnecter, generatedBy, termes, t } = useApp()

  const navItems = [
    { path: '/', icon: '🏠', label: t('nav_dashboard') },
    { path: '/presences', icon: '✅', label: t('nav_presences') },
    { path: '/membres', icon: '👥', label: termes?.eleves || t('members_title') },
    { path: '/creneaux', icon: '📅', label: termes?.creneaux || t('slots_title') },
    { path: '/dates', icon: '🗓️', label: termes?.seances || t('dates_title') },
    { path: '/cadres', icon: '👔', label: termes?.cadres || t('cadres_title') },
    { path: '/exports', icon: '📤', label: t('nav_exports') },
    { path: '/forum', icon: '💬', label: t('nav_forum') },
    { path: '/audit', icon: '📋', label: t('nav_audit') },
    { path: '/parametres', icon: '⚙️', label: t('nav_settings') },
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
                <span>✅ {licence.joursRestants} {t('licence_expires')}</span>
              ) : (
                <span style={{ color: 'var(--danger)' }}>{t('licence_expired')}</span>
              )}
            </div>
          )}
          {generatedBy && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
              {t('connected_by')} {generatedBy}
            </div>
          )}
          <button className="btn btn-danger btn-block btn-sm" onClick={deconnecter}>
            {t('nav_logout')}
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
