import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { useApp } from '../App'

function AuditPage() {
  const { clubName } = useApp()
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const data = await FirebaseService.getAuditLogs(500) // Plus de logs
        setLogs(data)
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

  const formatDate = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDateOnly = (timestamp) => {
    if (!timestamp) return null
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toISOString().split('T')[0]
  }

  // Actions connues de l'app Android
  const getActionEmoji = (action) => {
    const map = {
      // Connexion
      'LOGIN': '🔐',
      'LOGOUT': '🚪',
      'LOGIN_FAILED': '⛔',
      // Élèves
      'AJOUT_ELEVE': '➕',
      'MODIF_ELEVE': '✏️',
      'SUPPR_ELEVE': '🗑️',
      'IMPORT_ELEVES': '📥',
      // Créneaux
      'AJOUT_CRENEAU': '📅',
      'MODIF_CRENEAU': '📝',
      'SUPPR_CRENEAU': '❌',
      // Cadres
      'AJOUT_CADRE': '👔',
      'MODIF_CADRE': '✏️',
      'SUPPR_CADRE': '🗑️',
      // Présences
      'PRESENCE': '✅',
      'ABSENCE': '❎',
      'POINTAGE': '✅',
      'POINTAGE_MODIF': '📝',
      // Exports
      'EXPORT': '📤',
      'EXPORT_CSV': '📤',
      'EXPORT_PDF': '📄',
      'IMPORT': '📥',
      // PWA
      'PWA_CODE_GENERATED': '🔑',
      'PWA_ACCESS': '💻',
      'PWA_LOGIN': '💻',
      // Dev
      'DEVPASS_USED': '🛠️',
      'DEVPASS_GENERATED': '🔧',
      // Config
      'CONFIG_MODIF': '⚙️',
      'STRUCTURE_CREATED': '🏢',
      'LICENCE_UPDATED': '📋'
    }
    return map[action] || '📋'
  }

  const getActionColor = (action) => {
    if (action?.includes('SUPPR') || action === 'ABSENCE' || action?.includes('FAILED')) return 'var(--danger)'
    if (action?.includes('AJOUT') || action === 'PRESENCE' || action === 'POINTAGE') return 'var(--success)'
    if (action?.includes('MODIF')) return 'var(--warning)'
    if (action?.includes('LOGIN') || action?.includes('PWA')) return 'var(--info)'
    if (action?.includes('EXPORT') || action?.includes('IMPORT')) return 'var(--accent)'
    return 'var(--text-muted)'
  }

  // Liste unique des actions pour le filtre
  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort()

  const filteredLogs = logs.filter(log => {
    // Filtre recherche texte
    const matchSearch = searchTerm === '' || 
      log.auteurNom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.cible?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtre action
    const matchAction = filterAction === '' || log.action === filterAction
    
    // Filtre dates
    const logDate = getDateOnly(log.timestamp)
    const matchDateDebut = filterDateDebut === '' || (logDate && logDate >= filterDateDebut)
    const matchDateFin = filterDateFin === '' || (logDate && logDate <= filterDateFin)
    
    return matchSearch && matchAction && matchDateDebut && matchDateFin
  })

  // Export CSV identique à l'app Android
  const exportCSV = () => {
    const headers = ['Date', 'Heure', 'Action', 'Auteur', 'Cible', 'Détails']
    const rows = filteredLogs.map(log => {
      const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp)
      return [
        date.toLocaleDateString('fr-FR'),
        date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        log.action || '',
        log.auteurNom || '',
        log.cible || '',
        log.details || ''
      ]
    })
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    
    // Nom de fichier identique à l'app Android
    const now = new Date()
    const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 15)
    const fileName = `audit_log_${dateStr}.csv`
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    
    showToast(`Export "${fileName}" téléchargé`, 'success')
  }

  // Partage par email (comme l'app Android)
  const shareByEmail = () => {
    const subject = encodeURIComponent(`Audit Log - ${clubName || 'ManagerPresence'}`)
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint l'export du journal d'audit.\n\n` +
      `Période : ${filterDateDebut || 'Début'} au ${filterDateFin || 'Aujourd\'hui'}\n` +
      `Nombre d'entrées : ${filteredLogs.length}\n\n` +
      `Cordialement`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
    showToast('Préparez votre email et joignez le fichier CSV', 'info')
  }

  if (isLoading) {
    return (
      <Layout title="Journal d'audit">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Journal d'audit">
      {/* Toolbar */}
      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
        <div className="toolbar-search">
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          className="form-input form-select"
          style={{ width: '180px' }}
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="">Toutes les actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>
              {getActionEmoji(action)} {action}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="form-input"
          style={{ width: '150px' }}
          value={filterDateDebut}
          onChange={(e) => setFilterDateDebut(e.target.value)}
          placeholder="Date début"
        />
        
        <input
          type="date"
          className="form-input"
          style={{ width: '150px' }}
          value={filterDateFin}
          onChange={(e) => setFilterDateFin(e.target.value)}
          placeholder="Date fin"
        />

        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadLogs}>
            🔄
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV} disabled={filteredLogs.length === 0}>
            📤 CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={shareByEmail}>
            ✉️
          </button>
        </div>
      </div>

      {/* Compteur en haut */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--spacing-md)',
        color: 'var(--text-muted)',
        fontSize: '13px'
      }}>
        <span>{filteredLogs.length} entrée(s) sur {logs.length}</span>
        {(filterDateDebut || filterDateFin || filterAction || searchTerm) && (
          <button 
            className="btn btn-sm"
            style={{ background: 'transparent', color: 'var(--info)', padding: '4px 8px' }}
            onClick={() => {
              setFilterDateDebut('')
              setFilterDateFin('')
              setFilterAction('')
              setSearchTerm('')
            }}
          >
            ✕ Effacer les filtres
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">
              {logs.length === 0 ? 'Aucun log' : 'Aucun résultat'}
            </div>
            <div className="empty-state-desc">
              {logs.length === 0 
                ? 'L\'historique des actions apparaîtra ici'
                : 'Essayez de modifier vos filtres'
              }
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '140px' }}>Date</th>
                  <th style={{ width: '180px' }}>Action</th>
                  <th>Auteur</th>
                  <th>Cible</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                      {formatDate(log.timestamp)}
                    </td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: getActionColor(log.action)
                      }}>
                        <span style={{ fontSize: '16px' }}>{getActionEmoji(log.action)}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                          {log.action || '-'}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>
                        {log.auteurNom || '-'}
                      </span>
                      {log.auteurUid && log.auteurUid !== 'inconnu' && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          ({log.auteurUid.slice(0, 8)}...)
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {log.cible || '-'}
                    </td>
                    <td style={{ 
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={log.details}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export default AuditPage
