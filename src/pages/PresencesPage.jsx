import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { useApp } from '../App'

function PresencesPage() {
  const { termes, clubName } = useApp()
  const [eleves, setEleves] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [seances, setSeances] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  // Filtres
  const [filterCreneau, setFilterCreneau] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [elevesData, creneauxData, seancesData] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux(),
          FirebaseService.getSeances()
        ])

        setEleves(elevesData)
        setCreneaux(creneauxData)
        
        // Trier les séances par date
        const sorted = seancesData.sort((a, b) => {
          const parseDate = (d) => {
            if (!d) return 0
            const parts = d.split('/')
            if (parts.length !== 2) return 0
            return parseInt(parts[1]) * 100 + parseInt(parts[0])
          }
          return parseDate(a.date) - parseDate(b.date)
        })
        setSeances(sorted)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  // Filtrer les séances (ne garder que celles avec pointages ou validées)
  const seancesFiltrees = seances.filter(s => {
    const hasPresences = s.presences && Object.keys(s.presences).length > 0
    const isValidated = s.creneauxValides && s.creneauxValides.length > 0
    if (!hasPresences && !isValidated) return false
    if (filterCreneau && !s.creneauxActifsIds?.includes(filterCreneau)) return false
    return true
  })

  // Obtenir les créneaux triés
  const creneauxTries = creneaux
    .filter(c => c.actif !== false)
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))

  // Calculer les stats par élève
  const calculateStats = (eleveId, creneauId) => {
    let present = 0, absent = 0, excuse = 0, retard = 0, total = 0
    
    seancesFiltrees.forEach(seance => {
      if (creneauId && !seance.creneauxActifsIds?.includes(creneauId)) return
      
      const key = `${eleveId}_${creneauId || ''}`
      const presence = seance.presences?.[key]
      
      if (seance.creneauxActifsIds?.includes(creneauId || filterCreneau)) {
        total++
        if (presence === 'PRESENT' || presence === true) present++
        else if (presence === 'ABSENT' || presence === false) absent++
        else if (presence === 'EXCUSE' || presence === 'excuse') excuse++
        else if (presence === 'RETARD' || presence === 'retard') retard++
      }
    })
    
    const taux = total > 0 ? Math.round((present / total) * 100) : 0
    return { present, absent, excuse, retard, total, taux }
  }

  // Rendu d'une cellule de présence
  const renderPresenceCell = (seance, eleveId, creneauId) => {
    const isActive = seance.creneauxActifsIds?.includes(creneauId)
    if (!isActive) {
      return (
        <td key={seance.id} style={{ 
          background: '#3a3a3a', 
          textAlign: 'center',
          padding: '4px',
          border: '1px solid var(--border)'
        }}>
          -
        </td>
      )
    }
    
    const key = `${eleveId}_${creneauId}`
    const presence = seance.presences?.[key]
    
    let bgColor = 'transparent'
    let symbol = '○'
    let textColor = 'var(--text-muted)'
    
    if (presence === 'PRESENT' || presence === true) {
      bgColor = 'var(--present)'
      symbol = '✓'
      textColor = 'white'
    } else if (presence === 'ABSENT' || presence === false) {
      bgColor = 'var(--absent)'
      symbol = '✗'
      textColor = 'white'
    } else if (presence === 'EXCUSE' || presence === 'excuse') {
      bgColor = 'var(--excuse)'
      symbol = 'E'
      textColor = 'black'
    } else if (presence === 'RETARD' || presence === 'retard') {
      bgColor = 'var(--retard)'
      symbol = 'R'
      textColor = 'white'
    }
    
    return (
      <td key={seance.id} style={{ 
        background: bgColor, 
        textAlign: 'center',
        padding: '4px',
        fontWeight: 600,
        fontSize: '14px',
        color: textColor,
        border: '1px solid var(--border)'
      }}>
        {symbol}
      </td>
    )
  }

  // Couleur du taux
  const getTauxColor = (taux) => {
    if (taux >= 80) return 'var(--success)'
    if (taux >= 60) return 'var(--warning)'
    return 'var(--danger)'
  }

  if (isLoading) {
    return (
      <Layout title="Présences">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </Layout>
    )
  }

  if (seancesFiltrees.length === 0) {
    return (
      <Layout title="Présences">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Aucun pointage</div>
          <div className="empty-state-desc">
            Les présences apparaîtront une fois des pointages effectués depuis l'application mobile
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Présences">
      {/* En-tête avec infos */}
      <div className="card" style={{ 
        padding: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-lg)',
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px', marginBottom: '8px' }}>
          📋 Tableau de Présence — {clubName || 'Structure'}
        </h2>
        <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
          {seancesFiltrees.length} {termes?.seances?.toLowerCase() || 'séances'} pointées • {eleves.length} {termes?.eleves?.toLowerCase() || 'membres'}
        </p>
      </div>

      {/* Filtre créneau */}
      <div className="toolbar" style={{ marginBottom: 'var(--spacing-md)' }}>
        <select
          className="form-input form-select"
          style={{ minWidth: '200px' }}
          value={filterCreneau}
          onChange={(e) => setFilterCreneau(e.target.value)}
        >
          <option value="">Tous les {termes?.creneaux?.toLowerCase() || 'créneaux'}</option>
          {creneauxTries.map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          🔄 Actualiser
        </button>
      </div>

      {/* Légende */}
      <div className="card" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ background: 'var(--present)', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>✓</span> Présent
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ background: 'var(--absent)', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>✗</span> Absent
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ background: 'var(--excuse)', color: 'black', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>E</span> Excusé
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ background: 'var(--retard)', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: 600 }}>R</span> Retard
          </span>
        </div>
      </div>

      {/* TABLEAU DE PRÉSENCE par créneau */}
      {(filterCreneau ? [creneaux.find(c => c.id === filterCreneau)] : creneauxTries).filter(Boolean).map(creneau => {
        const elevesInCreneau = eleves
          .filter(e => e.creneauxIds?.includes(creneau.id))
          .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))
        
        if (elevesInCreneau.length === 0) return null
        
        const seancesCreneau = seancesFiltrees.filter(s => s.creneauxActifsIds?.includes(creneau.id))
        if (seancesCreneau.length === 0) return null

        return (
          <div key={creneau.id} className="card" style={{ padding: 0, marginBottom: 'var(--spacing-lg)', overflow: 'hidden' }}>
            <div style={{ 
              background: 'var(--info)', 
              color: 'white', 
              padding: 'var(--spacing-sm) var(--spacing-md)',
              fontWeight: 600
            }}>
              📅 {creneau.nom} {creneau.description && `— ${creneau.description}`}
            </div>
            
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ 
                      position: 'sticky', 
                      left: 0, 
                      background: 'var(--bg-elevated)', 
                      zIndex: 2,
                      minWidth: '140px',
                      borderRight: '2px solid var(--border)'
                    }}>
                      {termes?.eleves || 'Élèves'}
                    </th>
                    {seancesCreneau.map(seance => (
                      <th key={seance.id} style={{ 
                        textAlign: 'center', 
                        minWidth: '50px', 
                        padding: '6px 4px',
                        fontSize: '11px'
                      }}>
                        {seance.date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Ligne d'en-tête créneau (validations) */}
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <td style={{ 
                      position: 'sticky', 
                      left: 0, 
                      background: 'rgba(33, 150, 243, 0.2)',
                      fontWeight: 600,
                      color: 'var(--info)',
                      borderRight: '2px solid var(--border)'
                    }}>
                      {creneau.nom}
                    </td>
                    {seancesCreneau.map(seance => {
                      const isActive = seance.creneauxActifsIds?.includes(creneau.id)
                      const isValidated = seance.creneauxValides?.includes(creneau.id)
                      return (
                        <td key={seance.id} style={{ 
                          textAlign: 'center',
                          background: isValidated ? 'rgba(33, 150, 243, 0.3)' : isActive ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                          fontWeight: 600,
                          color: 'var(--info)'
                        }}>
                          {isValidated ? '✓✓' : isActive ? '·' : ''}
                        </td>
                      )
                    })}
                  </tr>
                  {/* Lignes élèves */}
                  {elevesInCreneau.map(eleve => (
                    <tr key={eleve.id}>
                      <td style={{ 
                        position: 'sticky', 
                        left: 0, 
                        background: 'var(--bg-card)',
                        fontSize: '13px',
                        borderRight: '2px solid var(--border)'
                      }}>
                        {eleve.prenom} <span style={{ color: 'var(--text-muted)' }}>{eleve.nom}</span>
                      </td>
                      {seancesCreneau.map(seance => renderPresenceCell(seance, eleve.id, creneau.id))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {/* TABLEAU DE STATISTIQUES */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ 
          background: 'var(--bg-elevated)', 
          padding: 'var(--spacing-sm) var(--spacing-md)',
          fontWeight: 600,
          borderBottom: '1px solid var(--border)'
        }}>
          📊 Statistiques par {termes?.eleve?.toLowerCase() || 'élève'}
        </div>
        
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>{termes?.eleve || 'Élève'}</th>
                <th>{termes?.creneau || 'Groupe'}</th>
                <th style={{ textAlign: 'center', background: 'rgba(76, 175, 80, 0.2)' }}>✓ Présent</th>
                <th style={{ textAlign: 'center', background: 'rgba(244, 67, 54, 0.2)' }}>✗ Absent</th>
                <th style={{ textAlign: 'center', background: 'rgba(255, 152, 0, 0.2)' }}>E Excusé</th>
                <th style={{ textAlign: 'center' }}>Total</th>
                <th style={{ textAlign: 'center' }}>% Présence</th>
              </tr>
            </thead>
            <tbody>
              {(filterCreneau ? [creneaux.find(c => c.id === filterCreneau)] : creneauxTries).filter(Boolean).map(creneau => {
                const elevesInCreneau = eleves
                  .filter(e => e.creneauxIds?.includes(creneau.id))
                  .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))
                
                return elevesInCreneau.map(eleve => {
                  const stats = calculateStats(eleve.id, creneau.id)
                  if (stats.total === 0) return null
                  
                  return (
                    <tr key={`${eleve.id}-${creneau.id}`}>
                      <td>{eleve.prenom} {eleve.nom}</td>
                      <td>
                        <span style={{ 
                          background: 'var(--info)', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {creneau.nom}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', background: 'rgba(76, 175, 80, 0.1)' }}>{stats.present}</td>
                      <td style={{ textAlign: 'center', background: 'rgba(244, 67, 54, 0.1)' }}>{stats.absent}</td>
                      <td style={{ textAlign: 'center', background: 'rgba(255, 152, 0, 0.1)' }}>{stats.excuse}</td>
                      <td style={{ textAlign: 'center' }}>{stats.total}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: getTauxColor(stats.taux) }}>
                        {stats.taux}%
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <p style={{ 
        color: 'var(--text-muted)', 
        fontSize: '11px', 
        marginTop: 'var(--spacing-lg)',
        textAlign: 'center'
      }}>
        Généré automatiquement par ManagerPresence PWA — {clubName || 'Structure'}
      </p>

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

export default PresencesPage
