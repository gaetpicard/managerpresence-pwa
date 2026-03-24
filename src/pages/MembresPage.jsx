import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function MembresPage() {
  const navigate = useNavigate()
  const [eleves, setEleves] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGroupe, setFilterGroupe] = useState('')
  const [sortBy, setSortBy] = useState('nom')
  const [sortOrder, setSortOrder] = useState('asc')
  const [showModal, setShowModal] = useState(false)
  const [editingEleve, setEditingEleve] = useState(null)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    groupe: '',
    telephone: '',
    email: '',
    creneauxIds: []
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [elevesData, creneauxData] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux()
        ])
        setEleves(elevesData)
        setCreneaux(creneauxData)
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

  // Liste unique des groupes
  const uniqueGroupes = [...new Set(eleves.map(e => e.groupe).filter(Boolean))].sort()

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const filteredAndSortedEleves = eleves
    .filter(e => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch = 
        (e.nom || '').toLowerCase().includes(searchLower) ||
        (e.prenom || '').toLowerCase().includes(searchLower) ||
        (e.email || '').toLowerCase().includes(searchLower) ||
        (e.telephone || '').includes(searchTerm)
      
      const matchGroupe = filterGroupe === '' || e.groupe === filterGroupe
      
      return matchSearch && matchGroupe
    })
    .sort((a, b) => {
      const aVal = (a[sortBy] || '').toLowerCase()
      const bVal = (b[sortBy] || '').toLowerCase()
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })

  const getGroupeBadgeClass = (groupe) => {
    const groupeNum = parseInt(groupe?.replace(/\D/g, '')) || 0
    if (groupeNum >= 1 && groupeNum <= 5) return `badge-g${groupeNum}`
    return 'badge-standard'
  }

  const openAddModal = () => {
    setEditingEleve(null)
    setFormData({
      nom: '',
      prenom: '',
      groupe: '',
      telephone: '',
      email: '',
      creneauxIds: []
    })
    setShowModal(true)
  }

  const openEditModal = (eleve) => {
    setEditingEleve(eleve)
    setFormData({
      nom: eleve.nom || '',
      prenom: eleve.prenom || '',
      groupe: eleve.groupe || '',
      telephone: eleve.telephone || eleve.tel || '',
      email: eleve.email || '',
      creneauxIds: eleve.creneauxIds || []
    })
    setShowModal(true)
  }

  const handleCreneauToggle = (creneauId) => {
    setFormData(prev => {
      const ids = prev.creneauxIds || []
      if (ids.includes(creneauId)) {
        return { ...prev, creneauxIds: ids.filter(id => id !== creneauId) }
      } else {
        return { ...prev, creneauxIds: [...ids, creneauId] }
      }
    })
  }

  const handleSave = async () => {
    if (!formData.nom.trim() || !formData.prenom.trim()) {
      showToast('Le nom et prénom sont obligatoires', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingEleve) {
        await FirebaseService.updateEleve(editingEleve.id, formData)
        showToast('Membre modifié avec succès', 'success')
      } else {
        await FirebaseService.addEleve(formData)
        showToast('Membre ajouté avec succès', 'success')
      }
      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (eleve) => {
    if (!confirm(`Supprimer "${eleve.prenom} ${eleve.nom}" ?`)) return

    try {
      await FirebaseService.deleteEleve(eleve.id)
      showToast('Membre supprimé', 'success')
      loadData()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  const exportCSV = () => {
    const headers = ['Nom', 'Prénom', 'Groupe', 'Téléphone', 'Email']
    const rows = eleves.map(e => [
      e.nom || '',
      e.prenom || '',
      e.groupe || '',
      e.telephone || e.tel || '',
      e.email || ''
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `membres_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export CSV téléchargé', 'success')
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ opacity: 0.3 }}> ↕</span>
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  if (isLoading) {
    return (
      <Layout title="Membres">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Membres">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
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

        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            🔄
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            📤 CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            ➕ Ajouter
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredAndSortedEleves.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">
              {eleves.length === 0 ? 'Aucun membre' : 'Aucun résultat'}
            </div>
            <div className="empty-state-desc">
              {eleves.length === 0 
                ? 'Ajoutez des membres pour commencer'
                : `Aucun résultat pour "${searchTerm}"`
              }
            </div>
            {eleves.length === 0 && (
              <button className="btn btn-primary" onClick={openAddModal}>
                ➕ Ajouter un membre
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('nom')} style={{ cursor: 'pointer' }}>
                    Nom<SortIcon field="nom" />
                  </th>
                  <th onClick={() => handleSort('prenom')} style={{ cursor: 'pointer' }}>
                    Prénom<SortIcon field="prenom" />
                  </th>
                  <th onClick={() => handleSort('groupe')} style={{ cursor: 'pointer' }}>
                    Groupe<SortIcon field="groupe" />
                  </th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Créneaux</th>
                  <th style={{ width: '90px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEleves.map(eleve => (
                  <tr 
                    key={eleve.id}
                    onClick={() => navigate(`/membre/${eleve.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600 }}>{eleve.nom || '-'}</td>
                    <td>{eleve.prenom || '-'}</td>
                    <td>
                      {eleve.groupe && (
                        <span className={`badge ${getGroupeBadgeClass(eleve.groupe)}`}>
                          {eleve.groupe}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {eleve.telephone || eleve.tel || '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {eleve.email || '-'}
                    </td>
                    <td>
                      {eleve.creneauxIds?.length > 0 && (
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>
                          {eleve.creneauxIds.length} créneau(x)
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn btn-secondary btn-icon"
                          onClick={(e) => { e.stopPropagation(); openEditModal(eleve); }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-danger btn-icon"
                          onClick={(e) => { e.stopPropagation(); handleDelete(eleve); }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compteur */}
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 'var(--spacing-md)' }}>
        {filteredAndSortedEleves.length} membre(s) sur {eleves.length}
      </p>

      {/* Modal ajout/édition */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEleve ? '✏️ Modifier le membre' : '➕ Nouveau membre'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="DUPONT"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Jean"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Groupe</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="G1, G2..."
                    value={formData.groupe}
                    onChange={(e) => setFormData({ ...formData, groupe: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="06 12 34 56 78"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="jean.dupont@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {creneaux.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Créneaux</label>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
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
                          gap: '6px',
                          padding: '6px 12px',
                          background: formData.creneauxIds?.includes(c.id) ? 'var(--primary)' : 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.creneauxIds?.includes(c.id)}
                          onChange={() => handleCreneauToggle(c.id)}
                          style={{ display: 'none' }}
                        />
                        {c.nom}
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

export default MembresPage
