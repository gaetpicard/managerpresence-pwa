import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PresencesPage from './pages/PresencesPage'
import MembresPage from './pages/MembresPage'
import CreneauxPage from './pages/CreneauxPage'
import StatistiquesPage from './pages/StatistiquesPage'
import SettingsPage from './pages/SettingsPage'

// Services
import { LicenceService } from './services/LicenceService'
import { FirebaseService } from './services/FirebaseService'

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
  const [error, setError] = useState('')

  // Vérifier si une session existe au démarrage
  useEffect(() => {
    const savedProjectId = localStorage.getItem('mp_projectId')
    if (savedProjectId) {
      connecter(savedProjectId)
    } else {
      setIsLoading(false)
    }
  }, [])

  // Fonction de connexion
  const connecter = async (pid) => {
    setIsLoading(true)
    setError('')
    
    try {
      // 1. Vérifier la licence
      const licenceData = await LicenceService.verifierLicence(pid)
      
      if (!licenceData.actif) {
        setError('Licence expirée. Contactez le support.')
        setIsLoading(false)
        return false
      }
      
      if (licenceData.plan !== 'premium' && licenceData.plan !== 'trial') {
        setError('L\'accès PC nécessite une licence Premium.')
        setIsLoading(false)
        return false
      }
      
      // 2. Initialiser Firebase avec la config du client
      const firebaseConfig = await LicenceService.getFirebaseConfig(pid)
      if (firebaseConfig) {
        await FirebaseService.initialize(firebaseConfig)
      }
      
      // 3. Sauvegarder et mettre à jour l'état
      localStorage.setItem('mp_projectId', pid)
      setProjectId(pid)
      setLicence(licenceData)
      setClubName(licenceData.nomStructure || pid)
      setIsConnected(true)
      setIsLoading(false)
      return true
      
    } catch (err) {
      console.error('Erreur connexion:', err)
      setError(err.message || 'Erreur de connexion')
      setIsLoading(false)
      return false
    }
  }

  // Fonction de déconnexion
  const deconnecter = () => {
    localStorage.removeItem('mp_projectId')
    FirebaseService.disconnect()
    setIsConnected(false)
    setProjectId('')
    setLicence(null)
    setClubName('')
  }

  // Valeur du contexte
  const contextValue = {
    isConnected,
    isLoading,
    projectId,
    licence,
    clubName,
    error,
    connecter,
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
          <Route path="/creneaux" element={
            isConnected ? <CreneauxPage /> : <Navigate to="/login" />
          } />
          <Route path="/statistiques" element={
            isConnected ? <StatistiquesPage /> : <Navigate to="/login" />
          } />
          <Route path="/settings" element={
            isConnected ? <SettingsPage /> : <Navigate to="/login" />
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
