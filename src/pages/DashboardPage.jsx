import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useApp } from '../App'
import { FirebaseService } from '../services/FirebaseService'

function DashboardPage() {
  const { licence, clubName } = useApp()
  const [stats, setStats] = useState({
    totalMembres: 0,
    totalCreneaux: 0,
    presencesAujourdhui: 0,
    tauxPresence: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [eleves, creneaux, presences] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux(),
          FirebaseService.getAllPresences()
        ])

        const today = new Date().toISOString().split('T')[0]
        const presencesToday = presences.filter(p => p.date === today && p.present)
        
        const totalPresences = presences.filter(p => p.present).length
        const totalRecords = presences.length
        const tauxPresence = totalRecords > 0 ? Math.round((totalPresences / totalRecords) * 100) : 0

        setStats({
          totalMembres: eleves.length,
          totalCreneaux: creneaux.length,
          presencesAujourdhui: presencesToday.length,
          tauxPresence
        })
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
    setIsLoading(false)
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Layout title="Tableau de bord">
      {/* Message de bienvenue */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
          Bienvenue sur {clubName} 👋
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {formatDate()}
        </p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{isLoading ? '...' : stats.totalMembres}</div>
          <div className="stat-label">Membres inscrits</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{isLoading ? '...' : stats.totalCreneaux}</div>
          <div className="stat-label">Créneaux actifs</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{isLoading ? '...' : stats.presencesAujourdhui}</div>
          <div className="stat-label">Présences aujourd'hui</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{isLoading ? '...' : `${stats.tauxPresence}%`}</div>
          <div className="stat-label">Taux de présence</div>
        </div>
      </div>

      {/* Infos licence */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Informations de licence</h3>
        </div>
        
        {licence && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Plan</p>
              <span className={`badge badge-${licence.plan}`}>
                {licence.planNom || licence.plan?.toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Jours restants</p>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{licence.joursRestants} jours</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Expiration</p>
              <p style={{ fontSize: '14px' }}>
                {new Date(licence.dateExpiration).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Statut</p>
              {licence.actif ? (
                <span className="badge badge-success">✅ Actif</span>
              ) : (
                <span className="badge badge-danger">❌ Expiré</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚡ Actions rapides</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/presences" className="btn btn-primary">
            ✅ Saisir les présences
          </a>
          <a href="/membres" className="btn btn-secondary">
            👥 Gérer les membres
          </a>
          <a href="/statistiques" className="btn btn-secondary">
            📊 Voir les statistiques
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
