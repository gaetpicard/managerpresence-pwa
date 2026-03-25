import React, { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { useApp } from '../App'

function ParametresPage() {
  const { termes, clubName, onLogout } = useApp()
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  // Authentification SU
  const [suAuthenticated, setSuAuthenticated] = useState(false)
  const [suPassword, setSuPassword] = useState('')
  const [suError, setSuError] = useState(null)
  const [suConfig, setSuConfig] = useState(null)
  
  // Section active
  const [activeSection, setActiveSection] = useState('general')
  const [saving, setSaving] = useState(false)
  
  // Config générale
  const [clubConfig, setClubConfig] = useState({ nom: '', creeLe: '' })
  const [editingClubName, setEditingClubName] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  
  // Logo
  const [logoPreview, setLogoPreview] = useState(null)
  const logoInputRef = useRef(null)
  
  // Backend / Documentation
  const [serverUrl, setServerUrl] = useState('')
  const [docEnabled, setDocEnabled] = useState(false)
  
  // Config email SMTP
  const [emailConfig, setEmailConfig] = useState({
    enabled: false, smtpHost: '', smtpPort: '587', emailFrom: '', emailPassword: ''
  })
  const [showEmailPassword, setShowEmailPassword] = useState(false)
  
  // Termes personnalisés
  const [termesConfig, setTermesConfig] = useState({
    eleve: 'Membre', eleves: 'Membres', cadre: 'Cadre', cadres: 'Cadres',
    creneau: 'Créneau', creneaux: 'Créneaux', seance: 'Séance', seances: 'Séances',
    club: 'Structure', typeStructure: 'club'
  })
  
  // Notifications
  const [notifEmail, setNotifEmail] = useState('')
  const [currentNotifEmail, setCurrentNotifEmail] = useState('')
  
  // SMS et périodes
  const [smsConfig, setSmsConfig] = useState({ enabled: false })
  const [periodes, setPeriodes] = useState([])
  
  // Changement mdp SU
  const [showChangeSuPassword, setShowChangeSuPassword] = useState(false)
  const [newSuPassword, setNewSuPassword] = useState('')
  const [confirmSuPassword, setConfirmSuPassword] = useState('')
  
  // Dialogs
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [suData, termesData, clubData, logoData, emailData, backendData, notifData, smsData, periodesData] = await Promise.all([
          FirebaseService.getSuperUserConfig(),
          FirebaseService.getTermes(),
          FirebaseService.getClubConfig(),
          FirebaseService.getLogo(),
          FirebaseService.getEmailConfig(),
          FirebaseService.getBackendConfig(),
          FirebaseService.getNotificationEmail(),
          FirebaseService.getSmsConfig(),
          FirebaseService.getPeriodes()
        ])
        
        if (suData) setSuConfig(suData)
        if (termesData) setTermesConfig(prev => ({ ...prev, ...termesData }))
        if (clubData) { setClubConfig(clubData); setNewClubName(clubData.nom || '') }
        if (logoData) setLogoPreview(logoData)
        if (emailData) setEmailConfig(prev => ({ ...prev, ...emailData }))
        if (backendData) { setServerUrl(backendData.backendUrl || ''); setDocEnabled(backendData.docEnabled || false) }
        if (notifData) { setCurrentNotifEmail(notifData); setNotifEmail(notifData) }
        if (smsData) setSmsConfig(smsData)
        if (periodesData) setPeriodes(periodesData)
      }
    } catch (error) {
      console.error('Erreur chargement config:', error)
    }
    setIsLoading(false)
  }

  const hashPassword = async (password) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    // Android utilise Base64.NO_WRAP, on reproduit le même format
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    return base64
  }

  const verifySuPassword = async () => {
    if (!suPassword.trim()) { setSuError('Entrez le mot de passe'); return }
    try {
      const hashHex = await hashPassword(suPassword)
      if (suConfig?.passwordHash === hashHex) {
        setSuAuthenticated(true); setSuError(null); showToast('Accès autorisé', 'success')
      } else { setSuError('Mot de passe incorrect') }
    } catch (error) { setSuError('Erreur de vérification') }
  }

  const changeSuPassword = async () => {
    if (newSuPassword.length < 4) { showToast('Minimum 4 caractères', 'error'); return }
    if (newSuPassword !== confirmSuPassword) { showToast('Mots de passe différents', 'error'); return }
    setSaving(true)
    try {
      const hashHex = await hashPassword(newSuPassword)
      await FirebaseService.updateSuperUserConfig({ passwordHash: hashHex, isFirstConnection: false, lastModified: Date.now() })
      setSuConfig(prev => ({ ...prev, passwordHash: hashHex, isFirstConnection: false }))
      setShowChangeSuPassword(false); setNewSuPassword(''); setConfirmSuPassword('')
      showToast('Mot de passe SU modifié', 'success')
    } catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const base64 = event.target.result.split(',')[1]
        await FirebaseService.updateLogo(base64)
        setLogoPreview(`data:image/png;base64,${base64}`)
        showToast('Logo mis à jour', 'success')
      } catch (error) { showToast('Erreur upload', 'error') }
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }

  const deleteLogo = async () => {
    setSaving(true)
    try { await FirebaseService.deleteLogo(); setLogoPreview(null); showToast('Logo supprimé', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const saveServerUrl = async () => {
    setSaving(true)
    try { await FirebaseService.updateBackendConfig({ backendUrl: serverUrl.trim(), docEnabled }); showToast('Sauvegardé', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const saveTermes = async () => {
    setSaving(true)
    try { await FirebaseService.updateTermes(termesConfig); showToast('Termes sauvegardés', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const saveEmailConfig = async () => {
    setSaving(true)
    try { await FirebaseService.updateEmailConfig(emailConfig); showToast('Config email sauvegardée', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const saveNotifEmail = async () => {
    setSaving(true)
    try { await FirebaseService.updateNotificationEmail(notifEmail); setCurrentNotifEmail(notifEmail); showToast('Email mis à jour', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const saveClubName = async () => {
    if (!newClubName.trim()) return
    setSaving(true)
    try { await FirebaseService.updateClubName(newClubName.trim()); setClubConfig(prev => ({ ...prev, nom: newClubName.trim() })); setEditingClubName(false); showToast('Nom mis à jour', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const applyPreset = (type) => {
    const presets = {
      club: { eleve: 'Élève', eleves: 'Élèves', cadre: 'Cadre', cadres: 'Cadres', creneau: 'Créneau', creneaux: 'Créneaux', seance: 'Séance', seances: 'Séances', club: 'Club', typeStructure: 'club' },
      entreprise: { eleve: 'Salarié', eleves: 'Salariés', cadre: 'Chef d\'équipe', cadres: 'Chefs d\'équipe', creneau: 'Poste', creneaux: 'Postes', seance: 'Journée', seances: 'Journées', club: 'Entreprise', typeStructure: 'entreprise' },
      ecole: { eleve: 'Élève', eleves: 'Élèves', cadre: 'Enseignant', cadres: 'Enseignants', creneau: 'Cours', creneaux: 'Cours', seance: 'Journée', seances: 'Journées', club: 'École', typeStructure: 'ecole' }
    }
    setTermesConfig(presets[type] || presets.club)
  }

  const handleDisconnect = () => { window.location.href = '/login' }
  
  // État pour voir le mdp SU à la connexion
  const [showSuPasswordLogin, setShowSuPasswordLogin] = useState(false)

  if (isLoading) return <Layout title="Paramètres"><div className="empty-state"><div className="loading-spinner"></div><p>Chargement...</p></div></Layout>

  // Écran de connexion SU
  if (!suAuthenticated) {
    return (
      <Layout title="Paramètres">
        <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
            <h2 style={{ margin: 0 }}>Accès Super-Utilisateur</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>Mot de passe administrateur requis</p>
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe SU</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type={showSuPasswordLogin ? 'text' : 'password'} className="form-input" placeholder="Entrez le mot de passe" value={suPassword}
                onChange={(e) => { setSuPassword(e.target.value); setSuError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && verifySuPassword()}
                style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={() => setShowSuPasswordLogin(!showSuPasswordLogin)} type="button">
                {showSuPasswordLogin ? '🙈' : '👁️'}
              </button>
            </div>
            {suError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '8px' }}>❌ {suError}</p>}
          </div>
          <button className="btn btn-primary btn-block" onClick={verifySuPassword}>🔓 Accéder aux paramètres</button>
          {suConfig?.isFirstConnection && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 152, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--warning)' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--warning)' }}>⚠️ Mot de passe par défaut — Changez-le après connexion</p>
            </div>
          )}
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Paramètres">
      {/* Onglets */}
      <div className="tabs" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
        {[{ id: 'general', icon: '⚙️', label: 'Général' }, { id: 'termes', icon: '🏷️', label: 'Terminologie' }, { id: 'email', icon: '📧', label: 'Email' }, { id: 'securite', icon: '🔐', label: 'Sécurité' }, { id: 'danger', icon: '⚠️', label: 'Danger' }].map(tab => (
          <button key={tab.id} className={`tab ${activeSection === tab.id ? 'active' : ''}`} onClick={() => setActiveSection(tab.id)}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* GÉNÉRAL */}
      {activeSection === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Logo */}
          <div className="card">
            <h3>🖼️ Logo de la structure</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'var(--bg-elevated)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {logoPreview ? <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '28px' }}>🏔️</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="file" accept="image/*" ref={logoInputRef} style={{ display: 'none' }} onChange={handleLogoUpload} />
                <button className="btn btn-primary btn-sm" onClick={() => logoInputRef.current?.click()} disabled={saving}>📁 Choisir</button>
                {logoPreview && <button className="btn btn-danger btn-sm" onClick={deleteLogo} disabled={saving}>🗑️ Supprimer</button>}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div className="card">
            <h3>✏️ Nom de la structure</h3>
            {editingClubName ? (
              <div style={{ marginTop: '12px' }}>
                <input type="text" className="form-input" value={newClubName} onChange={(e) => setNewClubName(e.target.value)} style={{ marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary btn-sm" onClick={saveClubName} disabled={saving || !newClubName.trim()}>✓ Sauvegarder</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingClubName(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                <p style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{clubConfig.nom || clubName || 'Non défini'}</p>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingClubName(true)}>✏️</button>
              </div>
            )}
          </div>

          {/* Backend */}
          <div className="card">
            <h3>🌐 Serveur Backend</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>URL pour héberger les documents</p>
            <input type="text" className="form-input" placeholder="http://192.168.1.31:8080" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} style={{ marginTop: '8px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={docEnabled} onChange={(e) => setDocEnabled(e.target.checked)} disabled={!serverUrl.trim()} />
              <span>Activer Documentation</span>
            </label>
            <button className="btn btn-primary btn-sm" onClick={saveServerUrl} disabled={saving} style={{ marginTop: '12px' }}>💾 Sauvegarder</button>
          </div>
        </div>
      )}

      {/* TERMINOLOGIE */}
      {activeSection === 'termes' && (
        <div className="card">
          <h3>🏷️ Terminologie personnalisée</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            {[{ id: 'club', icon: '🏠', label: 'Club' }, { id: 'entreprise', icon: '🏢', label: 'Entreprise' }, { id: 'ecole', icon: '🏫', label: 'École' }].map(p => (
              <button key={p.id} className={`btn btn-sm ${termesConfig.typeStructure === p.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyPreset(p.id)}>{p.icon} {p.label}</button>
            ))}
          </div>
          <div className="form-row" style={{ marginTop: '16px' }}>
            <div className="form-group"><label className="form-label">Membre (sing.)</label><input type="text" className="form-input" value={termesConfig.eleve} onChange={(e) => setTermesConfig(p => ({ ...p, eleve: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Membres (plur.)</label><input type="text" className="form-input" value={termesConfig.eleves} onChange={(e) => setTermesConfig(p => ({ ...p, eleves: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Encadrant</label><input type="text" className="form-input" value={termesConfig.cadre} onChange={(e) => setTermesConfig(p => ({ ...p, cadre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Encadrants</label><input type="text" className="form-input" value={termesConfig.cadres} onChange={(e) => setTermesConfig(p => ({ ...p, cadres: e.target.value }))} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Créneau</label><input type="text" className="form-input" value={termesConfig.creneau} onChange={(e) => setTermesConfig(p => ({ ...p, creneau: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Créneaux</label><input type="text" className="form-input" value={termesConfig.creneaux} onChange={(e) => setTermesConfig(p => ({ ...p, creneaux: e.target.value }))} /></div>
          </div>
          <button className="btn btn-primary" onClick={saveTermes} disabled={saving} style={{ marginTop: '12px' }}>{saving ? 'Sauvegarde...' : '💾 Sauvegarder'}</button>
        </div>
      )}

      {/* EMAIL */}
      {activeSection === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3>📧 Configuration SMTP</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={emailConfig.enabled} onChange={(e) => setEmailConfig(p => ({ ...p, enabled: e.target.checked }))} />
              <span style={{ fontWeight: 600 }}>Activer l'envoi d'emails</span>
            </label>
            {emailConfig.enabled && (
              <>
                <div className="form-row" style={{ marginTop: '12px' }}>
                  <div className="form-group"><label className="form-label">Serveur SMTP</label><input type="text" className="form-input" placeholder="smtp.gmail.com" value={emailConfig.smtpHost} onChange={(e) => setEmailConfig(p => ({ ...p, smtpHost: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Port</label><input type="text" className="form-input" placeholder="587" value={emailConfig.smtpPort} onChange={(e) => setEmailConfig(p => ({ ...p, smtpPort: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Email expéditeur</label><input type="email" className="form-input" placeholder="noreply@structure.com" value={emailConfig.emailFrom} onChange={(e) => setEmailConfig(p => ({ ...p, emailFrom: e.target.value }))} /></div>
                <div className="form-group">
                  <label className="form-label">Mot de passe</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type={showEmailPassword ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={emailConfig.emailPassword} onChange={(e) => setEmailConfig(p => ({ ...p, emailPassword: e.target.value }))} style={{ flex: 1 }} />
                    <button className="btn btn-secondary" onClick={() => setShowEmailPassword(!showEmailPassword)}>{showEmailPassword ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', marginTop: '8px' }}>
                  <p style={{ margin: 0, fontSize: '11px' }}><strong>Gmail :</strong> myaccount.google.com → Sécurité → Validation 2 étapes → Mots de passe d'applications</p>
                </div>
              </>
            )}
            <button className="btn btn-primary" onClick={saveEmailConfig} disabled={saving} style={{ marginTop: '12px' }}>💾 Sauvegarder</button>
          </div>
          <div className="card" style={{ background: 'var(--bg-elevated)' }}>
            <h3>📱 SMS d'absence</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Géré depuis l'app Android — Statut : <strong style={{ color: smsConfig.enabled ? 'var(--success)' : 'var(--text-muted)' }}>{smsConfig.enabled ? '✅ Activé' : '❌ Désactivé'}</strong></p>
          </div>
        </div>
      )}

      {/* SÉCURITÉ */}
      {activeSection === 'securite' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <h3>🔐 Mot de passe Super-Utilisateur</h3>
            {suConfig?.isFirstConnection && <div style={{ padding: '12px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px', border: '1px solid var(--danger)', marginTop: '8px' }}><p style={{ margin: 0, fontSize: '12px', color: 'var(--danger)' }}>⚠️ Changez le mot de passe par défaut !</p></div>}
            {!showChangeSuPassword ? (
              <button className="btn btn-secondary" onClick={() => setShowChangeSuPassword(true)} style={{ marginTop: '12px' }}>🔑 Changer le mot de passe</button>
            ) : (
              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', marginTop: '12px' }}>
                <div className="form-group"><label className="form-label">Nouveau mot de passe</label><input type="password" className="form-input" value={newSuPassword} onChange={(e) => setNewSuPassword(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Confirmer</label><input type="password" className="form-input" value={confirmSuPassword} onChange={(e) => setConfirmSuPassword(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={changeSuPassword} disabled={saving}>✓ Valider</button>
                  <button className="btn btn-secondary" onClick={() => { setShowChangeSuPassword(false); setNewSuPassword(''); setConfirmSuPassword('') }}>Annuler</button>
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <h3>📧 Email de notification</h3>
            <p style={{ fontSize: '13px' }}>Actuel : <strong style={{ color: currentNotifEmail ? 'var(--success)' : 'var(--danger)' }}>{currentNotifEmail || 'Non configuré'}</strong></p>
            <input type="email" className="form-input" placeholder="exemple@gmail.com" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} style={{ marginTop: '8px' }} />
            <button className="btn btn-primary" onClick={saveNotifEmail} disabled={saving || !notifEmail.trim() || notifEmail === currentNotifEmail} style={{ marginTop: '8px' }}>🔐 Modifier</button>
          </div>
          <div className="card">
            <h3>📋 Journal d'audit</h3>
            <a href="/audit" className="btn btn-secondary">📋 Voir le journal</a>
          </div>
        </div>
      )}

      {/* DANGER */}
      {activeSection === 'danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px', border: '1px solid var(--danger)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--danger)' }}>⚠️ Actions sensibles ou irréversibles</p>
          </div>
          <div className="card">
            <h3>🔌 Déconnexion</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Se déconnecter de cette structure (données intactes)</p>
            <button className="btn btn-danger" onClick={() => setShowDisconnectConfirm(true)} style={{ marginTop: '8px' }}>🔌 Se déconnecter</button>
          </div>
          <div className="card">
            <h3>🗑️ Suppression du club</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Pour supprimer toutes les données, utilisez l'application Android</p>
          </div>
        </div>
      )}

      {/* Bouton verrouiller */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setSuAuthenticated(false); setSuPassword('') }}>🔒 Verrouiller</button>
      </div>

      {/* Dialog déconnexion */}
      {showDisconnectConfirm && (
        <div className="modal-overlay" onClick={() => setShowDisconnectConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🔌 Déconnexion ?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Les données restent intactes dans Firebase.</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDisconnectConfirm(false)}>Annuler</button>
              <button className="btn btn-danger" onClick={handleDisconnect}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}
    </Layout>
  )
}

export default ParametresPage
