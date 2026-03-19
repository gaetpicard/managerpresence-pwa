import React, { useState } from 'react'
import Layout from '../components/Layout'
import { useApp } from '../App'
import { LicenceService } from '../services/LicenceService'

function SettingsPage() {
  const { projectId, licence, deconnecter, connecter } = useApp()
  const [activationCode, setActivationCode] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [activationMessage, setActivationMessage] = useState('')

  const handleActivateCode = async (e) => {
    e.preventDefault()
    if (!activationCode.trim()) return

    setIsActivating(true)
    setActivationMessage('')

    try {
      await LicenceService.activerCode(projectId, activationCode.trim())
      setActivationMessage('✅ Code activé avec succès !')
      setActivationCode('')
      // Reconnecter pour rafraîchir la licence
      await connecter(projectId)
    } catch (error) {
      setActivationMessage(`❌ ${error.message}`)
    }

    setIsActivating(false)
  }

  return (
    <Layout title="Paramètres">
      {/* Informations du compte */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">👤 Informations du compte</h3>
        </div>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Identifiant de structure
            </p>
            <p style={{ fontFamily: 'monospace', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px' }}>
              {projectId}
            </p>
          </div>
          
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Nom de la structure
            </p>
            <p>{licence?.nomStructure || 'Non renseigné'}</p>
          </div>
        </div>
      </div>

      {/* Licence */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Licence</h3>
        </div>
        
        {licence && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Plan</p>
              <span className={`badge badge-${licence.plan}`}>
                {licence.planNom || licence.plan?.toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Statut</p>
              {licence.actif ? (
                <span className="badge badge-success">✅ Actif</span>
              ) : (
                <span className="badge badge-danger">❌ Expiré</span>
              )}
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Jours restants</p>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>{licence.joursRestants}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Expiration</p>
              <p>{new Date(licence.dateExpiration).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        )}

        {/* Activation de code */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '16px' }}>🎟️ Activer un code</h4>
          
          <form onSubmit={handleActivateCode} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="XXX-XXXX-XXXX"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              style={{ flex: '1', minWidth: '200px', maxWidth: '300px', fontFamily: 'monospace', letterSpacing: '1px' }}
              disabled={isActivating}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isActivating || !activationCode.trim()}
            >
              {isActivating ? 'Activation...' : 'Activer'}
            </button>
          </form>

          {activationMessage && (
            <p style={{ 
              marginTop: '12px', 
              padding: '12px', 
              borderRadius: '8px',
              background: activationMessage.startsWith('✅') ? 'rgba(72, 187, 120, 0.2)' : 'rgba(245, 101, 101, 0.2)'
            }}>
              {activationMessage}
            </p>
          )}
        </div>
      </div>

      {/* À propos */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">ℹ️ À propos</h3>
        </div>
        
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>ManagerPresence PWA</strong> - Version 1.0.0
          </p>
          <p style={{ marginBottom: '8px' }}>
            Application web de gestion des présences pour clubs et associations.
          </p>
          <p>
            © 2026 ManagerPresence. Tous droits réservés.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚡ Actions</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            🔄 Recharger l'application
          </button>
          <button 
            className="btn btn-danger"
            onClick={deconnecter}
          >
            🚪 Déconnexion
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default SettingsPage
