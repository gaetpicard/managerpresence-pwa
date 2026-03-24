import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function CadresPage() {
  const [cadres, setCadres] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCadre, setEditingCadre] = useState(null)
  const [formData, setFormData] = useState({ nom: '', role: 'UTILISATEUR' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadCadres()
  }, [])

  const loadCadres = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const data = await FirebaseService.getCadres()
        setCadres(data)
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

  const filteredCadres = cadres.filter(c => {
    const searchLower = searchTerm.toLowerCase()
    return c.nom?.toLowerCase().includes(searchLower) ||
           c.role?.toLowerCase().includes(searchLower)
  })

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'var(--danger)'
      case 'SUPERUSER': return 'var(--premium)'
      default: return 'var(--info)'
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return 'badge-danger'
      case 'SUPERUSER': return 'badge-premium'
      default: return 'badge-info'
    }
  }

  const getInitials = (nom) => {
    return nom?.substring(0, 2).toUpperCase() || '??'
  }

  const openAddModal = () => {
    setEditingCadre(null)
    setFormData({ nom: '', role: 'UTILISATEUR' })
    setShowModal(true)
  }

  const openEditModal = (cadre) => {
    setEditingCadre(cadre)
    setFormData({ nom: cadre.nom, role: cadre.role || 'UTILISATEUR' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      showToast('Le nom est obligatoire', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingCadre) {
        await FirebaseService.updateCadre(editingCadre.id, formData)
        showToast('Cadre modifié avec succès', 'success')
      } else {
        await FirebaseService.addCadre(formData)
        showToast('Cadre ajouté avec succès', 'success')
      }
      setShowModal(false)
      loadCadres()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (cadre) => {
    if (!confirm(`Supprimer le cadre "${cadre.nom}" ?`)) return

    try {
      await FirebaseService.deleteCadre(cadre.id)
      showToast('Cadre supprimé', 'success')
      loadCadres()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  if (isLoading) {
    return (
      <Layout title="Cadres">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Cadres">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher un cadre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadCadres}>
            🔄 Actualiser
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            ➕ Ajouter
          </button>
        </div>
      </div>

      {/* Liste des cadres */}
      <div className="card" style={{ padding: 0 }}>
        {filteredCadres.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👔</div>
            <div className="empty-state-title">
              {cadres.length === 0 ? 'Aucun cadre' : 'Aucun résultat'}
            </div>
            <div className="empty-state-desc">
              {cadres.length === 0 
                ? 'Ajoutez des cadres pour gérer les accès'
                : `Aucun résultat pour "${searchTerm}"`
              }
            </div>
            {cadres.length === 0 && (
              <button className="btn btn-primary" onClick={openAddModal}>
                ➕ Ajouter un cadre
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding: 'var(--spacing-md)' }}>
            {filteredCadres.map(cadre => (
              <div key={cadre.id} className="list-item">
                <div 
                  className="list-item-avatar"
                  style={{ background: getRoleColor(cadre.role) }}
                >
                  {getInitials(cadre.nom)}
                </div>
                <div className="list-item-content">
                  <div className="list-item-title">{cadre.nom}</div>
                  <div className="list-item-subtitle">
                    <span className={`badge ${getRoleBadge(cadre.role)}`} style={{ fontSize: '10px' }}>
                      {cadre.role || 'UTILISATEUR'}
                    </span>
                    {cadre.authEmail && (
                      <span style={{ marginLeft: '8px' }}>{cadre.authEmail}</span>
                    )}
                  </div>
                </div>
                <div className="list-item-actions">
                  <button 
                    className="btn btn-secondary btn-icon"
                    onClick={() => openEditModal(cadre)}
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn btn-danger btn-icon"
                    onClick={() => handleDelete(cadre)}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compteur */}
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 'var(--spacing-md)' }}>
        {filteredCadres.length} cadre(s) sur {cadres.length}
      </p>

      {/* Modal ajout/édition */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCadre ? '✏️ Modifier le cadre' : '➕ Nouveau cadre'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom / Prénom</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Jean"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle</label>
                <select
                  className="form-input form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="UTILISATEUR">Utilisateur</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
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

export default CadresPage
