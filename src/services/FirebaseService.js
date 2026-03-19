/**
 * Service Firebase
 * Gère la connexion dynamique aux bases Firebase des clients
 */

import { initializeApp, deleteApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'

let app = null
let db = null
let auth = null

export const FirebaseService = {
  /**
   * Initialise Firebase avec la config d'un client
   */
  async initialize(config) {
    // Fermer l'app existante si elle existe
    const apps = getApps()
    if (apps.length > 0) {
      await deleteApp(apps[0])
    }
    
    try {
      app = initializeApp(config)
      db = getFirestore(app)
      auth = getAuth(app)
      console.log('Firebase initialisé pour:', config.projectId)
      return true
    } catch (error) {
      console.error('Erreur initialisation Firebase:', error)
      throw error
    }
  },

  /**
   * Déconnecte Firebase
   */
  async disconnect() {
    if (auth) {
      await signOut(auth)
    }
    if (app) {
      await deleteApp(app)
    }
    app = null
    db = null
    auth = null
  },

  /**
   * Vérifie si Firebase est initialisé
   */
  isInitialized() {
    return db !== null
  },

  // ========================================
  // ÉLÈVES / MEMBRES
  // ========================================

  /**
   * Récupère tous les élèves
   */
  async getEleves() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'eleves'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getEleves:', error)
      return []
    }
  },

  /**
   * Ajoute un élève
   */
  async addEleve(eleve) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(collection(db, 'eleves'))
    await setDoc(docRef, { ...eleve, createdAt: new Date().toISOString() })
    return docRef.id
  },

  /**
   * Met à jour un élève
   */
  async updateEleve(id, data) {
    if (!db) throw new Error('Firebase non initialisé')
    await updateDoc(doc(db, 'eleves', id), data)
  },

  /**
   * Supprime un élève
   */
  async deleteEleve(id) {
    if (!db) throw new Error('Firebase non initialisé')
    await deleteDoc(doc(db, 'eleves', id))
  },

  // ========================================
  // CRÉNEAUX
  // ========================================

  /**
   * Récupère tous les créneaux
   */
  async getCreneaux() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'creneaux'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getCreneaux:', error)
      return []
    }
  },

  // ========================================
  // PRÉSENCES
  // ========================================

  /**
   * Récupère les présences pour une date
   */
  async getPresences(date) {
    if (!db) return []
    try {
      const q = query(collection(db, 'presences'), where('date', '==', date))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getPresences:', error)
      return []
    }
  },

  /**
   * Enregistre une présence
   */
  async setPresence(eleveId, date, creneauId, present) {
    if (!db) throw new Error('Firebase non initialisé')
    const docId = `${eleveId}_${date}_${creneauId}`
    await setDoc(doc(db, 'presences', docId), {
      eleveId,
      date,
      creneauId,
      present,
      updatedAt: new Date().toISOString()
    })
  },

  /**
   * Récupère toutes les présences (pour stats)
   */
  async getAllPresences() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'presences'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getAllPresences:', error)
      return []
    }
  },

  // ========================================
  // CADRES
  // ========================================

  /**
   * Récupère tous les cadres
   */
  async getCadres() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'cadres'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getCadres:', error)
      return []
    }
  }
}
