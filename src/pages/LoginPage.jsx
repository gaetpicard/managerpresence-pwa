import React, { useState } from 'react'
import { useApp } from '../App'

function LoginPage() {
  const { connecter, error, setError } = useApp()
  const [projectId, setProjectId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!projectId.trim()) {
      setError('Veuillez entrer votre identifiant de structure')
      return
    }
    
    setIsLoading(true)
    await connecter(projectId.trim().toLowerCase())
    setIsLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">MP</div>
          <h1>ManagerPresence</h1>
          <p>Connectez-vous pour accéder à votre espace de gestion</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Identifiant de structure (Project ID)</label>
            <input
              type="text"
              className="form-input"
              placeholder="ex: mon-club-abc123"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Vous trouverez cet identifiant dans l'application mobile → À propos → Firebase
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Accès réservé aux licences <span style={{ color: 'var(--premium)' }}>Premium</span> et <span style={{ color: 'var(--trial)' }}>Trial</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
