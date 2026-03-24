import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function FicheMembrePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [membre, setMembre] = useState(null)
  const [creneaux, setCreneaux] = useState([])
  const [presences, setPresences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('infos')
  const [periodeFilter, setPeriodeFilter] = useState('all')
  const [periodeDebut, setPeriodeDebut] = useState('')
  const [periodeFin, setPeriodeFin] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

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
        
        const membreData = elevesData.find(e => e.id === id)
        if (!membreData) {
          showToast('Membre non trouvé', 'error')
          navigate('/membres')
          return
        }
        
        setMembre(membreData)
        setFormData(membreData)
        setCreneaux(creneauxData)
        
        // Filtrer les présences de ce membre
        const membrePresences = presencesData
          .filter(p => p.eleveId === id)
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        setPresences(membrePresences)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  // ========================================
  // CALCUL DES STATISTIQUES
  // ========================================

  const getFilteredPresences = () => {
    let filtered = [...presences]
    const now = new Date()
    
    if (periodeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(p => new Date(p.date) >= weekAgo)
    } else if (periodeFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      filtered = filtered.filter(p => new Date(p.date) >= monthAgo)
    } else if (periodeFilter === 'year') {
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      filtered = filtered.filter(p => new Date(p.date) >= yearAgo)
    } else if (periodeFilter === 'custom' && periodeDebut && periodeFin) {
      filtered = filtered.filter(p => p.date >= periodeDebut && p.date <= periodeFin)
    }
    
    return filtered
  }

  const calculateStats = () => {
    const filtered = getFilteredPresences()
    const total = filtered.length
    const present = filtered.filter(p => p.present === true).length
    const absent = filtered.filter(p => p.present === false).length
    const excuse = filtered.filter(p => p.present === 'excuse').length
    const retard = filtered.filter(p => p.present === 'retard').length
    const tauxPresence = total > 0 ? Math.round(((present + retard) / total) * 100) : 0
    
    // Première et dernière date
    const dates = filtered.map(p => p.date).filter(Boolean).sort()
    const premiereDate = dates[0] || null
    const derniereDate = dates[dates.length - 1] || null
    
    return { total, present, absent, excuse, retard, tauxPresence, premiereDate, derniereDate }
  }

  const stats = membre ? calculateStats() : null

  // ========================================
  // ACTIONS
  // ========================================

  const handleSave = async () => {
    if (!formData.nom?.trim() || !formData.prenom?.trim()) {
      showToast('Le nom et prénom sont obligatoires', 'error')
      return
    }

    setSaving(true)
    try {
      await FirebaseService.updateEleve(id, formData)
      setMembre({ ...membre, ...formData })
      setIsEditing(false)
      showToast('Membre mis à jour', 'success')
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement "${membre.prenom} ${membre.nom}" et tout son historique ?`)) return

    try {
      await FirebaseService.deleteEleve(id)
      showToast('Membre supprimé', 'success')
      navigate('/membres')
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
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

  const sendEmail = () => {
    if (!membre.email) {
      showToast('Aucune adresse email', 'error')
      return
    }
    
    const subject = encodeURIComponent(`[${membre.prenom} ${membre.nom}] - `)
    const body = encodeURIComponent(`Bonjour ${membre.prenom},\n\n`)
    window.open(`mailto:${membre.email}?subject=${subject}&body=${body}`, '_blank')
  }

  const exportPresences = () => {
    const filtered = getFilteredPresences()
    const headers = ['Date', 'Statut', 'Créneau']
    const rows = filtered.map(p => {
      const creneau = creneaux.find(c => c.id === p.creneauId)
      let statut = 'Non pointé'
      if (p.present === true) statut = 'Présent'
      else if (p.present === false) statut = 'Absent'
      else if (p.present === 'excuse') statut = 'Excusé'
      else if (p.present === 'retard') statut = 'Retard'
      
      return [p.date, statut, creneau?.nom || '-']
    })
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `presences_${membre.prenom}_${membre.nom}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export téléchargé', 'success')
  }

  // ========================================
  // HELPERS
  // ========================================

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatutBadge = (present) => {
    if (present === true) return { class: 'badge-success', label: 'Présent', icon: '✅' }
    if (present === false) return { class: 'badge-danger', label: 'Absent', icon: '❌' }
    if (present === 'excuse') return { class: 'badge-warning', label: 'Excusé', icon: '📝' }
    if (present === 'retard') return { class: 'badge-info', label: 'Retard', icon: '⏰' }
    return { class: 'badge-standard', label: 'Non pointé', icon: '○' }
  }

  const getGroupeBadgeClass = (groupe) => {
    const groupeNum = parseInt(groupe?.replace(/\D/g, '')) || 0
    if (groupeNum >= 1 && groupeNum <= 5) return `badge-g${groupeNum}`
    return 'badge-info'
  }

  const getInitials = () => {
    if (!membre) return '??'
    return ((membre.prenom?.[0] || '') + (membre.nom?.[0] || '')).toUpperCase()
  }

  // ========================================
  // RENDER
  // ========================================

  if (isLoading) {
    return (
      <Layout title="Fiche membre">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  if (!membre) {
    return (
      <Layout title="Fiche membre">
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <div className="empty-state-title">Membre non trouvé</div>
          <button className="btn btn-primary" onClick={() => navigate('/membres')}>
            ← Retour à la liste
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="">
      {/* Header avec infos principales */}
      <div className="card card-gradient" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
          <button 
            className="btn btn-secondary btn-icon"
            onClick={() => navigate('/membres')}
            style={{ flexShrink: 0 }}
          >
            ←
          </button>
          
          <div 
            style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            {getInitials()}
          </div>
          
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
              {membre.prenom} {membre.nom}
            </h1>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
              {membre.groupe && (
                <span className={`badge ${getGroupeBadgeClass(membre.groupe)}`}>
                  {membre.groupe}
                </span>
              )}
              {membre.email && (
                <span style={{ fontSize: '14px', opacity: 0.8 }}>📧 {membre.email}</span>
              )}
              {membre.telephone && (
                <span style={{ fontSize: '14px', opacity: 0.8 }}>📱 {membre.telephone}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {membre.email && (
              <button className="btn btn-secondary" onClick={sendEmail}>
                ✉️ Email
              </button>
            )}
            <button 
              className="btn btn-secondary"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Modifier
            </button>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="stats-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats?.tauxPresence || 0}%</div>
          <div className="stat-label">Taux présence</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--present)' }}>
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats?.present || 0}</div>
          <div className="stat-label">Présences</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--absent)' }}>
          <div className="stat-icon">❌</div>
          <div className="stat-value">{stats?.absent || 0}</div>
          <div className="stat-label">Absences</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{stats?.total || 0}</div>
          <div className="stat-label">Total pointages</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'infos' ? 'active' : ''}`}
          onClick={() => setActiveTab('infos')}
        >
          📋 Informations
        </button>
        <button 
          className={`tab ${activeTab === 'presences' ? 'active' : ''}`}
          onClick={() => setActiveTab('presences')}
        >
          ✅ Historique ({presences.length})
        </button>
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistiques
        </button>
      </div>

      {/* Tab Informations */}
      {activeTab === 'infos' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Informations personnelles</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-xl)' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>NOM</p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>{membre.nom || '-'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>PRÉNOM</p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>{membre.prenom || '-'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>GROUPE</p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>{membre.groupe || '-'}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TÉLÉPHONE</p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>
                {membre.telephone ? (
                  <a href={`tel:${membre.telephone}`} style={{ color: 'var(--info)' }}>
                    {membre.telephone}
                  </a>
                ) : '-'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>EMAIL</p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>
                {membre.email ? (
                  <a href={`mailto:${membre.email}`} style={{ color: 'var(--info)' }}>
                    {membre.email}
                  </a>
                ) : '-'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>CRÉNEAUX ASSIGNÉS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {membre.creneauxIds?.length > 0 ? (
                  membre.creneauxIds.map(cid => {
                    const c = creneaux.find(cr => cr.id === cid)
                    return c ? (
                      <span key={cid} className="badge badge-info">{c.nom}</span>
                    ) : null
                  })
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Aucun</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              📅 Premier pointage : {stats?.premiereDate ? formatDate(stats.premiereDate) : 'Aucun'}
              {' • '}
              Dernier pointage : {stats?.derniereDate ? formatDate(stats.derniereDate) : 'Aucun'}
            </p>
          </div>
        </div>
      )}

      {/* Tab Historique Présences */}
      {activeTab === 'presences' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: 'var(--spacing-lg)' }}>
            <h3 className="card-title">Historique des présences</h3>
            <button className="btn btn-secondary btn-sm" onClick={exportPresences}>
              📤 Export CSV
            </button>
          </div>

          {presences.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">Aucun historique</div>
              <div className="empty-state-desc">
                Ce membre n'a pas encore été pointé
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Créneau</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {presences.slice(0, 50).map((p, idx) => {
                    const creneau = creneaux.find(c => c.id === p.creneauId)
                    const statut = getStatutBadge(p.present)
                    return (
                      <tr key={idx}>
                        <td>{formatDate(p.date)}</td>
                        <td>{creneau?.nom || '-'}</td>
                        <td>
                          <span className={`badge ${statut.class}`}>
                            {statut.icon} {statut.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {presences.length > 50 && (
                <p style={{ padding: 'var(--spacing-md)', color: 'var(--text-muted)', textAlign: 'center' }}>
                  ... et {presences.length - 50} autres entrées (export CSV pour voir tout)
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Statistiques */}
      {activeTab === 'stats' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Statistiques détaillées</h3>
          </div>

          {/* Filtre période */}
          <div style={{ 
            display: 'flex', 
            gap: 'var(--spacing-md)', 
            marginBottom: 'var(--spacing-xl)',
            flexWrap: 'wrap',
            alignItems: 'flex-end'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Période</label>
              <select
                className="form-input form-select"
                value={periodeFilter}
                onChange={(e) => setPeriodeFilter(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="all">Tout l'historique</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
                <option value="year">12 derniers mois</option>
                <option value="custom">Période personnalisée</option>
              </select>
            </div>

            {periodeFilter === 'custom' && (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Du</label>
                  <input
                    type="date"
                    className="form-input"
                    value={periodeDebut}
                    onChange={(e) => setPeriodeDebut(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Au</label>
                  <input
                    type="date"
                    className="form-input"
                    value={periodeFin}
                    onChange={(e) => setPeriodeFin(e.target.value)}
                  />
                </div>
              </>
            )}

            <button className="btn btn-secondary btn-sm" onClick={exportPresences}>
              📤 Exporter cette période
            </button>
          </div>

          {/* Stats de la période */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--present)' }}>{stats?.present || 0}</div>
              <div className="stat-label">Présences</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--absent)' }}>{stats?.absent || 0}</div>
              <div className="stat-label">Absences</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--excuse)' }}>{stats?.excuse || 0}</div>
              <div className="stat-label">Excusés</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--retard)' }}>{stats?.retard || 0}</div>
              <div className="stat-label">Retards</div>
            </div>
          </div>

          {/* Barre de progression */}
          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Taux de présence (présent + retard)</span>
              <span style={{ fontWeight: 600 }}>{stats?.tauxPresence || 0}%</span>
            </div>
            <div style={{ 
              height: '24px', 
              background: 'var(--bg-elevated)', 
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              display: 'flex'
            }}>
              <div style={{ 
                width: `${((stats?.present || 0) / (stats?.total || 1)) * 100}%`,
                background: 'var(--present)',
                transition: 'width 0.3s'
              }} />
              <div style={{ 
                width: `${((stats?.retard || 0) / (stats?.total || 1)) * 100}%`,
                background: 'var(--retard)',
                transition: 'width 0.3s'
              }} />
              <div style={{ 
                width: `${((stats?.excuse || 0) / (stats?.total || 1)) * 100}%`,
                background: 'var(--excuse)',
                transition: 'width 0.3s'
              }} />
              <div style={{ 
                width: `${((stats?.absent || 0) / (stats?.total || 1)) * 100}%`,
                background: 'var(--absent)',
                transition: 'width 0.3s'
              }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: '8px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: 'var(--present)', borderRadius: '2px' }}></span>
                Présent
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: 'var(--retard)', borderRadius: '2px' }}></span>
                Retard
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: 'var(--excuse)', borderRadius: '2px' }}></span>
                Excusé
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', background: 'var(--absent)', borderRadius: '2px' }}></span>
                Absent
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Zone danger */}
      <div className="card" style={{ borderLeft: '4px solid var(--danger)', marginTop: 'var(--spacing-xl)' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ color: 'var(--danger)' }}>⚠️ Zone danger</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
          La suppression est définitive et efface toutes les données associées.
        </p>
        <button className="btn btn-danger" onClick={handleDelete}>
          🗑️ Supprimer ce membre
        </button>
      </div>

      {/* Modal édition */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Modifier le membre</h2>
              <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nom || ''}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.prenom || ''}
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
                    value={formData.groupe || ''}
                    onChange={(e) => setFormData({ ...formData, groupe: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.telephone || ''}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email || ''}
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
                          fontSize: '13px'
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
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
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

export default FicheMembrePage
