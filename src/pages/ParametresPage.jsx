import React, { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { useApp } from '../App'

function ParametresPage() {
  const { termes, clubName } = useApp()
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  // Authentification SU
  const [suAuthenticated, setSuAuthenticated] = useState(false)
  const [suPassword, setSuPassword] = useState('')
  const [suError, setSuError] = useState(null)
  const [suConfig, setSuConfig] = useState(null)
  const [showSuPasswordLogin, setShowSuPasswordLogin] = useState(false)
  
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
  
  // Rappel d'appel
  const [rappelAppelActive, setRappelAppelActive] = useState(true)
  
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
  
  // SMS et message absence
  const [smsConfig, setSmsConfig] = useState({ enabled: false })
  const [messageAbsence, setMessageAbsence] = useState('{club} : {prenom} {nom} a été noté(e) absent(e) le {date} ({creneau}). Merci de contacter l\'établissement.')
  
  // Périodes scolaires
  const [periodes, setPeriodes] = useState([])
  const [showPeriodesEditor, setShowPeriodesEditor] = useState(false)
  const [newPeriode, setNewPeriode] = useState({ nom: '', debut: '', fin: '' })
  
  // Changement mdp SU
  const [showChangeSuPassword, setShowChangeSuPassword] = useState(false)
  const [newSuPassword, setNewSuPassword] = useState('')
  const [confirmSuPassword, setConfirmSuPassword] = useState('')
  const [showNewSuPassword, setShowNewSuPassword] = useState(false)
  
  // Sauvegarde / Restauration
  const [backups, setBackups] = useState([])
  const [backupStatus, setBackupStatus] = useState(null)
  const [isRestorationMode, setIsRestorationMode] = useState(false)
  
  // Diagnostic
  const [diagnosticResult, setDiagnosticResult] = useState(null)
  const [diagnosticInProgress, setDiagnosticInProgress] = useState(false)
  
  // Dialogs
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [showBackendGuide, setShowBackendGuide] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const results = await Promise.all([
          FirebaseService.getSuperUserConfig(),
          FirebaseService.getTermes(),
          FirebaseService.getClubConfig(),
          FirebaseService.getLogo(),
          FirebaseService.getEmailConfig(),
          FirebaseService.getBackendConfig(),
          FirebaseService.getNotificationEmail(),
          FirebaseService.getSmsConfig(),
          FirebaseService.getPeriodes(),
          FirebaseService.getMessageAbsence(),
          FirebaseService.getRappelConfig(),
          FirebaseService.getBackups()
        ])
        
        const [suData, termesData, clubData, logoData, emailData, backendData, notifData, smsData, periodesData, msgData, rappelData, backupsData] = results
        
        if (suData) setSuConfig(suData)
        if (termesData) setTermesConfig(prev => ({ ...prev, ...termesData }))
        if (clubData) { setClubConfig(clubData); setNewClubName(clubData.nom || '') }
        if (logoData) setLogoPreview(logoData)
        if (emailData) setEmailConfig(prev => ({ ...prev, ...emailData }))
        if (backendData) { setServerUrl(backendData.backendUrl || ''); setDocEnabled(backendData.docEnabled || false) }
        if (notifData) { setCurrentNotifEmail(notifData); setNotifEmail(notifData) }
        if (smsData) setSmsConfig(smsData)
        if (periodesData) setPeriodes(periodesData)
        if (msgData) setMessageAbsence(msgData)
        if (rappelData !== null) setRappelAppelActive(rappelData)
        if (backupsData) setBackups(backupsData)
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
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
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

  const saveRappelConfig = async () => {
    setSaving(true)
    try { await FirebaseService.updateRappelConfig(rappelAppelActive); showToast('Rappel configuré', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const saveMessageAbsence = async () => {
    setSaving(true)
    try { await FirebaseService.updateMessageAbsence(messageAbsence); showToast('Message sauvegardé', 'success') }
    catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const addPeriode = async () => {
    if (!newPeriode.nom || !newPeriode.debut || !newPeriode.fin) { showToast('Remplissez tous les champs', 'error'); return }
    setSaving(true)
    try {
      const updated = [...periodes, { ...newPeriode, id: Date.now().toString() }]
      await FirebaseService.updatePeriodes(updated)
      setPeriodes(updated)
      setNewPeriode({ nom: '', debut: '', fin: '' })
      showToast('Période ajoutée', 'success')
    } catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const deletePeriode = async (id) => {
    setSaving(true)
    try {
      const updated = periodes.filter(p => p.id !== id)
      await FirebaseService.updatePeriodes(updated)
      setPeriodes(updated)
      showToast('Période supprimée', 'success')
    } catch (error) { showToast('Erreur', 'error') }
    setSaving(false)
  }

  const createBackup = async () => {
    setSaving(true)
    setBackupStatus('💾 Sauvegarde en cours...')
    try {
      const result = await FirebaseService.createBackup()
      setBackupStatus(`✅ Sauvegarde créée : ${result}`)
      const newBackups = await FirebaseService.getBackups()
      setBackups(newBackups)
    } catch (error) {
      setBackupStatus(`❌ Erreur : ${error.message}`)
    }
    setSaving(false)
  }

  const runDiagnostic = async () => {
    setDiagnosticInProgress(true)
    setDiagnosticResult('🔍 Analyse en cours...')
    try {
      const result = await FirebaseService.runDiagnostic()
      setDiagnosticResult(result)
    } catch (error) {
      setDiagnosticResult(`❌ Erreur : ${error.message}`)
    }
    setDiagnosticInProgress(false)
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
              <button className="btn btn-secondary" onClick={() => setShowSuPasswordLogin(!showSuPasswordLogin)}>{showSuPasswordLogin ? '🙈' : '👁️'}</button>
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
        {[
          { id: 'general', icon: '⚙️', label: 'Général' },
          { id: 'termes', icon: '🏷️', label: 'Termes' },
          { id: 'email', icon: '📧', label: 'Email/SMS' },
          { id: 'export', icon: '📊', label: 'Export' },
          { id: 'backup', icon: '💾', label: 'Sauvegarde' },
          { id: 'securite', icon: '🔐', label: 'Sécurité' },
          { id: 'danger', icon: '⚠️', label: 'Danger' }
        ].map(tab => (
          <button key={tab.id} className={`tab ${activeSection === tab.id ? 'active' : ''}`} onClick={() => setActiveSection(tab.id)}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {/* ============ GÉNÉRAL ============ */}
      {activeSection === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Logo */}
          <div className="card">
            <h3>🖼️ Logo de la structure</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>S'affiche sur l'accueil et dans la navigation</p>
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
            <h3>🌐 Serveur Backend (Documentation)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>URL pour héberger les documents accessibles dans l'app</p>
            <input type="text" className="form-input" placeholder="http://192.168.1.31:8080" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} style={{ marginTop: '8px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={docEnabled} onChange={(e) => setDocEnabled(e.target.checked)} disabled={!serverUrl.trim()} />
              <span>Activer l'accès Documentation</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-primary btn-sm" onClick={saveServerUrl} disabled={saving}>💾 Sauvegarder</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBackendGuide(!showBackendGuide)}>
                {showBackendGuide ? '▲ Masquer' : '📖 Guide'}
              </button>
            </div>
            
            {/* Guide Backend */}
            {showBackendGuide && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '13px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: 'var(--primary)' }}>📦 Pack Backend — Guide d'installation</h4>
                
                <div style={{ background: 'rgba(255, 152, 0, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <strong>⚠️ Niveau technique requis</strong><br/>
                  <span style={{ fontSize: '12px' }}>Connaissances de base en ligne de commande et réseau nécessaires. Faites appel à un geek si besoin — 1h suffit.</span>
                </div>
                
                <h5 style={{ margin: '12px 0 8px 0' }}>📌 À quoi ça sert ?</h5>
                <p style={{ margin: 0, fontSize: '12px' }}>Partager des documents (PDFs, guides, programmes, tableaux) via l'onglet Documentation. Chaque structure a son propre serveur.</p>
                
                <h5 style={{ margin: '12px 0 8px 0' }}>🔧 Prérequis</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                  <li>Node.js 18+ (<a href="https://nodejs.org" target="_blank" rel="noreferrer">nodejs.org</a>)</li>
                  <li>Un fichier service-account.json (Firebase/Drive)</li>
                  <li>L'identifiant de votre dossier de stockage</li>
                </ul>
                
                <h5 style={{ margin: '12px 0 8px 0' }}>🚀 Installation</h5>
                <div style={{ background: '#1e1e1e', color: '#80cbc4', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', overflowX: 'auto' }}>
                  <pre style={{ margin: 0 }}>{`# 1. Téléchargez le pack depuis l'app Android (Paramètres)
# 2. Décompressez et placez service-account.json dedans
# 3. Complétez .env avec FOLDER_ID=votre_id_drive

npm install
node index.js

# Vérifiez : http://VOTRE_IP:8080/config
# Puis "Détecter automatiquement" dans l'app`}</pre>
                </div>
                
                <h5 style={{ margin: '12px 0 8px 0' }}>🔁 Système de balise</h5>
                <p style={{ margin: 0, fontSize: '12px' }}>Le serveur s'enregistre dans Firebase toutes les 5 min. Si l'IP change, l'app retrouve automatiquement le nouveau chemin.</p>
                
                <h5 style={{ margin: '12px 0 8px 0' }}>💡 Options d'hébergement</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                  <li><strong>PC local</strong> — Gratuit, allumé pendant les séances</li>
                  <li><strong>Raspberry Pi</strong> — ~50€, permanent, ~5W</li>
                  <li><strong>VPS (OVH, Railway)</strong> — ~3-6€/mois, accessible partout</li>
                </ul>
                
                <div style={{ background: 'rgba(244, 67, 54, 0.1)', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                  <strong>🔒 Sécurité</strong><br/>
                  <span style={{ fontSize: '11px' }}>Ne partagez jamais votre service-account.json. En réseau local, seuls les appareils sur le même WiFi accèdent au serveur.</span>
                </div>
                
                <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  📥 Le pack backend est téléchargeable depuis l'application Android : Paramètres → "📦 Télécharger le pack backend"
                </p>
              </div>
            )}
          </div>

          {/* Rappel d'appel */}
          <div className="card">
            <h3>⏰ Rappel d'appel automatique</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Alerte sonore si l'appel n'est pas fait 30 min après le début du créneau</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={rappelAppelActive} onChange={(e) => setRappelAppelActive(e.target.checked)} />
              <span style={{ fontWeight: 600 }}>{rappelAppelActive ? '✅ Activé' : '❌ Désactivé'}</span>
            </label>
            <button className="btn btn-primary btn-sm" onClick={saveRappelConfig} disabled={saving} style={{ marginTop: '12px' }}>💾 Sauvegarder</button>
          </div>
        </div>
      )}

      {/* ============ TERMINOLOGIE ============ */}
      {activeSection === 'termes' && (
        <div className="card">
          <h3>🏷️ Terminologie personnalisée</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>Adaptez les termes selon votre type de structure</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[{ id: 'club', icon: '🏠', label: 'Club' }, { id: 'entreprise', icon: '🏢', label: 'Entreprise' }, { id: 'ecole', icon: '🏫', label: 'École' }].map(p => (
              <button key={p.id} className={`btn btn-sm ${termesConfig.typeStructure === p.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyPreset(p.id)}>{p.icon} {p.label}</button>
            ))}
          </div>
          <div className="form-row">
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

      {/* ============ EMAIL / SMS ============ */}
      {activeSection === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Config SMTP */}
          <div className="card">
            <h3>📧 Configuration SMTP</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Pour l'envoi d'emails automatiques (notifications, exports)</p>
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
                  <label className="form-label">Mot de passe / Clé d'application</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type={showEmailPassword ? 'text' : 'password'} className="form-input" placeholder="••••••••" value={emailConfig.emailPassword} onChange={(e) => setEmailConfig(p => ({ ...p, emailPassword: e.target.value }))} style={{ flex: 1 }} />
                    <button className="btn btn-secondary" onClick={() => setShowEmailPassword(!showEmailPassword)}>{showEmailPassword ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', marginTop: '8px' }}>
                  <p style={{ margin: 0, fontSize: '11px' }}>
                    <strong>ℹ️ Comment obtenir un mot de passe Gmail :</strong><br/>
                    1. Allez sur <a href="https://myaccount.google.com" target="_blank" rel="noreferrer">myaccount.google.com</a><br/>
                    2. Sécurité → Validation en 2 étapes (activez-la)<br/>
                    3. Mots de passe des applications → Générer<br/>
                    4. Copiez le mot de passe de 16 caractères (sans espaces)
                  </p>
                </div>
              </>
            )}
            <button className="btn btn-primary" onClick={saveEmailConfig} disabled={saving} style={{ marginTop: '12px' }}>💾 Sauvegarder</button>
          </div>

          {/* SMS */}
          <div className="card" style={{ background: 'var(--bg-elevated)' }}>
            <h3>📱 SMS d'absence</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              L'envoi de SMS utilise l'appareil Android (permission requise).<br/>
              Statut : <strong style={{ color: smsConfig.enabled ? 'var(--success)' : 'var(--text-muted)' }}>{smsConfig.enabled ? '✅ Activé' : '❌ Désactivé'}</strong>
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Pour activer/désactiver les SMS, utilisez l'application Android.
            </p>
          </div>

          {/* Message d'absence personnalisé */}
          <div className="card">
            <h3>✉️ Message d'absence personnalisé</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Template pour les SMS et emails d'absence envoyés aux parents</p>
            <textarea
              className="form-input"
              rows={4}
              value={messageAbsence}
              onChange={(e) => setMessageAbsence(e.target.value)}
              style={{ marginTop: '12px', fontFamily: 'monospace', fontSize: '12px' }}
            />
            <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', marginTop: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px' }}>
                <strong>Variables disponibles :</strong><br/>
                <code>{'{club}'}</code> = nom de la structure • <code>{'{prenom}'}</code> = prénom du membre • <code>{'{nom}'}</code> = nom du membre<br/>
                <code>{'{date}'}</code> = date de l'absence • <code>{'{creneau}'}</code> = nom du créneau
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveMessageAbsence} disabled={saving} style={{ marginTop: '12px' }}>💾 Sauvegarder</button>
          </div>
        </div>
      )}

      {/* ============ EXPORT ============ */}
      {activeSection === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Export tableau */}
          <div className="card">
            <h3>📊 Export du tableau de présence</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Envoyez le tableau complet par email, découpé par périodes scolaires, avec statistiques détaillées.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <a href="/exports" className="btn btn-primary">📤 Aller à la page Exports</a>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
              L'export par email avec découpage par périodes est disponible depuis l'application Android.
            </p>
          </div>

          {/* Périodes scolaires */}
          <div className="card">
            <h3>📅 Périodes scolaires</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Définissez les périodes pour le découpage des exports (Rentrée→Toussaint, Toussaint→Noël, etc.)</p>
            
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPeriodesEditor(!showPeriodesEditor)} style={{ marginTop: '12px' }}>
              📅 {showPeriodesEditor ? 'Masquer' : `Configurer les périodes (${periodes.length})`}
            </button>
            
            {showPeriodesEditor && (
              <div style={{ marginTop: '16px' }}>
                {/* Liste des périodes */}
                {periodes.length > 0 ? (
                  <div style={{ marginBottom: '16px' }}>
                    {periodes.map((p, idx) => (
                      <div key={p.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '8px' }}>
                        <span><strong>{p.nom}</strong> — {p.debut} → {p.fin}</span>
                        <button className="btn btn-danger btn-sm" onClick={() => deletePeriode(p.id)}>🗑️</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Aucune période configurée</p>
                )}
                
                {/* Ajouter une période */}
                <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>➕ Ajouter une période</h4>
                  <div className="form-group">
                    <label className="form-label">Nom de la période</label>
                    <input type="text" className="form-input" placeholder="Ex: Période 1 (Rentrée → Toussaint)" value={newPeriode.nom} onChange={(e) => setNewPeriode(p => ({ ...p, nom: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Début (JJ/MM)</label>
                      <input type="text" className="form-input" placeholder="01/09" value={newPeriode.debut} onChange={(e) => setNewPeriode(p => ({ ...p, debut: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fin (JJ/MM)</label>
                      <input type="text" className="form-input" placeholder="18/10" value={newPeriode.fin} onChange={(e) => setNewPeriode(p => ({ ...p, fin: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={addPeriode} disabled={saving}>➕ Ajouter la période</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ SAUVEGARDE ============ */}
      {activeSection === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sauvegarde */}
          <div className="card">
            <h3>💾 Sauvegarde de la saison</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Créez une sauvegarde complète de toutes les données (élèves, présences, cadres, forum, etc.)
            </p>
            <button className="btn btn-primary" onClick={createBackup} disabled={saving} style={{ marginTop: '12px' }}>
              {saving ? '⏳ En cours...' : '💾 Créer une sauvegarde maintenant'}
            </button>
            {backupStatus && (
              <div style={{ marginTop: '12px', padding: '12px', background: backupStatus.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : backupStatus.includes('❌') ? 'rgba(244, 67, 54, 0.1)' : 'rgba(33, 150, 243, 0.1)', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '13px' }}>{backupStatus}</p>
              </div>
            )}
            
            {/* Liste des sauvegardes */}
            {backups.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>📁 Sauvegardes disponibles ({backups.length})</h4>
                {backups.slice(0, 5).map((b, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', marginBottom: '8px', fontSize: '13px' }}>
                    📅 {b}
                  </div>
                ))}
                {backups.length > 5 && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>... et {backups.length - 5} autre(s)</p>}
              </div>
            )}
          </div>

          {/* Mode restauration */}
          <div className="card">
            <h3>🔄 Mode restauration</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Permet de modifier les présences et validations sur les dates passées (après restauration d'une sauvegarde ou pour corriger des oublis).
            </p>
            {isRestorationMode ? (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px', border: '1px solid var(--warning)' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--warning)' }}>🔄 Mode restauration ACTIF</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                  Les dates passées sont modifiables dans le tableau.<br/>
                  Pour terminer le mode et verrouiller à nouveau, utilisez l'app Android.
                </p>
              </div>
            ) : (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '13px', marginBottom: '8px' }}>
                  Pour restaurer une sauvegarde ou entrer en mode restauration, utilisez l'application Android :
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <li>Paramètres → Sauvegarde/Restauration → "🔄 Restaurer une sauvegarde"</li>
                  <li>Ou : Paramètres → Mode restauration → "Entrer en mode restauration"</li>
                </ul>
              </div>
            )}
          </div>

          {/* Diagnostic */}
          <div className="card">
            <h3>🔧 Diagnostic des données</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Vérifie l'intégrité des données : créneaux orphelins, élèves mal configurés, clés de présence invalides.
            </p>
            <button className="btn btn-secondary" onClick={runDiagnostic} disabled={diagnosticInProgress} style={{ marginTop: '12px' }}>
              {diagnosticInProgress ? '🔍 Analyse en cours...' : '🔧 Lancer le diagnostic'}
            </button>
            {diagnosticResult && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', maxHeight: '300px', overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{diagnosticResult}</pre>
              </div>
            )}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Pour appliquer les corrections automatiques, utilisez l'application Android.
            </p>
          </div>
        </div>
      )}

      {/* ============ SÉCURITÉ ============ */}
      {activeSection === 'securite' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Mot de passe SU */}
          <div className="card">
            <h3>🔐 Mot de passe Super-Utilisateur</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Protège l'accès aux paramètres et actions sensibles</p>
            {suConfig?.isFirstConnection && <div style={{ padding: '12px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px', border: '1px solid var(--danger)', marginTop: '8px' }}><p style={{ margin: 0, fontSize: '12px', color: 'var(--danger)' }}>⚠️ Changez le mot de passe par défaut !</p></div>}
            {!showChangeSuPassword ? (
              <button className="btn btn-secondary" onClick={() => setShowChangeSuPassword(true)} style={{ marginTop: '12px' }}>🔑 Changer le mot de passe</button>
            ) : (
              <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', marginTop: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type={showNewSuPassword ? 'text' : 'password'} className="form-input" value={newSuPassword} onChange={(e) => setNewSuPassword(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn btn-secondary" onClick={() => setShowNewSuPassword(!showNewSuPassword)}>{showNewSuPassword ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmer</label>
                  <input type={showNewSuPassword ? 'text' : 'password'} className="form-input" value={confirmSuPassword} onChange={(e) => setConfirmSuPassword(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={changeSuPassword} disabled={saving}>✓ Valider</button>
                  <button className="btn btn-secondary" onClick={() => { setShowChangeSuPassword(false); setNewSuPassword(''); setConfirmSuPassword('') }}>Annuler</button>
                </div>
              </div>
            )}
          </div>

          {/* Email notification */}
          <div className="card">
            <h3>📧 Email de notification</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Reçoit les alertes importantes (changements de mdp, résumés de restauration, etc.)</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Actuel : <strong style={{ color: currentNotifEmail ? 'var(--success)' : 'var(--danger)' }}>{currentNotifEmail || 'Non configuré'}</strong></p>
            <input type="email" className="form-input" placeholder="exemple@gmail.com" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} style={{ marginTop: '8px' }} />
            <button className="btn btn-primary" onClick={saveNotifEmail} disabled={saving || !notifEmail.trim() || notifEmail === currentNotifEmail} style={{ marginTop: '8px' }}>🔐 Modifier</button>
          </div>

          {/* Audit */}
          <div className="card">
            <h3>📋 Journal d'audit</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Historique de toutes les actions effectuées (ajouts, modifications, suppressions)</p>
            <a href="/audit" className="btn btn-secondary" style={{ marginTop: '8px' }}>📋 Voir le journal d'audit</a>
          </div>
        </div>
      )}

      {/* ============ DANGER ============ */}
      {activeSection === 'danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px', border: '1px solid var(--danger)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--danger)' }}>⚠️ Les actions ci-dessous sont sensibles ou irréversibles. Procédez avec précaution.</p>
          </div>
          <div className="card">
            <h3>🔌 Déconnexion de la structure</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Se déconnecter de cette structure. Les données restent intactes dans Firebase — vous pourrez vous reconnecter avec le code d'invitation.</p>
            <button className="btn btn-danger" onClick={() => setShowDisconnectConfirm(true)} style={{ marginTop: '8px' }}>🔌 Se déconnecter de {clubConfig.nom || 'cette structure'}</button>
          </div>
          <div className="card">
            <h3>🗑️ Suppression complète du club</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Supprime TOUTES les données de la structure dans Firebase. Cette action est définitive et irréversible.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>
              Pour des raisons de sécurité, la suppression complète nécessite l'application mobile Android avec authentification SU.
            </p>
          </div>
        </div>
      )}

      {/* Bouton verrouiller */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => { setSuAuthenticated(false); setSuPassword('') }}>🔒 Verrouiller les paramètres</button>
      </div>

      {/* Dialog déconnexion */}
      {showDisconnectConfirm && (
        <div className="modal-overlay" onClick={() => setShowDisconnectConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>🔌 Déconnexion de la structure ?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '12px 0' }}>
              Cela supprimera la configuration locale. Vous devrez ressaisir le code d'invitation pour vous reconnecter.<br/><br/>
              Les données du club restent intactes dans Firebase.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDisconnectConfirm(false)}>Annuler</button>
              <button className="btn btn-danger" onClick={handleDisconnect}>Confirmer la déconnexion</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className={`toast toast-${toast.type}`}>{toast.message}</div></div>}
    </Layout>
  )
}

export default ParametresPage
