import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function AuditPage() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const data = await FirebaseService.getAuditLogs()
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

  const getActionEmoji = (action) => {
    const map = {
      'LOGIN': '🔐',
      'LOGOUT': '🚪',
      'AJOUT_ELEVE': '➕',
      'MODIF_ELEVE': '✏️',
      'SUPPR_ELEVE': '🗑️',
      'AJOUT_CRENEAU': '📅',
      'MODIF_CRENEAU': '📝',
      'SUPPR_CRENEAU': '❌',
      'PRESENCE': '✅',
      'ABSENCE': '❎',
      'EXPORT': '📤',
      'IMPORT': '📥',
      'PWA_CODE_GENERATED': '🔑',
      'PWA_ACCESS': '💻',
      'DEVPASS_USED': '🛠️'
    }
    return map[action] || '📋'
  }

  const getActionColor = (action) => {
    if (action?.includes('SUPPR') || action === 'ABSENCE') return 'var(--danger)'
    if (action?.includes('AJOUT') || action === 'PRESENCE') return 'var(--success)'
    if (action?.includes('MODIF')) return 'var(--warning)'
    if (action === 'LOGIN' || action === 'PWA_ACCESS') return 'var(--info)'
    return 'var(--text-muted)'
  }

  // Liste unique des actions pour le filtre
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort()

  const filteredLogs = logs.filter(log => {
    const matchSearch = searchTerm === '' || 
      log.auteurNom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.cible?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchAction = filterAction === '' || log.action === filterAction
    
    return matchSearch && matchAction
  })

  if (isLoading) {
    return (
      <Layout title="Audit Log">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Audit Log">
      {/* Toolbar */}
      <div className="toolbar">
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
          style={{ width: '200px' }}
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
        <button className="btn btn-secondary btn-sm" onClick={loadLogs}>
          🔄 Actualiser
        </button>
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
                  <th>Date</th>
                  <th>Action</th>
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
                        {getActionEmoji(log.action)}
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                          {log.action}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>
                        {log.auteurNom || '-'}
                      </span>
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
                    }}>
                      {log.details || '-'}
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
        {filteredLogs.length} entrée(s) sur {logs.length}
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

export default AuditPage
