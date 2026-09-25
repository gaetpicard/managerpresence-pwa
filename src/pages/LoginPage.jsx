import React, { useState } from 'react'
import { useApp } from '../App'

function LoginPage() {
  const { connecterAvecCode, error, setError } = useApp()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Formater le code en majuscules avec tiret automatique
  const handleCodeChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    
    // Ajouter automatiquement le tiret après 4 caractères
    if (value.length === 4 && !value.includes('-')) {
      value = value + '-'
    }
    
    // Limiter à 9 caractères (XXXX-XXXX)
    if (value.length <= 9) {
      setCode(value)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!code.trim() || code.length < 9) {
      setError('Veuillez entrer un code d\'accès valide (format: XXXX-XXXX)')
      return
    }
    
    setIsLoading(true)
    await connecterAvecCode(code.trim())
    setIsLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">MP</div>
          <h1>ManagerPresence</h1>
          <p>Accès sécurisé depuis un ordinateur</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Code d'accès temporaire</label>
            <input
              type="text"
              className="form-input code-input"
              placeholder="XXXX-XXXX"
              value={code}
              onChange={handleCodeChange}
              disabled={isLoading}
              autoFocus
              autoComplete="off"
              spellCheck="false"
              style={{
                textAlign: 'center',
                fontSize: '24px',
                fontFamily: 'monospace',
                letterSpacing: '4px',
                textTransform: 'uppercase'
              }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-lg"
            disabled={isLoading || code.length < 9}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                Vérification...
              </>
            ) : (
              '🔐 Accéder'
            )}
          </button>
        </form>

        <div className="login-help">
          <h3>💡 Comment obtenir un code ?</h3>
          <ol>
            <li>Demandez à un <strong>administrateur</strong> de votre structure</li>
            <li>Il génère le code depuis l'app mobile → <strong>Accès PWA</strong></li>
            <li>Le code est valable <strong>10 minutes</strong></li>
          </ol>
        </div>

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
