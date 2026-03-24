import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { useApp } from '../App'

function ForumPage() {
  const { generatedBy } = useApp()
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const data = await FirebaseService.getForumMessages()
        setMessages(data)
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
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInitials = (nom) => {
    if (!nom) return '?'
    const parts = nom.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return nom.substring(0, 2).toUpperCase()
  }

  const getAvatarColor = (nom) => {
    const colors = [
      'var(--primary)',
      'var(--success)',
      'var(--info)',
      'var(--warning)',
      'var(--danger)',
      'var(--groupe-g5)'
    ]
    const index = nom ? nom.charCodeAt(0) % colors.length : 0
    return colors[index]
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      await FirebaseService.addForumMessage({
        contenu: newMessage.trim(),
        auteur: generatedBy || 'Anonyme',
        date: new Date()
      })
      setNewMessage('')
      showToast('Message envoyé', 'success')
      loadMessages()
    } catch (error) {
      console.error('Erreur envoi:', error)
      showToast('Erreur lors de l\'envoi', 'error')
    }
    setSending(false)
  }

  const handleDelete = async (message) => {
    if (!confirm('Supprimer ce message ?')) return

    try {
      await FirebaseService.deleteForumMessage(message.id)
      showToast('Message supprimé', 'success')
      loadMessages()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <Layout title="Forum">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Forum">
      {/* Zone de saisie */}
      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <textarea
            className="form-input"
            placeholder="Écrire un message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            style={{ resize: 'none', flex: 1 }}
          />
          <button 
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            style={{ alignSelf: 'flex-end' }}
          >
            {sending ? '...' : '📤'}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--spacing-sm)' }}>
          Appuyez sur Entrée pour envoyer
        </p>
      </div>

      {/* Messages */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: 'var(--spacing-lg)' }}>
          <h3 className="card-title">💬 Discussion ({messages.length})</h3>
          <button className="btn btn-secondary btn-sm" onClick={loadMessages}>
            🔄
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">Aucun message</div>
            <div className="empty-state-desc">
              Soyez le premier à écrire un message !
            </div>
          </div>
        ) : (
          <div style={{ padding: 'var(--spacing-md)' }}>
            {messages.map(message => (
              <div 
                key={message.id} 
                className="list-item"
                style={{ alignItems: 'flex-start' }}
              >
                <div 
                  className="list-item-avatar"
                  style={{ 
                    background: getAvatarColor(message.auteur),
                    flexShrink: 0
                  }}
                >
                  {getInitials(message.auteur)}
                </div>
                <div className="list-item-content" style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{message.auteur || 'Anonyme'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatDate(message.date)}
                    </span>
                  </div>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {message.contenu}
                  </p>
                </div>
                <button 
                  className="btn btn-icon"
                  onClick={() => handleDelete(message)}
                  style={{ 
                    opacity: 0.5, 
                    background: 'transparent',
                    flexShrink: 0
                  }}
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            ))}
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

export default ForumPage
