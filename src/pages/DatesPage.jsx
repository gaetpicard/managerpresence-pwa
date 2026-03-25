import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { useApp } from '../App'

function DatesPage() {
  const { termes } = useApp()
  const [seances, setSeances] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  // Modal édition
  const [showModal, setShowModal] = useState(false)
  const [editingSeance, setEditingSeance] = useState(null)
  const [formData, setFormData] = useState({
    date: '',
    creneauxActifsIds: []
  })
  
  // Modal génération auto
  const [showAutoGenerate, setShowAutoGenerate] = useState(false)
  const [autoGenData, setAutoGenData] = useState({
    startDate: '',
    endDate: '',
    joursSemaine: [1, 2, 3, 4, 5], // Lundi à vendredi par défaut
    creneauxIds: []
  })
  
  // Sélection multiple
  const [selectedSeances, setSelectedSeances] = useState(new Set())
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkCreneaux, setBulkCreneaux] = useState([])
  
  const [saving, setSaving] = useState(false)

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
        const [seancesData, creneauxData] = await Promise.all([
          FirebaseService.getSeances(),
          FirebaseService.getCreneaux()
        ])
        
        // Trier par date
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
        setCreneaux(creneauxData)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  // ========================================
  // ACTIONS CRUD
  // ========================================

  const openAddModal = () => {
    setEditingSeance(null)
    setFormData({
      date: '',
      creneauxActifsIds: []
    })
    setShowModal(true)
  }

  const openEditModal = (seance) => {
    setEditingSeance(seance)
    setFormData({
      date: seance.date || '',
      creneauxActifsIds: seance.creneauxActifsIds || []
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.date?.trim()) {
      showToast('La date est obligatoire', 'error')
      return
    }

    // Vérifier le format JJ/MM
    const dateRegex = /^\d{2}\/\d{2}$/
    if (!dateRegex.test(formData.date.trim())) {
      showToast('Format de date invalide (JJ/MM)', 'error')
      return
    }

    // Vérifier si la date existe déjà (sauf en édition)
    const existingDate = seances.find(s => 
      s.date === formData.date.trim() && s.id !== editingSeance?.id
    )
    if (existingDate) {
      showToast('Cette date existe déjà', 'error')
      return
    }

    setSaving(true)
    try {
      const seanceData = {
        date: formData.date.trim(),
        creneauxActifsIds: formData.creneauxActifsIds,
        creneauxValides: editingSeance?.creneauxValides || [],
        heureAppelEffectue: editingSeance?.heureAppelEffectue || {},
        cadreNom: editingSeance?.cadreNom || null,
        presences: editingSeance?.presences || {},
        cadreValidateur: editingSeance?.cadreValidateur || {}
      }

      if (editingSeance) {
        await FirebaseService.updateSeance(editingSeance.id, seanceData)
        showToast('Date mise à jour', 'success')
      } else {
        await FirebaseService.addSeance(seanceData)
        showToast('Date ajoutée', 'success')
      }
      
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (seance) => {
    // Vérifier si la séance a des présences
    const hasPresences = seance.presences && Object.keys(seance.presences).length > 0
    
    const confirmMsg = hasPresences 
      ? `⚠️ Cette date contient des pointages ! Supprimer "${seance.date}" ?`
      : `Supprimer la date "${seance.date}" ?`
    
    if (!confirm(confirmMsg)) return

    try {
      await FirebaseService.deleteSeance(seance.id)
      showToast('Date supprimée', 'success')
      await loadData()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  // ========================================
  // GÉNÉRATION AUTOMATIQUE
  // ========================================

  const handleAutoGenerate = async () => {
    if (!autoGenData.startDate || !autoGenData.endDate) {
      showToast('Les dates de début et fin sont obligatoires', 'error')
      return
    }
    if (autoGenData.joursSemaine.length === 0) {
      showToast('Sélectionnez au moins un jour de la semaine', 'error')
      return
    }

    setSaving(true)
    try {
      const created = await FirebaseService.generateSeances(
        autoGenData.startDate,
        autoGenData.endDate,
        autoGenData.joursSemaine,
        autoGenData.creneauxIds
      )
      
      showToast(`${created.length} date(s) créée(s)`, 'success')
      setShowAutoGenerate(false)
      await loadData()
    } catch (error) {
      console.error('Erreur génération:', error)
      showToast('Erreur lors de la génération', 'error')
    }
    setSaving(false)
  }

  // ========================================
  // ACTIONS GROUPÉES
  // ========================================

  const toggleSelection = (seanceId) => {
    const newSet = new Set(selectedSeances)
    if (newSet.has(seanceId)) {
      newSet.delete(seanceId)
    } else {
      newSet.add(seanceId)
    }
    setSelectedSeances(newSet)
    
    if (newSet.size === 0) {
      setMultiSelectMode(false)
    }
  }

  const selectAll = () => {
    setSelectedSeances(new Set(seances.map(s => s.id)))
  }

  const deselectAll = () => {
    setSelectedSeances(new Set())
    setMultiSelectMode(false)
  }

  const applyBulkCreneaux = async (action) => {
    if (selectedSeances.size === 0 || bulkCreneaux.length === 0) return
    
    setSaving(true)
    try {
      let count = 0
      for (const seanceId of selectedSeances) {
        const seance = seances.find(s => s.id === seanceId)
        if (seance) {
          let newCreneaux
          if (action === 'add') {
            newCreneaux = [...new Set([...seance.creneauxActifsIds, ...bulkCreneaux])]
          } else {
            newCreneaux = seance.creneauxActifsIds.filter(id => !bulkCreneaux.includes(id))
          }
          await FirebaseService.updateSeance(seanceId, { creneauxActifsIds: newCreneaux })
          count++
        }
      }
      
      showToast(`${termes?.creneaux || 'Créneaux'} ${action === 'add' ? 'ajoutés à' : 'retirés de'} ${count} date(s)`, 'success')
      setShowBulkActions(false)
      setBulkCreneaux([])
      await loadData()
    } catch (error) {
      console.error('Erreur action groupée:', error)
      showToast('Erreur lors de l\'action groupée', 'error')
    }
    setSaving(false)
  }

  const deleteBulk = async () => {
    if (selectedSeances.size === 0) return
    
    if (!confirm(`Supprimer ${selectedSeances.size} date(s) ?`)) return
    
    setSaving(true)
    try {
      for (const seanceId of selectedSeances) {
        await FirebaseService.deleteSeance(seanceId)
      }
      
      showToast(`${selectedSeances.size} date(s) supprimée(s)`, 'success')
      setSelectedSeances(new Set())
      setMultiSelectMode(false)
      await loadData()
    } catch (error) {
      console.error('Erreur suppression groupée:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
    setSaving(false)
  }

  // ========================================
  // HELPERS
  // ========================================

  const getCreneauxNoms = (creneauxIds) => {
    return creneaux
      .filter(c => creneauxIds?.includes(c.id))
      .map(c => c.nom)
      .join(', ')
  }

  const toggleCreneauSelection = (creneauId) => {
    setFormData(prev => {
      const ids = prev.creneauxActifsIds || []
      if (ids.includes(creneauId)) {
        return { ...prev, creneauxActifsIds: ids.filter(id => id !== creneauId) }
      } else {
        return { ...prev, creneauxActifsIds: [...ids, creneauId] }
      }
    })
  }

  const toggleBulkCreneau = (creneauId) => {
    if (bulkCreneaux.includes(creneauId)) {
      setBulkCreneaux(bulkCreneaux.filter(id => id !== creneauId))
    } else {
      setBulkCreneaux([...bulkCreneaux, creneauId])
    }
  }

  const toggleJourSemaine = (jour) => {
    setAutoGenData(prev => {
      if (prev.joursSemaine.includes(jour)) {
        return { ...prev, joursSemaine: prev.joursSemaine.filter(j => j !== jour) }
      } else {
        return { ...prev, joursSemaine: [...prev.joursSemaine, jour].sort() }
      }
    })
  }

  const joursNoms = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

  if (isLoading) {
    return (
      <Layout title={termes?.seances || 'Dates'}>
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={termes?.seances || 'Dates'}>
      {/* Toolbar */}
      <div className="toolbar">
        {multiSelectMode ? (
          <>
            <span style={{ fontWeight: 600 }}>
              {selectedSeances.size} date(s) sélectionnée(s)
            </span>
            <button className="btn btn-secondary btn-sm" onClick={selectAll}>
              Tout sélectionner
            </button>
            <button className="btn btn-secondary btn-sm" onClick={deselectAll}>
              Annuler
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => setShowBulkActions(true)}
              disabled={selectedSeances.size === 0}
            >
              ⚙️ Actions
            </button>
            <button 
              className="btn btn-danger btn-sm" 
              onClick={deleteBulk}
              disabled={selectedSeances.size === 0}
            >
              🗑️ Supprimer
            </button>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              💡 Appui long pour sélection multiple
            </span>
            <div className="toolbar-actions">
              <button className="btn btn-secondary btn-sm" onClick={loadData}>
                🔄
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAutoGenerate(true)}>
                🗓️ Génération auto
              </button>
              <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                ➕ Ajouter
              </button>
            </div>
          </>
        )}
      </div>

      {/* Liste des dates */}
      <div className="card" style={{ padding: 0 }}>
        {seances.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">Aucune date</div>
            <div className="empty-state-desc">
              Ajoutez des dates manuellement ou utilisez la génération automatique
            </div>
            <button className="btn btn-primary" onClick={() => setShowAutoGenerate(true)}>
              🗓️ Génération automatique
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {multiSelectMode && <th style={{ width: '40px' }}></th>}
                  <th>Date</th>
                  <th>{termes?.creneaux || 'Créneaux'} actifs</th>
                  <th>Validé</th>
                  <th style={{ width: '90px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {seances.map(seance => {
                  const isSelected = selectedSeances.has(seance.id)
                  const hasPresences = seance.presences && Object.keys(seance.presences).length > 0
                  const isValidated = seance.creneauxValides?.length > 0
                  
                  return (
                    <tr 
                      key={seance.id}
                      style={{ 
                        background: isSelected ? 'rgba(76, 175, 80, 0.15)' : 'transparent',
                        cursor: multiSelectMode ? 'pointer' : 'default'
                      }}
                      onClick={() => multiSelectMode && toggleSelection(seance.id)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (!multiSelectMode) {
                          setMultiSelectMode(true)
                          setSelectedSeances(new Set([seance.id]))
                        }
                      }}
                    >
                      {multiSelectMode && (
                        <td>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelection(seance.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}
                      <td style={{ fontWeight: 600 }}>
                        {seance.date}
                        {hasPresences && (
                          <span style={{ marginLeft: '8px', color: 'var(--success)', fontSize: '12px' }}>
                            ✓ pointé
                          </span>
                        )}
                      </td>
                      <td>
                        {seance.creneauxActifsIds?.length > 0 ? (
                          <span style={{ color: 'var(--info)', fontSize: '13px' }}>
                            {getCreneauxNoms(seance.creneauxActifsIds) || `${seance.creneauxActifsIds.length} créneau(x)`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>
                        {isValidated ? (
                          <span className="badge badge-success">✓ Validé</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="btn btn-secondary btn-icon"
                            onClick={(e) => { e.stopPropagation(); openEditModal(seance); }}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn btn-danger btn-icon"
                            onClick={(e) => { e.stopPropagation(); handleDelete(seance); }}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compteur */}
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 'var(--spacing-md)' }}>
        {seances.length} date(s)
      </p>

      {/* Modal édition */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingSeance ? '✏️ Modifier la date' : '➕ Ajouter une date'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Date (JJ/MM) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 15/03"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {creneaux.length > 0 && (
                <div className="form-group">
                  <label className="form-label">{termes?.creneaux || 'Créneaux'} actifs</label>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {creneaux.map(c => (
                      <label 
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.creneauxActifsIds?.includes(c.id)}
                          onChange={() => toggleCreneauSelection(c.id)}
                        />
                        <span>{c.nom}</span>
                        {c.description && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            - {c.description}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal génération automatique */}
      {showAutoGenerate && (
        <div className="modal-overlay" onClick={() => setShowAutoGenerate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">🗓️ Génération automatique</h2>
              <button className="modal-close" onClick={() => setShowAutoGenerate(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date de début *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={autoGenData.startDate}
                    onChange={(e) => setAutoGenData({ ...autoGenData, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Date de fin *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={autoGenData.endDate}
                    onChange={(e) => setAutoGenData({ ...autoGenData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Jours de la semaine *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {joursNoms.map((jour, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`btn btn-sm ${autoGenData.joursSemaine.includes(index) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleJourSemaine(index)}
                    >
                      {jour}
                    </button>
                  ))}
                </div>
              </div>

              {creneaux.length > 0 && (
                <div className="form-group">
                  <label className="form-label">{termes?.creneaux || 'Créneaux'} à activer</label>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {creneaux.map(c => (
                      <label 
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={autoGenData.creneauxIds.includes(c.id)}
                          onChange={() => {
                            const ids = autoGenData.creneauxIds
                            if (ids.includes(c.id)) {
                              setAutoGenData({ ...autoGenData, creneauxIds: ids.filter(id => id !== c.id) })
                            } else {
                              setAutoGenData({ ...autoGenData, creneauxIds: [...ids, c.id] })
                            }
                          }}
                        />
                        <span>{c.nom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAutoGenerate(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleAutoGenerate} disabled={saving}>
                {saving ? 'Génération...' : 'Générer les dates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal actions groupées */}
      {showBulkActions && (
        <div className="modal-overlay" onClick={() => setShowBulkActions(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">⚙️ Actions groupées</h2>
              <button className="modal-close" onClick={() => setShowBulkActions(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--spacing-md)' }}>
                Appliquer à <strong>{selectedSeances.size} date(s)</strong> :
              </p>
              
              <div className="form-group">
                <label className="form-label">{termes?.creneaux || 'Créneaux'}</label>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {creneaux.map(c => (
                    <label 
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={bulkCreneaux.includes(c.id)}
                        onChange={() => toggleBulkCreneau(c.id)}
                      />
                      <span>{c.nom}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkActions(false)}>
                Annuler
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => applyBulkCreneaux('add')}
                disabled={saving || bulkCreneaux.length === 0}
              >
                ✅ Ajouter
              </button>
              <button 
                className="btn btn-warning" 
                onClick={() => applyBulkCreneaux('remove')}
                disabled={saving || bulkCreneaux.length === 0}
              >
                🗑️ Retirer
              </button>
            </div>
          </div>
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

export default DatesPage
