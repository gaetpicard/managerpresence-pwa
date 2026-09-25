import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

/**
 * Documents du club : des liens vers des fichiers hébergés ailleurs
 * (Drive, site…), pas des fichiers stockés dans la base.
 * Même collection que l'application : `documents` { nom, description, lienDrive }.
 */
function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [enEdition, setEnEdition] = useState(null)
  const [formData, setFormData] = useState({ nom: '', description: '', lienDrive: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { loadData() }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        setDocuments(await FirebaseService.getDocuments())
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  const ouvrirAjout = () => {
    setEnEdition(null)
    setFormData({ nom: '', description: '', lienDrive: '' })
    setShowModal(true)
  }

  const ouvrirEdition = (document) => {
    setEnEdition(document)
    setFormData({
      nom: document.nom || '',
      description: document.description || '',
      lienDrive: document.lienDrive || ''
    })
    setShowModal(true)
  }

  const enregistrer = async () => {
    if (!formData.nom.trim()) {
      showToast('Le nom est obligatoire', 'error')
      return
    }
    setSaving(true)
    try {
      await FirebaseService.enregistrerDocument({ ...formData, id: enEdition?.id })
      showToast(enEdition ? 'Document modifié' : 'Document ajouté', 'success')
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    }
    setSaving(false)
  }

  const supprimer = async (document) => {
    if (!confirm(`Supprimer « ${document.nom} » ?`)) return
    try {
      await FirebaseService.supprimerDocument(document.id)
      showToast('Document supprimé', 'success')
      await loadData()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  if (isLoading) {
    return (
      <Layout title="Documents">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Documents">
      <div className="toolbar">
        <div className="toolbar-search" />
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData}>🔄</button>
          <button className="btn btn-primary btn-sm" onClick={ouvrirAjout}>➕ Ajouter</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-title">Aucun document</div>
            <div className="empty-state-desc">
              Ajoutez des liens vers vos fiches d'inscription, règlements ou
              attestations. Ils apparaîtront aussi dans l'application.
            </div>
          </div>
        ) : (
          <div style={{ padding: 'var(--spacing-md)' }}>
            {documents.map(document => (
              <div key={document.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div className="list-item-avatar" style={{ flexShrink: 0 }}>📄</div>
                <div className="list-item-content" style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{document.nom}</div>
                  {document.description && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {document.description}
                    </div>
                  )}
                  {document.lienDrive && (
                    <a
                      href={document.lienDrive}
                      target="_blank"
                      rel="noopener"
                      style={{ fontSize: '12px', color: 'var(--info)', wordBreak: 'break-all' }}
                    >
                      {document.lienDrive}
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {document.lienDrive && (
                    <a
                      className="btn btn-secondary btn-sm"
                      href={document.lienDrive}
                      target="_blank"
                      rel="noopener"
                      title="Ouvrir"
                    >
                      ↗
                    </a>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => ouvrirEdition(document)}>✏️</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => supprimer(document)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {enEdition ? '✏️ Modifier le document' : '➕ Nouveau document'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Fiche d'inscription 2026/2027"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="À remplir et à rapporter signée"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lien</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://drive.google.com/…"
                  value={formData.lienDrive}
                  onChange={(e) => setFormData({ ...formData, lienDrive: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={enregistrer} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </Layout>
  )
}

export default DocumentsPage
