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
  },

  /**
   * Ajoute un cadre
   */
  async addCadre(cadre) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(collection(db, 'cadres'))
    await setDoc(docRef, { ...cadre, createdAt: new Date().toISOString() })
    return docRef.id
  },

  /**
   * Met à jour un cadre
   */
  async updateCadre(id, data) {
    if (!db) throw new Error('Firebase non initialisé')
    await updateDoc(doc(db, 'cadres', id), data)
  },

  /**
   * Supprime un cadre
   */
  async deleteCadre(id) {
    if (!db) throw new Error('Firebase non initialisé')
    await deleteDoc(doc(db, 'cadres', id))
  },

  // ========================================
  // CRÉNEAUX (CRUD complet)
  // ========================================

  /**
   * Ajoute un créneau
   */
  async addCreneau(creneau) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(collection(db, 'creneaux'))
    await setDoc(docRef, { ...creneau, createdAt: new Date().toISOString() })
    return docRef.id
  },

  /**
   * Met à jour un créneau
   */
  async updateCreneau(id, data) {
    if (!db) throw new Error('Firebase non initialisé')
    await updateDoc(doc(db, 'creneaux', id), data)
  },

  /**
   * Supprime un créneau
   */
  async deleteCreneau(id) {
    if (!db) throw new Error('Firebase non initialisé')
    await deleteDoc(doc(db, 'creneaux', id))
  },

  // ========================================
  // FORUM
  // ========================================

  /**
   * Récupère tous les messages du forum
   */
  async getForumMessages() {
    if (!db) return []
    try {
      const q = query(collection(db, 'forum'), orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getForumMessages:', error)
      // Fallback sans orderBy si l'index n'existe pas
      try {
        const snapshot = await getDocs(collection(db, 'forum'))
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return messages.sort((a, b) => {
          const dateA = a.date?.toDate?.() || new Date(a.date) || new Date(0)
          const dateB = b.date?.toDate?.() || new Date(b.date) || new Date(0)
          return dateB - dateA
        })
      } catch (e) {
        console.error('Erreur fallback:', e)
        return []
      }
    }
  },

  /**
   * Ajoute un message au forum
   */
  async addForumMessage(message) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(collection(db, 'forum'))
    await setDoc(docRef, { ...message, date: new Date() })
    return docRef.id
  },

  /**
   * Supprime un message du forum
   */
  async deleteForumMessage(id) {
    if (!db) throw new Error('Firebase non initialisé')
    await deleteDoc(doc(db, 'forum', id))
  },

  // ========================================
  // AUDIT LOG
  // ========================================

  /**
   * Récupère les logs d'audit
   */
  async getAuditLogs(limit = 100) {
    if (!db) return []
    try {
      const q = query(collection(db, 'audit_log'), orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.slice(0, limit).map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getAuditLogs:', error)
      // Fallback sans orderBy
      try {
        const snapshot = await getDocs(collection(db, 'audit_log'))
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return logs.sort((a, b) => {
          const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp) || new Date(0)
          const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp) || new Date(0)
          return dateB - dateA
        }).slice(0, limit)
      } catch (e) {
        console.error('Erreur fallback:', e)
        return []
      }
    }
  },

  /**
   * Ajoute une entrée dans le log d'audit
   */
  async addAuditLog(log) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(collection(db, 'audit_log'))
    await setDoc(docRef, { ...log, timestamp: new Date() })
    return docRef.id
  }
}
