import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PresencesPage from './pages/PresencesPage'
import MembresPage from './pages/MembresPage'
import FicheMembrePage from './pages/FicheMembrePage'
import CreneauxPage from './pages/CreneauxPage'
import DatesPage from './pages/DatesPage'
import CadresPage from './pages/CadresPage'
import ParametresPage from './pages/ParametresPage'
import ExportPage from './pages/ExportPage'
import ForumPage from './pages/ForumPage'
import AuditPage from './pages/AuditPage'

// Services
import { FirebaseService } from './services/FirebaseService'

// URL du serveur de licences
const SERVER_URL = 'https://managerpresence-server.onrender.com'

// Context pour l'état global
export const AppContext = createContext(null)

export function useApp() {
  return useContext(AppContext)
}

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [licence, setLicence] = useState(null)
  const [clubName, setClubName] = useState('')
  const [generatedBy, setGeneratedBy] = useState('')
  const [error, setError] = useState('')
  
  // 🏷️ Termes personnalisables selon le type de structure
  const [termes, setTermes] = useState({
    eleve: 'Membre',
    eleves: 'Membres',
    cadre: 'Cadre',
    cadres: 'Cadres',
    creneau: 'Créneau',
    creneaux: 'Créneaux',
    seance: 'Séance',
    seances: 'Séances',
    club: 'Structure',
    typeStructure: 'club'
  })

  // Vérifier si une session existe au démarrage
  useEffect(() => {
    // On ne restaure PAS la session automatiquement
    // Chaque connexion nécessite un nouveau code
    const savedSession = sessionStorage.getItem('mp_session')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        // Vérifier que la session n'a pas expiré (max 8h)
        if (session.expiresAt && Date.now() < session.expiresAt) {
          restaurerSession(session)
          return
        }
      } catch (e) {
        console.error('Erreur restauration session:', e)
      }
    }
    setIsLoading(false)
  }, [])

  // Restaurer une session existante
  const restaurerSession = async (session) => {
    try {
      // Réinitialiser Firebase avec la config sauvegardée
      if (session.firebaseConfig) {
        await FirebaseService.initialize(session.firebaseConfig)
        
        // 🏷️ Charger les termes personnalisés
        const termesData = await FirebaseService.getTermes()
        if (termesData) {
          setTermes(prev => ({ ...prev, ...termesData }))
        }
      }
      
      setProjectId(session.projectId || '')
      setClubName(session.clubName || '')
      setLicence(session.licence || null)
      setGeneratedBy(session.generatedBy || '')
      setIsConnected(true)
    } catch (err) {
      console.error('Erreur restauration:', err)
      sessionStorage.removeItem('mp_session')
    }
    setIsLoading(false)
  }

  // Fonction de connexion avec code temporaire
  const connecterAvecCode = async (code) => {
    setIsLoading(true)
    setError('')
    
    try {
      // 1. Vérifier le code auprès du serveur
      const response = await fetch(`${SERVER_URL}/pwa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Gérer les erreurs spécifiques
        if (response.status === 404) {
          setError('Code invalide. Vérifiez le code et réessayez.')
        } else if (response.status === 410) {
          setError('Code expiré. Demandez un nouveau code à votre administrateur.')
        } else if (response.status === 400) {
          setError('Ce code a déjà été utilisé.')
        } else {
          setError(data.error || 'Erreur de connexion')
        }
        setIsLoading(false)
        return false
      }
      
      // 2. Initialiser Firebase avec la config reçue
      if (data.firebaseConfig) {
        await FirebaseService.initialize(data.firebaseConfig)
        
        // 🏷️ Charger les termes personnalisés
        const termesData = await FirebaseService.getTermes()
        if (termesData) {
          setTermes(prev => ({ ...prev, ...termesData }))
        }
      } else {
        setError('Configuration Firebase manquante')
        setIsLoading(false)
        return false
      }
      
      // 3. Sauvegarder la session (expire après 8h)
      const session = {
        projectId: data.projectId,
        clubName: data.clubName,
        firebaseConfig: data.firebaseConfig,
        licence: data.licence,
        generatedBy: data.generatedBy,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000) // 8 heures
      }
      sessionStorage.setItem('mp_session', JSON.stringify(session))
      
      // 4. Mettre à jour l'état
      setProjectId(data.projectId)
      setClubName(data.clubName || data.projectId)
      setLicence(data.licence)
      setGeneratedBy(data.generatedBy)
      setIsConnected(true)
      setIsLoading(false)
      return true
      
    } catch (err) {
      console.error('Erreur connexion:', err)
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.')
      setIsLoading(false)
      return false
    }
  }

  // Fonction de déconnexion
  const deconnecter = () => {
    sessionStorage.removeItem('mp_session')
    FirebaseService.disconnect()
    setIsConnected(false)
    setProjectId('')
    setLicence(null)
    setClubName('')
    setGeneratedBy('')
  }

  // Valeur du contexte
  const contextValue = {
    isConnected,
    isLoading,
    projectId,
    licence,
    clubName,
    generatedBy,
    error,
    termes,
    connecterAvecCode,
    deconnecter,
    setError
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            isConnected ? <Navigate to="/" /> : <LoginPage />
          } />
          <Route path="/" element={
            isConnected ? <DashboardPage /> : <Navigate to="/login" />
          } />
          <Route path="/presences" element={
            isConnected ? <PresencesPage /> : <Navigate to="/login" />
          } />
          <Route path="/membres" element={
            isConnected ? <MembresPage /> : <Navigate to="/login" />
          } />
          <Route path="/membre/:id" element={
            isConnected ? <FicheMembrePage /> : <Navigate to="/login" />
          } />
          <Route path="/creneaux" element={
            isConnected ? <CreneauxPage /> : <Navigate to="/login" />
          } />
          <Route path="/dates" element={
            isConnected ? <DatesPage /> : <Navigate to="/login" />
          } />
          <Route path="/cadres" element={
            isConnected ? <CadresPage /> : <Navigate to="/login" />
          } />
          <Route path="/parametres" element={
            isConnected ? <ParametresPage /> : <Navigate to="/login" />
          } />
          <Route path="/exports" element={
            isConnected ? <ExportPage /> : <Navigate to="/login" />
          } />
          <Route path="/forum" element={
            isConnected ? <ForumPage /> : <Navigate to="/login" />
          } />
          <Route path="/audit" element={
            isConnected ? <AuditPage /> : <Navigate to="/login" />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}

// Écran de chargement
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">MP</div>
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    </div>
  )
}

export default App
