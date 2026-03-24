import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function StatistiquesPage() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [eleves, setEleves] = useState([])
  const [presences, setPresences] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadStats = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [elevesData, presencesData, creneaux] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getAllPresences(),
          FirebaseService.getCreneaux()
        ])

        setEleves(elevesData)
        setPresences(presencesData)

        // Calculer les stats
        const totalPresences = presencesData.filter(p => p.present).length
        const totalAbsences = presencesData.filter(p => !p.present).length
        const tauxPresence = presencesData.length > 0 
          ? Math.round((totalPresences / presencesData.length) * 100) 
          : 0

        // Stats par mois
        const parMois = {}
        presencesData.forEach(p => {
          if (p.date) {
            const mois = p.date.substring(0, 7) // YYYY-MM
            if (!parMois[mois]) {
              parMois[mois] = { presences: 0, absences: 0 }
            }
            if (p.present) {
              parMois[mois].presences++
            } else {
              parMois[mois].absences++
            }
          }
        })

        // Top présences
        const presencesParEleve = {}
        presencesData.filter(p => p.present).forEach(p => {
          presencesParEleve[p.eleveId] = (presencesParEleve[p.eleveId] || 0) + 1
        })

        const topEleves = Object.entries(presencesParEleve)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([eleveId, count]) => {
            const eleve = elevesData.find(e => e.id === eleveId)
            return {
              nom: eleve ? `${eleve.prenom || ''} ${eleve.nom || ''}`.trim() : 'Inconnu',
              count
            }
          })

        // Stats par élève (pour export)
        const statsParEleve = elevesData.map(eleve => {
          const presencesEleve = presencesData.filter(p => p.eleveId === eleve.id)
          const nbPresent = presencesEleve.filter(p => p.present).length
          const nbAbsent = presencesEleve.filter(p => !p.present).length
          const taux = presencesEleve.length > 0 
            ? Math.round((nbPresent / presencesEleve.length) * 100) 
            : 0
          return {
            ...eleve,
            nbPresent,
            nbAbsent,
            tauxPresence: taux
          }
        }).sort((a, b) => b.tauxPresence - a.tauxPresence)

        setStats({
          totalMembres: elevesData.length,
          totalCreneaux: creneaux.length,
          totalPresences,
          totalAbsences,
          tauxPresence,
          parMois: Object.entries(parMois).sort((a, b) => a[0].localeCompare(b[0])),
          topEleves,
          statsParEleve
        })
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
    setIsLoading(false)
  }

  const exportPresencesCSV = () => {
    if (!stats?.statsParEleve) return

    const headers = ['Nom', 'Prénom', 'Groupe', 'Présences', 'Absences', 'Taux (%)']
    const rows = stats.statsParEleve.map(e => [
      e.nom || '',
      e.prenom || '',
      e.groupe || '',
      e.nbPresent,
      e.nbAbsent,
      e.tauxPresence
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `statistiques_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export CSV téléchargé', 'success')
  }

  const exportDetailCSV = () => {
    const headers = ['Date', 'Élève', 'Groupe', 'Statut']
    const rows = presences.map(p => {
      const eleve = eleves.find(e => e.id === p.eleveId)
      return [
        p.date || '',
        eleve ? `${eleve.prenom || ''} ${eleve.nom || ''}`.trim() : 'Inconnu',
        eleve?.groupe || '',
        p.present ? 'Présent' : 'Absent'
      ]
    })
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `presences_detail_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export détaillé téléchargé', 'success')
  }

  if (isLoading) {
    return (
      <Layout title="Statistiques">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
          <p>Chargement des statistiques...</p>
        </div>
      </Layout>
    )
  }

  if (!stats) {
    return (
      <Layout title="Statistiques">
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📊</p>
          <p style={{ color: 'var(--text-muted)' }}>Aucune donnée disponible</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Statistiques">
      {/* Toolbar */}
      <div className="toolbar">
        <div style={{ flex: 1 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Données basées sur {presences.length} enregistrements
          </span>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadStats}>
            🔄 Actualiser
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportPresencesCSV}>
            📤 Export résumé
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportDetailCSV}>
            📤 Export détaillé
          </button>
        </div>
      </div>

      {/* Stats principales */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalMembres}</div>
          <div className="stat-label">Membres</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.totalPresences}</div>
          <div className="stat-label">Présences totales</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-value">{stats.totalAbsences}</div>
          <div className="stat-label">Absences totales</div>
        </div>
        
        <div className="stat-card" style={{ background: stats.tauxPresence >= 70 ? 'var(--success)' : stats.tauxPresence >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.tauxPresence}%</div>
          <div className="stat-label">Taux de présence</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Top présences */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🏆 Top présences</h3>
          </div>
          
          {stats.topEleves.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Pas encore de données</p>
          ) : (
            <div>
              {stats.topEleves.map((eleve, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: index < stats.topEleves.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      width: '28px', 
                      height: '28px', 
                      background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--bg-input)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </span>
                    <span>{eleve.nom}</span>
                  </div>
                  <span className="badge badge-success">{eleve.count} présences</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique par mois */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📅 Historique mensuel</h3>
          </div>
          
          {stats.parMois.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Pas encore de données</p>
          ) : (
            <div>
              {stats.parMois.slice(-6).reverse().map(([mois, data]) => {
                const total = data.presences + data.absences
                const taux = total > 0 ? Math.round((data.presences / total) * 100) : 0
                const moisFormate = new Date(mois + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                
                return (
                  <div 
                    key={mois}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ textTransform: 'capitalize' }}>{moisFormate}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{taux}%</span>
                    </div>
                    <div style={{ 
                      height: '8px', 
                      background: 'var(--bg-input)', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${taux}%`, 
                        height: '100%', 
                        background: taux >= 70 ? 'var(--success)' : taux >= 50 ? 'var(--warning)' : 'var(--danger)',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {data.presences} présences / {data.absences} absences
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}
    </Layout>
  )
}

export default StatistiquesPage
