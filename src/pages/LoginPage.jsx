import React, { useState } from 'react'
import { useApp } from '../App'

function LoginPage() {
  const { connecterAvecCode, error, setError, t } = useApp()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCodeChange = (e) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    if (value.length === 4 && !value.includes('-')) value = value + '-'
    if (value.length <= 9) setCode(value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!code.trim() || code.length < 9) {
      setError(t('login_error_invalid'))
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
          <p>{t('login_title')}</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('login_code_label')}</label>
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
              style={{ textAlign: 'center', fontSize: '24px', fontFamily: 'monospace', letterSpacing: '4px', textTransform: 'uppercase' }}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={isLoading || code.length < 9}>
            {isLoading ? (
              <><span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span> {t('login_verifying')}</>
            ) : t('login_btn')}
          </button>
        </form>

        <div className="login-help">
          <h3>{t('login_help_title')}</h3>
          <ol>
            <li dangerouslySetInnerHTML={{ __html: t('login_help_1') }} />
            <li dangerouslySetInnerHTML={{ __html: t('login_help_2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('login_help_3') }} />
          </ol>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {t('login_plan_notice')} <span style={{ color: 'var(--premium)' }}>Premium</span> &amp; <span style={{ color: 'var(--trial)' }}>Trial</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
