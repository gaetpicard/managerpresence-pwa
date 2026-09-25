/**
 * Service Firebase
 * Gère la connexion dynamique aux bases Firebase des clients
 */

import { initializeApp, deleteApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore'
import { getAuth, signInAnonymously, signOut } from 'firebase/auth'

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

      // ⚠️ Indispensable : les règles Firestore refusent tout accès non
      // authentifié (403 PERMISSION_DENIED). Sans cette connexion, chaque
      // lecture renvoie une liste vide et la PWA paraît n'avoir aucune donnée.
      await signInAnonymously(auth)

      console.log('Firebase initialisé et authentifié pour:', config.projectId)
      return true
    } catch (error) {
      console.error('Erreur initialisation Firebase:', error)
      db = null
      auth = null
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
  // ⚠️ L'application stocke les contacts dans `telephones` : une LISTE d'objets
  // { numero, libelle, actifSMS }. Les champs `telephone` / `telephone2` ne sont
  // que des raccourcis calculés, jamais enregistrés. Écrire une simple chaîne
  // ici serait ignoré par l'application, et les SMS d'absence partiraient à
  // l'ancien numéro. De même, la catégorie s'appelle `libelle`, pas `groupe`.

  /** Ajoute les raccourcis `telephone` / `groupe` attendus par l'interface. */
  _normaliserEleve(id, data) {
    const contacts = Array.isArray(data.telephones) ? data.telephones : []
    const actifs = contacts.filter(c => c && c.numero && c.actifSMS !== false)
    const premier = actifs[0] || contacts.find(c => c && c.numero) || null

    return {
      ...data,
      id,
      telephones: contacts,
      telephone: premier ? premier.numero : (data.telephone || ''),
      groupe: data.libelle || data.groupe || '',
      libelle: data.libelle || data.groupe || ''
    }
  },

  /** Repasse au format de l'application avant écriture. */
  _preparerEleve(data) {
    const sortie = { ...data }

    // La catégorie : l'application ne lit que `libelle`
    sortie.libelle = data.libelle || data.groupe || ''
    delete sortie.groupe

    // Le téléphone saisi met à jour le premier contact, sans perdre les autres
    const contacts = Array.isArray(data.telephones) ? [...data.telephones] : []
    const saisi = (data.telephone || '').trim()
    if (saisi) {
      const i = contacts.findIndex(c => c && c.actifSMS !== false)
      if (i >= 0) {
        contacts[i] = { ...contacts[i], numero: saisi }
      } else {
        contacts.unshift({ numero: saisi, libelle: '', actifSMS: true })
      }
    }
    sortie.telephones = contacts.map(c => ({
      numero: c.numero || '',
      libelle: c.libelle || '',
      actifSMS: c.actifSMS !== false
    })).filter(c => c.numero)

    // Raccourcis et identifiant : jamais enregistrés dans le document
    delete sortie.telephone
    delete sortie.tel
    delete sortie.id
    return sortie
  },

  async getEleves() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'eleves'))
      return snapshot.docs.map(d => this._normaliserEleve(d.id, d.data()))
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
    await setDoc(docRef, {
      prenom: '', nom: '', email: '', creneauxIds: [], niveauIds: [],
      ...this._preparerEleve(eleve)
    })
    return docRef.id
  },

  /**
   * Met à jour un élève
   */
  async updateEleve(id, data) {
    if (!db) throw new Error('Firebase non initialisé')
    await updateDoc(doc(db, 'eleves', id), this._preparerEleve(data))
  },

  /**
   * Supprime un élève
   */
  async deleteEleve(id) {
    if (!db) throw new Error('Firebase non initialisé')
    const avant = await getDoc(doc(db, 'eleves', id))
    const nom = avant.exists()
      ? `${avant.data().nom || ''} ${avant.data().prenom || ''}`.trim()
      : id
    await deleteDoc(doc(db, 'eleves', id))
    await this.addAuditLog('DELETE_ELEVE', nom, 'Supprimé depuis la PWA')
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

  // ⚠️ Il n'existe PAS de collection "presences".
  // L'application Android stocke les pointages dans le champ `presences` du
  // document `seances`, sous la clé "<eleveId>_<creneauId>". Tout doit passer
  // par là, sans quoi les deux applications ne voient pas les mêmes données.

  /**
   * Pointages d'une date, mis à plat : [{ eleveId, creneauId, date, statut }]
   */
  async getPresences(date) {
    const seances = await this.getSeances()
    const seance = seances.find(s => s.date === date)
    return this._aplatirPresences(seance)
  },

  /**
   * Tous les pointages de la saison, mis à plat (pour les stats et les exports)
   */
  async getAllPresences() {
    const seances = await this.getSeances()
    return seances.flatMap(seance => this._aplatirPresences(seance))
  },

  /** Transforme la map `presences` d'une séance en liste exploitable. */
  _aplatirPresences(seance) {
    if (!seance || !seance.presences) return []
    return Object.entries(seance.presences).map(([cle, statut]) => {
      const separateur = cle.lastIndexOf('_')
      return {
        id: `${seance.id}_${cle}`,
        eleveId: separateur === -1 ? cle : cle.slice(0, separateur),
        creneauId: separateur === -1 ? '' : cle.slice(separateur + 1),
        date: seance.date,
        statut,                          // PRESENT | ABSENT | EXCUSE
        present: statut === 'PRESENT'
      }
    })
  },

  /**
   * Enregistre un pointage dans la séance du jour, comme le fait l'application.
   * `statut` : 'PRESENT' | 'ABSENT' | 'EXCUSE' (VIDE efface le pointage).
   */
  async setPresence(eleveId, date, creneauId, statut) {
    if (!db) throw new Error('Firebase non initialisé')

    const seances = await this.getSeances()
    const seance = seances.find(s => s.date === date)
    if (!seance) throw new Error(`Aucune séance au ${date}`)

    const presences = { ...(seance.presences || {}) }
    const cle = `${eleveId}_${creneauId}`
    if (!statut || statut === 'VIDE') {
      delete presences[cle]
    } else {
      presences[cle] = statut
    }

    await updateDoc(doc(db, 'seances', seance.id), { presences })
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
    // L'application attend aussi password / authEmail / authUid
    await setDoc(docRef, {
      nom: '', role: 'UTILISATEUR', password: '', authEmail: '', authUid: '',
      ...cadre
    })
    await this.addAuditLog('CREATE_CADRE', cadre.nom || docRef.id, 'Créé depuis la PWA')
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
    await this.addAuditLog('DELETE_CADRE', id, 'Supprimé depuis la PWA')
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
  // ⚠️ L'application Android date les messages avec un champ `timestamp`
  // (millisecondes). Trier sur `date` écartait silencieusement TOUS ses
  // messages : une requête orderBy ignore les documents sans ce champ.
  async getForumMessages() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'forum'))
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      return messages.sort((a, b) => this._instantMessage(b) - this._instantMessage(a))
    } catch (error) {
      console.error('Erreur getForumMessages:', error)
      return []
    }
  },

  /** Instant d'un message, quel que soit le champ utilisé pour le dater. */
  _instantMessage(message) {
    if (typeof message.timestamp === 'number') return message.timestamp
    const brut = message.timestamp || message.date
    if (!brut) return 0
    const d = brut?.toDate?.() || new Date(brut)
    const t = d.getTime()
    return Number.isNaN(t) ? 0 : t
  },

  /**
   * Ajoute un message au forum, au format attendu par l'application.
   */
  async addForumMessage(message) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(collection(db, 'forum'))
    await setDoc(docRef, {
      type: 'general',
      eleveId: '',
      titre: '',
      contenu: '',
      parentId: '',
      lu: [],
      traite: false,
      editedBy: '',
      ...message,
      timestamp: Date.now()
    })
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
  // Nom affiché dans le journal, renseigné à la connexion par App.jsx
  _auteurCourant: 'PWA',

  setAuteurAudit(nom) {
    this._auteurCourant = nom || 'PWA'
  },

  /**
   * Journalise une action, au format lu par l'application
   * (timestamp, action, auteurNom, auteurUid, cible, details).
   * Ne fait jamais échouer l'action métier : on trace, on ne bloque pas.
   */
  async addAuditLog(action, cible = '', details = '') {
    if (!db) return null
    try {
      const docRef = doc(collection(db, 'audit_log'))
      await setDoc(docRef, {
        timestamp: new Date(),
        action,
        auteurNom: `${this._auteurCourant} (PWA)`,
        auteurUid: 'pwa',
        cible,
        details
      })
      return docRef.id
    } catch (error) {
      console.error('Erreur addAuditLog:', error)
      return null
    }
  },

  /**
   * Récupère les termes personnalisés de la structure
   * Stockés dans config/termes
   */
  async getTermes() {
    if (!db) return null
    try {
      const docRef = doc(db, 'config', 'termes')
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return docSnap.data()
      }
      return null // Pas de config, on utilisera les défauts
    } catch (error) {
      console.error('Erreur getTermes:', error)
      return null
    }
  },

  /**
   * Récupère la config du club
   * Stockée dans config/club
   */
  async getClubConfig() {
    if (!db) return null
    try {
      const docRef = doc(db, 'config', 'club')
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        return docSnap.data()
      }
      return null
    } catch (error) {
      console.error('Erreur getClubConfig:', error)
      return null
    }
  },

  // ========================================
  // SÉANCES (DATES)
  // ========================================

  /**
   * Récupère toutes les séances
   */
  async getSeances() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'seances'))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Erreur getSeances:', error)
      return []
    }
  },

  /**
   * Ajoute une séance
   */
  async addSeance(seance) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(collection(db, 'seances'))
    await setDoc(docRef, seance)
    return docRef.id
  },

  /**
   * Met à jour une séance
   */
  async updateSeance(id, data) {
    if (!db) throw new Error('Firebase non initialisé')
    await updateDoc(doc(db, 'seances', id), data)
  },

  /**
   * Supprime une séance
   */
  async deleteSeance(id) {
    if (!db) throw new Error('Firebase non initialisé')
    const avant = await getDoc(doc(db, 'seances', id))
    const date = avant.exists() ? (avant.data().date || id) : id
    await deleteDoc(doc(db, 'seances', id))
    await this.addAuditLog('DELETE_SEANCE', date, 'Supprimée depuis la PWA')
  },

  /**
   * Génère des séances automatiquement pour une période
   * @param startDate Date de début (YYYY-MM-DD)
   * @param endDate Date de fin (YYYY-MM-DD)
   * @param joursSemaine Jours de la semaine (0=dimanche, 1=lundi, etc.)
   * @param creneauxIds IDs des créneaux à activer
   */
  async generateSeances(startDate, endDate, joursSemaine, creneauxIds) {
    if (!db) throw new Error('Firebase non initialisé')
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const seancesCreees = []
    
    // Récupérer les séances existantes pour éviter les doublons
    const existingSeances = await this.getSeances()
    const existingDates = new Set(existingSeances.map(s => s.date))
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (joursSemaine.includes(d.getDay())) {
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
        
        if (!existingDates.has(dateStr)) {
          const seance = {
            date: dateStr,
            creneauxActifsIds: creneauxIds,
            creneauxValides: [],
            heureAppelEffectue: {},
            cadreNom: null,
            presences: {},
            cadreValidateur: {}
          }
          await this.addSeance(seance)
          seancesCreees.push(dateStr)
        }
      }
    }
    
    return seancesCreees
  },

  // ========================================
  // SUPER USER & CONFIGURATION
  // ========================================

  /**
   * Récupère la configuration Super User
   */
  async getSuperUserConfig() {
    if (!db) return null
    try {
      const docRef = doc(db, 'config', 'super_user')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data() : null
    } catch (error) {
      console.error('Erreur getSuperUserConfig:', error)
      return null
    }
  },

  /**
   * Met à jour la configuration Super User
   */
  async updateSuperUserConfig(data) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'super_user')
    await setDoc(docRef, data, { merge: true })
  },

  /**
   * Met à jour les termes
   */
  async updateTermes(termes) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'termes')
    await setDoc(docRef, termes)
  },

  /**
   * Récupère la configuration email
   */
  async getEmailConfig() {
    if (!db) return null
    try {
      const docRef = doc(db, 'config', 'email')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data() : null
    } catch (error) {
      console.error('Erreur getEmailConfig:', error)
      return null
    }
  },

  /**
   * Met à jour la configuration email
   */
  async updateEmailConfig(config) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'email')
    await setDoc(docRef, config)
  },

  /**
   * Récupère le logo
   */
  async getLogo() {
    if (!db) return null
    try {
      const docRef = doc(db, 'config', 'logo')
      const docSnap = await getDoc(docRef)
      if (docSnap.exists() && docSnap.data().data) {
        return `data:image/png;base64,${docSnap.data().data}`
      }
      return null
    } catch (error) {
      console.error('Erreur getLogo:', error)
      return null
    }
  },

  /**
   * Met à jour le logo
   */
  async updateLogo(base64Data) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'logo')
    await setDoc(docRef, { data: base64Data })
  },

  /**
   * Supprime le logo
   */
  async deleteLogo() {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'logo')
    await deleteDoc(docRef)
  },

  /**
   * Récupère la config backend
   */
  async getBackendConfig() {
    if (!db) return null
    try {
      const docRef = doc(db, 'config', 'backend')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data() : null
    } catch (error) {
      console.error('Erreur getBackendConfig:', error)
      return null
    }
  },

  /**
   * Met à jour la config backend
   */
  async updateBackendConfig(config) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'backend')
    await setDoc(docRef, config, { merge: true })
  },

  /**
   * Récupère l'email de notification
   */
  async getNotificationEmail() {
    if (!db) return ''
    try {
      const docRef = doc(db, 'config', 'super_user')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? (docSnap.data().notificationEmail || '') : ''
    } catch (error) {
      console.error('Erreur getNotificationEmail:', error)
      return ''
    }
  },

  /**
   * Met à jour l'email de notification
   */
  async updateNotificationEmail(email) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'super_user')
    await setDoc(docRef, { notificationEmail: email }, { merge: true })
  },

  /**
   * Récupère la config SMS
   */
  async getSmsConfig() {
    if (!db) return { enabled: false }
    try {
      const docRef = doc(db, 'config', 'sms_settings')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data() : { enabled: false }
    } catch (error) {
      console.error('Erreur getSmsConfig:', error)
      return { enabled: false }
    }
  },

  /**
   * Récupère les périodes scolaires
   */
  // ⚠️ L'application utilise la COLLECTION `periodes_scolaires`, avec les champs
  // `dateDebut` / `dateFin` (et non un document config/periodes avec debut/fin).
  async getPeriodes() {
    if (!db) return []
    try {
      const snapshot = await getDocs(collection(db, 'periodes_scolaires'))
      return snapshot.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          nom: data.nom || '',
          debut: data.dateDebut || '',
          fin: data.dateFin || ''
        }
      })
    } catch (error) {
      console.error('Erreur getPeriodes:', error)
      return []
    }
  },

  /**
   * Met à jour le nom du club
   */
  async updateClubName(nom) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'club')
    await setDoc(docRef, { nom }, { merge: true })
  },

  /**
   * Met à jour les périodes scolaires
   */
  async updatePeriodes(periodes) {
    if (!db) throw new Error('Firebase non initialisé')

    // La collection fait foi : on retire ce qui a disparu, on réécrit le reste.
    const existants = await getDocs(collection(db, 'periodes_scolaires'))
    const gardes = new Set(periodes.map(p => p.id).filter(Boolean))

    await Promise.all(
      existants.docs
        .filter(d => !gardes.has(d.id))
        .map(d => deleteDoc(doc(db, 'periodes_scolaires', d.id)))
    )

    await Promise.all(periodes.map(p => {
      const ref = p.id
        ? doc(db, 'periodes_scolaires', p.id)
        : doc(collection(db, 'periodes_scolaires'))
      return setDoc(ref, {
        nom: p.nom || '',
        dateDebut: p.debut || '',
        dateFin: p.fin || ''
      })
    }))
  },

  /**
   * Récupère le message d'absence personnalisé
   */
  async getMessageAbsence() {
    if (!db) return null
    try {
      const docRef = doc(db, 'config', 'messages')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? (docSnap.data().absenceTemplate || null) : null
    } catch (error) {
      console.error('Erreur getMessageAbsence:', error)
      return null
    }
  },

  /**
   * Met à jour le message d'absence
   */
  async updateMessageAbsence(template) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'messages')
    await setDoc(docRef, { absenceTemplate: template }, { merge: true })
  },

  /**
   * Récupère la config de rappel d'appel
   */
  async getRappelConfig() {
    if (!db) return true
    try {
      const docRef = doc(db, 'config', 'rappel')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? (docSnap.data().enabled !== false) : true
    } catch (error) {
      console.error('Erreur getRappelConfig:', error)
      return true
    }
  },

  /**
   * Met à jour la config de rappel
   */
  async updateRappelConfig(enabled) {
    if (!db) throw new Error('Firebase non initialisé')
    const docRef = doc(db, 'config', 'rappel')
    await setDoc(docRef, { enabled })
  },

  /**
   * Récupère la liste des sauvegardes
   */
  async getBackups() {
    if (!db) return []
    try {
      const docRef = doc(db, 'config', 'backups')
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? (docSnap.data().list || []) : []
    } catch (error) {
      console.error('Erreur getBackups:', error)
      return []
    }
  },

  /**
   * Crée une sauvegarde complète
   */
  async createBackup() {
    if (!db) throw new Error('Firebase non initialisé')
    
    const now = new Date()
    const backupName = `backup_${now.toISOString().replace(/[:.]/g, '-')}`
    
    try {
      // Récupérer toutes les données
      const [eleves, cadres, creneaux, seances, forum] = await Promise.all([
        this.getEleves(),
        this.getCadres(),
        this.getCreneaux(),
        this.getSeances(),
        this.getForumMessages()
      ])
      
      // Créer le document de backup
      const backupData = {
        createdAt: now.toISOString(),
        eleves: eleves.reduce((acc, e) => { acc[e.id] = e; return acc }, {}),
        cadres: cadres.reduce((acc, c) => { acc[c.id] = c; return acc }, {}),
        creneaux: creneaux.reduce((acc, c) => { acc[c.id] = c; return acc }, {}),
        seances: seances.reduce((acc, s) => { acc[s.id] = s; return acc }, {}),
        forum: forum.reduce((acc, f) => { acc[f.id] = f; return acc }, {})
      }
      
      const backupRef = doc(db, 'backups', backupName)
      await setDoc(backupRef, backupData)
      
      // Mettre à jour la liste des backups
      const listRef = doc(db, 'config', 'backups')
      const listSnap = await getDoc(listRef)
      const existingList = listSnap.exists() ? (listSnap.data().list || []) : []
      await setDoc(listRef, { list: [backupName, ...existingList].slice(0, 20) })
      
      return backupName
    } catch (error) {
      console.error('Erreur createBackup:', error)
      throw error
    }
  },

  /**
   * Lance un diagnostic des données
   */
  async runDiagnostic() {
    if (!db) throw new Error('Firebase non initialisé')
    
    try {
      const [eleves, creneaux, seances] = await Promise.all([
        this.getEleves(),
        this.getCreneaux(),
        this.getSeances()
      ])
      
      const validCreneauIds = new Set(creneaux.map(c => c.id))
      const validEleveIds = new Set(eleves.map(e => e.id))
      
      let report = []
      report.push('📊 Diagnostic des données')
      report.push('========================')
      report.push(`Créneaux existants : ${creneaux.length}`)
      report.push(`Élèves : ${eleves.length}`)
      report.push(`Séances : ${seances.length}`)
      report.push('')
      
      let issueCount = 0
      
      // Vérifier les creneauxIds des élèves
      report.push('🔍 Vérification des élèves...')
      eleves.forEach(eleve => {
        const orphanIds = (eleve.creneauxIds || []).filter(id => !validCreneauIds.has(id))
        if (orphanIds.length > 0) {
          issueCount++
          report.push(`  ❌ ${eleve.prenom} ${eleve.nom} : ${orphanIds.length} ID(s) orphelin(s)`)
        }
      })
      
      // Vérifier les présences
      report.push('')
      report.push('🔍 Vérification des présences...')
      let orphanPresences = 0
      seances.forEach(seance => {
        Object.keys(seance.presences || {}).forEach(key => {
          const parts = key.split('_')
          if (parts.length === 2) {
            if (!validEleveIds.has(parts[0])) orphanPresences++
            if (!validCreneauIds.has(parts[1])) orphanPresences++
          }
        })
      })
      
      if (orphanPresences > 0) {
        report.push(`  ⚠️ ${orphanPresences} clé(s) de présence avec ID invalide`)
      } else {
        report.push('  ✅ Toutes les clés de présence sont valides')
      }
      
      report.push('')
      if (issueCount === 0 && orphanPresences === 0) {
        report.push('✅ Aucun problème détecté !')
      } else {
        report.push(`⚠️ ${issueCount + (orphanPresences > 0 ? 1 : 0)} problème(s) détecté(s)`)
        report.push('Pour appliquer les corrections, utilisez l\'app Android.')
      }
      
      return report.join('\n')
    } catch (error) {
      console.error('Erreur diagnostic:', error)
      throw error
    }
  }
}
