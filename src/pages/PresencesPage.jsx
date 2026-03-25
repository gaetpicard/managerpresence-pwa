import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { useApp } from '../App'

function PresencesPage() {
  const { termes } = useApp()
  const [eleves, setEleves] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [presences, setPresences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  // Filtres
  const [selectedCreneau, setSelectedCreneau] = useState('')
  const [filterGroupe, setFilterGroupe] = useState('')
  
  // Mode pointage (désactivé par défaut sur PC)
  const [pointageActif, setPointageActif] = useState(false)
  
  // Dates à afficher (7 dernières dates avec présences)
  const [datesAffichees, setDatesAffichees] = useState([])

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
        const [elevesData, creneauxData, presencesData] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux(),
          FirebaseService.getAllPresences()
        ])
        
        setEleves(elevesData)
        setCreneaux(creneauxData.filter(c => c.actif !== false))
        setPresences(presencesData)
        
        // Sélectionner le premier créneau par défaut
        if (creneauxData.length > 0 && !selectedCreneau) {
          setSelectedCreneau(creneauxData[0].id)
        }
        
        // Calculer les dates à afficher (7 dernières dates avec présences)
        const uniqueDates = [...new Set(presencesData.map(p => p.date).filter(Boolean))]
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 7)
          .reverse() // Plus anciennes à gauche
        setDatesAffichees(uniqueDates)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  // Filtrer les élèves par groupe et créneau
  const elevesFiltre = eleves.filter(e => {
    const matchGroupe = filterGroupe === '' || e.groupe === filterGroupe
    const matchCreneau = selectedCreneau === '' || e.creneauxIds?.includes(selectedCreneau)
    return matchGroupe && matchCreneau
  }).sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`))

  // Grouper les élèves par groupe
  const elevesParGroupe = elevesFiltre.reduce((acc, eleve) => {
    const groupe = eleve.groupe || 'Sans groupe'
    if (!acc[groupe]) acc[groupe] = []
    acc[groupe].push(eleve)
    return acc
  }, {})

  // Obtenir la présence pour un élève et une date
  const getPresence = (eleveId, date) => {
    return presences.find(p => 
      p.eleveId === eleveId && 
      p.date === date && 
      (selectedCreneau === '' || p.creneauId === selectedCreneau)
    )
  }

  // Rendu du statut de présence
  const renderStatut = (presence) => {
    if (!presence) return <span className="statut-vide">○</span>
    
    const statut = presence.present
    if (statut === true) return <span className="statut-present">✓</span>
    if (statut === false) return <span className="statut-absent">✗</span>
    if (statut === 'excuse') return <span className="statut-excuse">E</span>
    if (statut === 'retard') return <span className="statut-retard">R</span>
    return <span className="statut-vide">○</span>
  }

  // Changer le statut (si pointage actif)
  const cycleStatut = async (eleveId, date) => {
    if (!pointageActif) {
      showToast('Activez le mode pointage pour modifier', 'info')
      return
    }
    
    const presence = getPresence(eleveId, date)
    const currentStatut = presence?.present
    
    // Cycle: vide → présent → absent → excusé → retard → vide
    let newStatut
    if (currentStatut === undefined || currentStatut === null) newStatut = true
    else if (currentStatut === true) newStatut = false
    else if (currentStatut === false) newStatut = 'excuse'
    else if (currentStatut === 'excuse') newStatut = 'retard'
    else newStatut = true
    
    try {
      await FirebaseService.setPresence(eleveId, date, selectedCreneau, newStatut)
      await loadData()
    } catch (error) {
      console.error('Erreur pointage:', error)
      showToast('Erreur lors du pointage', 'error')
    }
  }

  // Formater la date pour l'affichage (JJ/MM)
  const formatDateShort = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}`
  }

  // Liste des groupes
  const uniqueGroupes = [...new Set(eleves.map(e => e.groupe).filter(Boolean))].sort()

  // Couleurs des groupes (comme l'app Android)
  const getGroupeColor = (groupe) => {
    const colors = {
      'G1': '#4CAF50',
      'G2': '#2196F3', 
      'G3': '#FF9800',
      'G4': '#9C27B0',
      'G5': '#F44336',
      'G Perf': '#E91E63'
    }
    return colors[groupe] || '#607D8B'
  }

  if (isLoading) {
    return (
      <Layout title="Présences">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Présences">
      {/* Barre de filtres */}
      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <select
          className="form-input form-select"
          style={{ minWidth: '180px' }}
          value={selectedCreneau}
          onChange={(e) => setSelectedCreneau(e.target.value)}
        >
          <option value="">Tous les {termes?.creneaux?.toLowerCase() || 'créneaux'}</option>
          {creneaux.map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>

        <select
          className="form-input form-select"
          style={{ minWidth: '150px' }}
          value={filterGroupe}
          onChange={(e) => setFilterGroupe(e.target.value)}
        >
          <option value="">Tous les groupes</option>
          {uniqueGroupes.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Légende</span>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            🔄
          </button>
        </div>
      </div>

      {/* Légende */}
      <div className="card" style={{ padding: 'var(--spacing-sm) var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="statut-present">✓</span> Présent
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="statut-absent">✗</span> Absent
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="statut-excuse">E</span> Excusé
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="statut-retard">R</span> Retard
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="statut-vide">○</span> Non pointé
          </span>
        </div>
      </div>

      {/* Tableau de présences style Android */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {elevesFiltre.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">Aucun {termes?.eleve?.toLowerCase() || 'membre'}</div>
            <div className="empty-state-desc">
              {eleves.length === 0 
                ? `Ajoutez des ${termes?.eleves?.toLowerCase() || 'membres'} pour commencer`
                : 'Aucun résultat pour ces filtres'
              }
            </div>
          </div>
        ) : datesAffichees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">Aucun pointage</div>
            <div className="empty-state-desc">
              Les pointages effectués depuis l'application apparaîtront ici
            </div>
          </div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="table table-presence">
              <thead>
                <tr>
                  <th style={{ 
                    position: 'sticky', 
                    left: 0, 
                    background: 'var(--bg-card)', 
                    zIndex: 2,
                    minWidth: '150px',
                    borderRight: '2px solid var(--border)'
                  }}>
                    {termes?.eleves || 'Membres'}
                  </th>
                  {datesAffichees.map(date => (
                    <th key={date} style={{ textAlign: 'center', minWidth: '50px', padding: '8px 4px' }}>
                      {formatDateShort(date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(elevesParGroupe).map(([groupe, elevesGroupe]) => (
                  <React.Fragment key={groupe}>
                    {/* Ligne de séparation groupe */}
                    <tr className="groupe-header">
                      <td 
                        colSpan={datesAffichees.length + 1}
                        style={{ 
                          background: getGroupeColor(groupe),
                          color: '#fff',
                          fontWeight: 600,
                          padding: '4px 12px',
                          fontSize: '12px'
                        }}
                      >
                        {groupe}
                      </td>
                    </tr>
                    {/* Élèves du groupe */}
                    {elevesGroupe.map(eleve => (
                      <tr key={eleve.id}>
                        <td style={{ 
                          position: 'sticky', 
                          left: 0, 
                          background: 'var(--bg-card)',
                          fontWeight: 500,
                          fontSize: '13px',
                          borderRight: '2px solid var(--border)',
                          borderLeft: `3px solid ${getGroupeColor(eleve.groupe)}`
                        }}>
                          {eleve.prenom}
                          {eleve.groupe && (
                            <span style={{ 
                              marginLeft: '4px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: getGroupeColor(eleve.groupe),
                              display: 'inline-block'
                            }}></span>
                          )}
                        </td>
                        {datesAffichees.map(date => {
                          const presence = getPresence(eleve.id, date)
                          return (
                            <td 
                              key={date}
                              style={{ 
                                textAlign: 'center',
                                cursor: pointageActif ? 'pointer' : 'default',
                                padding: '6px 4px',
                                background: presence?.present === true ? 'rgba(76, 175, 80, 0.15)' :
                                           presence?.present === false ? 'rgba(244, 67, 54, 0.15)' :
                                           presence?.present === 'excuse' ? 'rgba(255, 152, 0, 0.15)' :
                                           presence?.present === 'retard' ? 'rgba(33, 150, 243, 0.15)' :
                                           'transparent'
                              }}
                              onClick={() => cycleStatut(eleve.id, date)}
                            >
                              {renderStatut(presence)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compteur */}
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 'var(--spacing-md)', textAlign: 'right' }}>
        {elevesFiltre.length} {termes?.eleve?.toLowerCase() || 'membre'}(s)
      </p>

      {/* Bouton activation pointage */}
      <div style={{ 
        position: 'fixed', 
        bottom: 'var(--spacing-xl)', 
        right: 'var(--spacing-xl)',
        zIndex: 100
      }}>
        <button 
          className={`btn ${pointageActif ? 'btn-danger' : 'btn-secondary'}`}
          style={{ 
            padding: '12px 20px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: '13px'
          }}
          onClick={() => setPointageActif(!pointageActif)}
        >
          {pointageActif ? '🔒 Désactiver pointage' : '✏️ Activer pointage'}
        </button>
      </div>

      {/* Indicateur mode pointage */}
      {pointageActif && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: 'var(--spacing-xl)',
          background: 'var(--warning)',
          color: '#000',
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          fontSize: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 100
        }}>
          ✏️ Mode pointage actif - Cliquez sur une cellule
        </div>
      )}

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
