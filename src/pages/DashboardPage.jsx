import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useApp } from '../App'
import { FirebaseService } from '../services/FirebaseService'

function DashboardPage() {
  const { licence, clubName, termes, t, lang } = useApp()
  const [stats, setStats] = useState({ totalMembres: 0, totalCreneaux: 0, seancesPointees: 0, tauxPresence: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [eleves, creneaux, seances] = await Promise.all([
          FirebaseService.getEleves(), FirebaseService.getCreneaux(), FirebaseService.getSeances()
        ])
        const seancesPointees = seances.filter(s => {
          const hasPresences = s.presences && Object.keys(s.presences).length > 0
          const isValidated = s.creneauxValides && s.creneauxValides.length > 0
          return hasPresences || isValidated
        })
        let totalPresent = 0, totalPointages = 0
        seancesPointees.forEach(seance => {
          if (seance.presences) {
            Object.values(seance.presences).forEach(status => {
              totalPointages++
              if (status === 'PRESENT' || status === true) totalPresent++
            })
          }
        })
        const tauxPresence = totalPointages > 0 ? Math.round((totalPresent / totalPointages) * 100) : 0
        setStats({ totalMembres: eleves.length, totalCreneaux: creneaux.filter(c => c.actif !== false).length, seancesPointees: seancesPointees.length, tauxPresence })
      }
    } catch (error) { console.error('Erreur chargement stats:', error) }
    setIsLoading(false)
  }

  const formatDate = () => {
    const locale = { FR: 'fr-FR', EN: 'en-GB', ES: 'es-ES', DE: 'de-DE', IT: 'it-IT', PT: 'pt-PT' }[lang] || 'fr-FR'
    return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getTauxColor = (taux) => {
    if (taux >= 80) return 'var(--success)'
    if (taux >= 60) return 'var(--warning)'
    return 'var(--danger)'
  }

  return (
    <Layout title={t('dashboard_title')}>
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{t('dashboard_welcome')} {clubName} 👋</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{formatDate()}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{isLoading ? '...' : stats.totalMembres}</div>
          <div className="stat-label">{termes?.eleves || t('members_title')} {t('dashboard_members_registered')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{isLoading ? '...' : stats.totalCreneaux}</div>
          <div className="stat-label">{termes?.creneaux || t('slots_title')} {t('dashboard_slots_active')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🗓️</div>
          <div className="stat-value">{isLoading ? '...' : stats.seancesPointees}</div>
          <div className="stat-label">{termes?.seances || t('dates_title')} {t('dashboard_sessions_pointed')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value" style={{ color: isLoading ? 'inherit' : getTauxColor(stats.tauxPresence) }}>
            {isLoading ? '...' : `${stats.tauxPresence}%`}
          </div>
          <div className="stat-label">{t('dashboard_attendance_rate')}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">{t('dashboard_licence_info')}</h3></div>
        {licence && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('dashboard_plan')}</p>
              <span className={`badge badge-${licence.plan}`}>{licence.planNom || licence.plan?.toUpperCase()}</span>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('dashboard_days_left')}</p>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{licence.joursRestants} {t('licence_expires')}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('dashboard_expiry')}</p>
              <p style={{ fontSize: '14px' }}>{new Date(licence.dateExpiration).toLocaleDateString()}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('dashboard_status')}</p>
              {licence.actif ? <span className="badge badge-success">{t('dashboard_active')}</span> : <span className="badge badge-danger">{t('dashboard_expired')}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">{t('dashboard_quick_actions')}</h3></div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/presences" className="btn btn-primary">{t('dashboard_see_presences')}</a>
          <a href="/membres" className="btn btn-secondary">👥 {t('dashboard_manage_members')} {termes?.eleves?.toLowerCase() || t('members_title').toLowerCase()}</a>
          <a href="/exports" className="btn btn-secondary">{t('dashboard_export_data')}</a>
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
