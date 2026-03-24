import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function PresencesPage() {
  const [eleves, setEleves] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [presences, setPresences] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCreneau, setSelectedCreneau] = useState('')
  const [filterGroupe, setFilterGroupe] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState(null)

  // Statuts possibles
  const statuts = [
    { value: true, label: 'Présent', icon: '✅', color: 'var(--present)' },
    { value: false, label: 'Absent', icon: '❌', color: 'var(--absent)' },
    { value: 'excuse', label: 'Excusé', icon: '📝', color: 'var(--excuse)' },
    { value: 'retard', label: 'Retard', icon: '⏰', color: 'var(--retard)' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedDate && selectedCreneau) {
      loadPresences()
    }
  }, [selectedDate, selectedCreneau])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [elevesData, creneauxData] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux()
        ])
        setEleves(elevesData)
        setCreneaux(creneauxData.filter(c => c.actif !== false))
        
        if (creneauxData.length > 0) {
          setSelectedCreneau(creneauxData[0].id)
        }
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  const loadPresences = async () => {
    try {
      const presencesData = await FirebaseService.getPresences(selectedDate)
      const presencesMap = {}
      presencesData.forEach(p => {
        presencesMap[`${p.eleveId}_${p.creneauId}`] = p.present
      })
      setPresences(presencesMap)
    } catch (error) {
      console.error('Erreur chargement présences:', error)
    }
  }

  const cyclePresence = async (eleveId) => {
    const key = `${eleveId}_${selectedCreneau}`
    const currentValue = presences[key]
    
    // Cycle: undefined -> true -> false -> 'excuse' -> 'retard' -> undefined
    let newValue
    if (currentValue === undefined || currentValue === null) {
      newValue = true
    } else if (currentValue === true) {
      newValue = false
    } else if (currentValue === false) {
      newValue = 'excuse'
    } else if (currentValue === 'excuse') {
      newValue = 'retard'
    } else {
      newValue = true // Retour au début
    }

    // Mise à jour optimiste
    setPresences(prev => ({ ...prev, [key]: newValue }))

    try {
      await FirebaseService.setPresence(eleveId, selectedDate, selectedCreneau, newValue)
    } catch (error) {
      console.error('Erreur enregistrement présence:', error)
      setPresences(prev => ({ ...prev, [key]: currentValue }))
      showToast('Erreur lors de l\'enregistrement', 'error')
    }
  }

  const setAllPresent = async () => {
    if (!confirm('Marquer tous les membres comme présents ?')) return
    
    for (const eleve of filteredEleves) {
      const key = `${eleve.id}_${selectedCreneau}`
      setPresences(prev => ({ ...prev, [key]: true }))
      try {
        await FirebaseService.setPresence(eleve.id, selectedDate, selectedCreneau, true)
      } catch (error) {
        console.error('Erreur:', error)
      }
    }
    showToast(`${filteredEleves.length} membre(s) marqués présents`, 'success')
  }

  const resetAll = async () => {
    if (!confirm('Effacer toutes les présences de cette séance ?')) return
    
    for (const eleve of filteredEleves) {
      const key = `${eleve.id}_${selectedCreneau}`
      setPresences(prev => ({ ...prev, [key]: undefined }))
    }
    showToast('Présences réinitialisées', 'success')
  }

  // Liste unique des groupes
  const uniqueGroupes = [...new Set(eleves.map(e => e.groupe).filter(Boolean))].sort()

  const filteredEleves = eleves
    .filter(e => {
      // Filtrer par créneau si l'élève a des créneaux assignés
      if (e.creneauxIds && e.creneauxIds.length > 0 && selectedCreneau) {
        if (!e.creneauxIds.includes(selectedCreneau)) return false
      }
      
      const searchLower = searchTerm.toLowerCase()
      const matchSearch = 
        (e.nom || '').toLowerCase().includes(searchLower) ||
        (e.prenom || '').toLowerCase().includes(searchLower)
      
      const matchGroupe = filterGroupe === '' || e.groupe === filterGroupe
      
      return matchSearch && matchGroupe
    })
    .sort((a, b) => {
      const nomA = `${a.nom || ''} ${a.prenom || ''}`.toLowerCase()
      const nomB = `${b.nom || ''} ${b.prenom || ''}`.toLowerCase()
      return nomA.localeCompare(nomB)
    })

  // Compteurs
  const presentCount = filteredEleves.filter(e => presences[`${e.id}_${selectedCreneau}`] === true).length
  const absentCount = filteredEleves.filter(e => presences[`${e.id}_${selectedCreneau}`] === false).length
  const excuseCount = filteredEleves.filter(e => presences[`${e.id}_${selectedCreneau}`] === 'excuse').length
  const retardCount = filteredEleves.filter(e => presences[`${e.id}_${selectedCreneau}`] === 'retard').length

  const getPresenceStyle = (value) => {
    const statut = statuts.find(s => s.value === value)
    return statut ? { background: statut.color, color: 'white' } : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }
  }

  const getPresenceIcon = (value) => {
    const statut = statuts.find(s => s.value === value)
    return statut ? statut.icon : '○'
  }

  const getGroupeBadgeClass = (groupe) => {
    const groupeNum = parseInt(groupe?.replace(/\D/g, '')) || 0
    if (groupeNum >= 1 && groupeNum <= 5) return `badge-g${groupeNum}`
    return 'badge-standard'
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
      {/* Filtres */}
      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '140px' }}>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        <select
          className="form-input form-select"
          style={{ width: '200px' }}
          value={selectedCreneau}
          onChange={(e) => setSelectedCreneau(e.target.value)}
        >
          {creneaux.length === 0 && <option value="">Aucun créneau</option>}
          {creneaux.map(c => (
            <option key={c.id} value={c.id}>
              {c.nom || c.jour || c.id}
            </option>
          ))}
        </select>

        <select
          className="form-input form-select"
          style={{ width: '150px' }}
          value={filterGroupe}
          onChange={(e) => setFilterGroupe(e.target.value)}
        >
          <option value="">Tous les groupes</option>
          {uniqueGroupes.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        
        <div className="toolbar-search" style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <button className="btn btn-success btn-sm" onClick={setAllPresent}>
            ✅ Tous présents
          </button>
          <button className="btn btn-secondary btn-sm" onClick={resetAll}>
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Compteurs */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap'
      }}>
        <span className="badge" style={{ background: 'var(--present)', padding: '8px 16px' }}>
          ✅ {presentCount} présent(s)
        </span>
        <span className="badge" style={{ background: 'var(--absent)', padding: '8px 16px' }}>
          ❌ {absentCount} absent(s)
        </span>
        <span className="badge" style={{ background: 'var(--excuse)', padding: '8px 16px' }}>
          📝 {excuseCount} excusé(s)
        </span>
        <span className="badge" style={{ background: 'var(--retard)', padding: '8px 16px' }}>
          ⏰ {retardCount} retard(s)
        </span>
        <span style={{ color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 'auto' }}>
          {filteredEleves.length} membre(s)
        </span>
      </div>

      {/* Liste des membres */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredEleves.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">Aucun membre</div>
            <div className="empty-state-desc">
              {eleves.length === 0 
                ? 'Ajoutez des membres depuis l\'onglet Membres'
                : 'Aucun résultat pour vos critères'
              }
            </div>
          </div>
        ) : (
          <div style={{ padding: 'var(--spacing-md)' }}>
            {filteredEleves.map(eleve => {
              const value = presences[`${eleve.id}_${selectedCreneau}`]
              return (
                <div key={eleve.id} className="list-item">
                  <button
                    onClick={() => cyclePresence(eleve.id)}
                    className="presence-cell"
                    style={getPresenceStyle(value)}
                    title="Cliquer pour changer le statut"
                  >
                    {getPresenceIcon(value)}
                  </button>
                  <div className="list-item-content">
                    <div className="list-item-title">
                      {eleve.prenom} {eleve.nom}
                    </div>
                    {eleve.groupe && (
                      <span className={`badge ${getGroupeBadgeClass(eleve.groupe)}`} style={{ fontSize: '10px' }}>
                        {eleve.groupe}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{ 
        marginTop: 'var(--spacing-lg)', 
        padding: 'var(--spacing-md)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: 'var(--spacing-lg)',
        flexWrap: 'wrap',
        fontSize: '13px',
        color: 'var(--text-muted)'
      }}>
        <span>💡 Cliquez sur le bouton pour faire défiler les statuts :</span>
        {statuts.map(s => (
          <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              width: '20px', 
              height: '20px', 
              background: s.color, 
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              {s.icon}
            </span>
            {s.label}
          </span>
        ))}
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

export default PresencesPage
