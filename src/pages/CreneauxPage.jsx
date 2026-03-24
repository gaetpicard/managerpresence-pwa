import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function CreneauxPage() {
  const [creneaux, setCreneaux] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCreneau, setEditingCreneau] = useState(null)
  const [formData, setFormData] = useState({
    nom: '',
    jour: '',
    heure: '',
    heureDebut: '',
    heureFin: '',
    lieu: '',
    groupe: '',
    actif: true
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

  useEffect(() => {
    loadCreneaux()
  }, [])

  const loadCreneaux = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const data = await FirebaseService.getCreneaux()
        setCreneaux(data)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getJourColor = (jour) => {
    const colors = {
      'Lundi': 'var(--groupe-g1)',
      'Mardi': 'var(--groupe-g2)',
      'Mercredi': 'var(--groupe-g3)',
      'Jeudi': 'var(--groupe-g4)',
      'Vendredi': 'var(--groupe-g5)',
      'Samedi': 'var(--info)',
      'Dimanche': 'var(--warning)'
    }
    return colors[jour] || 'var(--primary)'
  }

  const openAddModal = () => {
    setEditingCreneau(null)
    setFormData({
      nom: '',
      jour: '',
      heure: '',
      heureDebut: '',
      heureFin: '',
      lieu: '',
      groupe: '',
      actif: true
    })
    setShowModal(true)
  }

  const openEditModal = (creneau) => {
    setEditingCreneau(creneau)
    setFormData({
      nom: creneau.nom || '',
      jour: creneau.jour || '',
      heure: creneau.heure || '',
      heureDebut: creneau.heureDebut || '',
      heureFin: creneau.heureFin || '',
      lieu: creneau.lieu || '',
      groupe: creneau.groupe || '',
      actif: creneau.actif !== false
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      showToast('Le nom est obligatoire', 'error')
      return
    }

    setSaving(true)
    try {
      // Construire l'heure si heureDebut et heureFin sont renseignées
      const dataToSave = { ...formData }
      if (formData.heureDebut && formData.heureFin) {
        dataToSave.heure = `${formData.heureDebut} - ${formData.heureFin}`
      }

      if (editingCreneau) {
        await FirebaseService.updateCreneau(editingCreneau.id, dataToSave)
        showToast('Créneau modifié avec succès', 'success')
      } else {
        await FirebaseService.addCreneau(dataToSave)
        showToast('Créneau ajouté avec succès', 'success')
      }
      setShowModal(false)
      loadCreneaux()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (creneau) => {
    if (!confirm(`Supprimer le créneau "${creneau.nom}" ?`)) return

    try {
      await FirebaseService.deleteCreneau(creneau.id)
      showToast('Créneau supprimé', 'success')
      loadCreneaux()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  const toggleActif = async (creneau) => {
    try {
      await FirebaseService.updateCreneau(creneau.id, { actif: !creneau.actif })
      showToast(creneau.actif ? 'Créneau désactivé' : 'Créneau activé', 'success')
      loadCreneaux()
    } catch (error) {
      console.error('Erreur toggle:', error)
      showToast('Erreur', 'error')
    }
  }

  if (isLoading) {
    return (
      <Layout title="Créneaux">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Créneaux">
      {/* Toolbar */}
      <div className="toolbar">
        <div style={{ flex: 1 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {creneaux.length} créneau(x) • {creneaux.filter(c => c.actif !== false).length} actif(s)
          </span>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadCreneaux}>
            🔄 Actualiser
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            ➕ Ajouter
          </button>
        </div>
      </div>

      {/* Liste des créneaux */}
      {creneaux.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">Aucun créneau</div>
            <div className="empty-state-desc">
              Créez des créneaux pour organiser vos séances
            </div>
            <button className="btn btn-primary" onClick={openAddModal}>
              ➕ Créer un créneau
            </button>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: 'var(--spacing-lg)' 
        }}>
          {creneaux.map(creneau => (
            <div 
              key={creneau.id} 
              className="card"
              style={{ 
                opacity: creneau.actif === false ? 0.6 : 1,
                borderLeft: `4px solid ${getJourColor(creneau.jour)}`
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: 'var(--spacing-md)' 
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                  {creneau.nom}
                </h3>
                <span 
                  className={`badge ${creneau.actif !== false ? 'badge-success' : 'badge-danger'}`}
                  onClick={() => toggleActif(creneau)}
                  style={{ cursor: 'pointer' }}
                  title="Cliquer pour activer/désactiver"
                >
                  {creneau.actif !== false ? 'Actif' : 'Inactif'}
                </span>
              </div>
              
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                {creneau.jour && (
                  <p style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📆</span> {creneau.jour}
                  </p>
                )}
                {creneau.heure && (
                  <p style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🕐</span> {creneau.heure}
                  </p>
                )}
                {creneau.lieu && (
                  <p style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📍</span> {creneau.lieu}
                  </p>
                )}
                {creneau.groupe && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👥</span> {creneau.groupe}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => openEditModal(creneau)}
                >
                  ✏️ Modifier
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(creneau)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout/édition */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCreneau ? '✏️ Modifier le créneau' : '➕ Nouveau créneau'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom du créneau *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Cours débutants"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jour</label>
                <select
                  className="form-input form-select"
                  value={formData.jour}
                  onChange={(e) => setFormData({ ...formData, jour: e.target.value })}
                >
                  <option value="">-- Sélectionner --</option>
                  {jours.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Heure début</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.heureDebut}
                    onChange={(e) => setFormData({ ...formData, heureDebut: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Heure fin</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.heureFin}
                    onChange={(e) => setFormData({ ...formData, heureFin: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Lieu</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Salle A"
                  value={formData.lieu}
                  onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Groupe</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: G1"
                  value={formData.groupe}
                  onChange={(e) => setFormData({ ...formData, groupe: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.actif}
                    onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span>Créneau actif</span>
                </label>
              </div>
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

export default CreneauxPage
