/**
 * Service de gestion des licences
 * Communique avec le serveur Render
 */

const SERVER_URL = 'https://managerpresence-server.onrender.com'

export const LicenceService = {
  /**
   * Vérifie la licence d'un projet
   */
  async verifierLicence(projectId) {
    try {
      const response = await fetch(`${SERVER_URL}/licence/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Erreur serveur')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Erreur vérification licence:', error)
      throw new Error('Impossible de vérifier la licence. Vérifiez votre connexion.')
    }
  },

  /**
   * Récupère la configuration Firebase d'un projet
   * (Pour l'instant, on utilise les configs stockées localement)
   */
  async getFirebaseConfig(projectId) {
    // TODO: Implémenter l'endpoint /config/{projectId} sur le serveur
    // Pour l'instant, retourne null (Firebase sera initialisé côté client)
    return null
  },

  /**
   * Active un code de licence
   */
  async activerCode(projectId, code) {
    try {
      const response = await fetch(`${SERVER_URL}/licence/${projectId}/code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur activation')
      }
      
      return data
    } catch (error) {
      console.error('Erreur activation code:', error)
      throw error
    }
  }
}
