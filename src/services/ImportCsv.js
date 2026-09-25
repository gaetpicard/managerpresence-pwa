/**
 * Import CSV de membres — reprend la logique de l'application Android :
 * détection automatique des colonnes, validation, repérage des doublons.
 *
 * Les listes de mots-clés sont volontairement identiques à celles de
 * MainActivity.kt (PRENOM_KEYS, NOM_KEYS, …) pour qu'un même fichier soit
 * reconnu de la même façon des deux côtés.
 */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()

const CLES = {
  prenom: ['prenom', 'firstname', 'first', 'givenname', 'prenomnom', 'prenom1', 'pren', 'forename', 'fname'],
  nom: ['nom', 'lastname', 'last', 'familyname', 'surname', 'nomfamille', 'name', 'lname', 'nomprenom'],
  email: ['email', 'mail', 'courriel', 'emailaddress', 'adressemail', 'adresseemail', 'eml', 'mel'],
  telephone: ['telephone', 'tel', 'phone', 'mobile', 'portable', 'gsm', 'cellphone', 'telmobile',
    'telportable', 'phonenumber', 'telperso', 'tel1', 'telephone1', 'numerodeteleph', 'numerotelephone'],
  telephone2: ['telephone2', 'tel2', 'phone2', 'mobile2', 'portable2', 'autretel', 'autrteleph',
    'autrenumero', 'telparent', 'telephonepar'],
  libelle: ['libelle', 'label', 'categorie', 'groupe', 'section', 'titre', 'grade', 'niveau', 'club',
    'equipe', 'classe', 'division', 'tag', 'type', 'qualite', 'fonction', 'poste', 'role'],
  licence: ['licence', 'licencenumero', 'numlicence', 'numerolicence', 'nolicence', 'licenceno',
    'licensenumber', 'numadherent', 'numeroadherent', 'noadherent', 'matricule', 'numeromembre',
    'memberid', 'adherent', 'numlicenc']
}

/** Sépare une ligne CSV en respectant les guillemets et les "" échappés. */
function decouperLigne(ligne, separateur) {
  const champs = []
  let courant = ''
  let entreGuillemets = false

  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (c === '"') {
      if (entreGuillemets && ligne[i + 1] === '"') { courant += '"'; i++ }
      else entreGuillemets = !entreGuillemets
    } else if (c === separateur && !entreGuillemets) {
      champs.push(courant.trim())
      courant = ''
    } else {
      courant += c
    }
  }
  champs.push(courant.trim())
  return champs
}

/** Le séparateur le plus probable, déduit de la ligne d'en-tête. */
function detecterSeparateur(enTete) {
  const candidats = [';', ',', '\t', '|']
  return candidats.reduce((meilleur, sep) =>
    (enTete.split(sep).length > enTete.split(meilleur).length ? sep : meilleur), ';')
}

/** Associe chaque champ attendu à un numéro de colonne (-1 si absent). */
export function detecterColonnes(enTetes) {
  const normalises = enTetes.map(norm)

  // Google Contacts exporte « E-mail 1 - Label » PUIS « E-mail 1 - Value »
  // (idem téléphones). Prendre la première colonne contenant « email » donnait
  // la colonne Label, qui vaut « * » : on importait « * » comme adresse.
  // On écarte donc les colonnes de libellé et on privilégie « …Value ».
  const trouver = (cles, ecarterLabel = true) => {
    const candidats = normalises.reduce((acc, h, i) => {
      if (!h) return acc
      if (ecarterLabel && h.endsWith('label')) return acc
      // « Phonetic First Name » contient « phone » : ce n'est pas un téléphone
      if (h.includes('phonetic')) return acc
      if (cles.includes(h) || cles.some(k => h.includes(k))) acc.push(i)
      return acc
    }, [])

    const exact = candidats.find(i => cles.includes(normalises[i]))
    if (exact !== undefined) return exact
    const valeur = candidats.find(i => normalises[i].includes('value'))
    if (valeur !== undefined) return valeur
    return candidats.length ? candidats[0] : -1
  }

  return Object.fromEntries(
    Object.entries(CLES).map(([champ, cles]) => [champ, trouver(cles, champ !== 'libelle')])
  )
}

const LIBELLES_CHAMPS = {
  email: 'e-mail',
  telephones: 'téléphone',
  libelle: 'catégorie',
  numero_licence: 'n° de licence'
}

/**
 * Compare une ligne du fichier à la fiche déjà enregistrée.
 * - complements : la base est vide, le fichier apporte l'information
 * - differences : les deux sont renseignés et ne disent pas la même chose
 */
function comparerAvecExistant(existant, apport) {
  const complements = []
  const differences = []

  const ajouter = (champ, ancien, nouveau) => {
    if (!nouveau) return
    if (!ancien) complements.push({ champ, libelle: LIBELLES_CHAMPS[champ], nouveau })
    else if (String(ancien).trim() !== String(nouveau).trim()) {
      differences.push({ champ, libelle: LIBELLES_CHAMPS[champ], ancien, nouveau })
    }
  }

  ajouter('email', existant.email, apport.email)
  ajouter('libelle', existant.libelle || existant.groupe, apport.libelle)
  ajouter('numero_licence', existant.numero_licence, apport.numero_licence)

  // Téléphones : on compare les numéros, sans tenir compte de l'ordre
  const actuels = (Array.isArray(existant.telephones) ? existant.telephones : [])
    .map(t => t && t.numero).filter(Boolean)
  const nouveaux = apport.telephones.map(t => t.numero).filter(Boolean)
  const inedits = nouveaux.filter(n => !actuels.includes(n))
  if (inedits.length) {
    if (!actuels.length) {
      complements.push({ champ: 'telephones', libelle: LIBELLES_CHAMPS.telephones, nouveau: inedits.join(' / ') })
    } else {
      // Un numéro de plus ne remplace rien : c'est un ajout, donc un complément
      complements.push({ champ: 'telephones', libelle: 'téléphone supplémentaire', nouveau: inedits.join(' / ') })
    }
  }

  return { complements, differences }
}

/**
 * Fiche mise à jour : les compléments sont appliqués, les numéros ajoutés à
 * la suite des existants. Les valeurs divergentes ne sont reprises que si
 * elles figurent dans `champsForces`.
 */
export function fusionner(existant, ligne, champsForces = []) {
  const sortie = { ...existant }

  ligne.complements.forEach(c => {
    if (c.champ === 'telephones') return          // traité plus bas
    sortie[c.champ] = c.nouveau
  })

  ligne.differences.forEach(d => {
    if (champsForces.includes(d.champ)) sortie[d.champ] = d.nouveau
  })

  const actuels = Array.isArray(existant.telephones) ? [...existant.telephones] : []
  const connus = actuels.map(t => t && t.numero).filter(Boolean)
  ligne.telephones.forEach(t => {
    if (t.numero && !connus.includes(t.numero)) {
      actuels.push(t)
      connus.push(t.numero)
    }
  })
  sortie.telephones = actuels

  return sortie
}

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Ne garde que les chiffres et le + initial. */
export function nettoyerTelephone(brut) {
  const t = String(brut || '').replace(/[^0-9+]/g, '')
  if (!t) return ''
  if (t.startsWith('+33')) return '0' + t.slice(3)
  if (t.startsWith('0033')) return '0' + t.slice(4)
  return t
}

/**
 * Analyse le contenu d'un fichier CSV.
 * Retourne { enTetes, colonnes, lignes, erreur } — `lignes` porte pour chaque
 * membre ses données, son état (nouveau / doublon) et ses anomalies.
 */
export function analyserCsv(contenu, elevesExistants = []) {
  const texte = String(contenu || '').replace(/^﻿/, '') // BOM Excel
  const lignesBrutes = texte.split(/\r\n|\n|\r/).filter(l => l.trim() !== '')

  if (lignesBrutes.length < 2) {
    return { enTetes: [], colonnes: {}, lignes: [], erreur: 'Le fichier doit contenir un en-tête et au moins une ligne.' }
  }

  const separateur = detecterSeparateur(lignesBrutes[0])
  const enTetes = decouperLigne(lignesBrutes[0], separateur)
  const colonnes = detecterColonnes(enTetes)

  if (colonnes.nom === -1 && colonnes.prenom === -1) {
    return {
      enTetes, colonnes, lignes: [],
      erreur: "Aucune colonne « nom » ou « prénom » reconnue. Vérifiez la première ligne du fichier."
    }
  }

  // Repères de doublons : nom+prénom, et e-mail
  const cleNom = (nom, prenom) => `${norm(nom)}|${norm(prenom)}`
  const nomsExistants = new Map(elevesExistants.map(e => [cleNom(e.nom, e.prenom), e]))
  const emailsExistants = new Map(
    elevesExistants.filter(e => e.email).map(e => [norm(e.email), e])
  )
  const vusDansFichier = new Set()

  const valeur = (champs, index) => (index >= 0 ? (champs[index] || '').trim() : '')

  const lignes = lignesBrutes.slice(1).map((brute, i) => {
    const champs = decouperLigne(brute, separateur)
    const nom = valeur(champs, colonnes.nom)
    const prenom = valeur(champs, colonnes.prenom)
    const email = valeur(champs, colonnes.email)
    const tel = nettoyerTelephone(valeur(champs, colonnes.telephone))
    const tel2 = nettoyerTelephone(valeur(champs, colonnes.telephone2))

    const anomalies = []
    if (!nom && !prenom) anomalies.push('Nom et prénom vides')
    if (email && !EMAIL_VALIDE.test(email)) anomalies.push('E-mail invalide')
    if (tel && tel.replace(/\D/g, '').length < 9) anomalies.push('Téléphone trop court')

    const cle = cleNom(nom, prenom)
    let doublon = null
    let existant = null
    if (nomsExistants.has(cle)) {
      doublon = 'déjà dans la base'
      existant = nomsExistants.get(cle)
    } else if (email && emailsExistants.has(norm(email))) {
      doublon = 'e-mail déjà utilisé'
      existant = emailsExistants.get(norm(email))
    } else if (vusDansFichier.has(cle)) {
      doublon = 'en double dans le fichier'
    }
    vusDansFichier.add(cle)

    const telephones = []
    if (tel) telephones.push({ numero: tel, libelle: '', actifSMS: true })
    if (tel2) telephones.push({ numero: tel2, libelle: '', actifSMS: true })

    const libelle = valeur(champs, colonnes.libelle)
    const licence = valeur(champs, colonnes.licence)

    // Ce que le fichier apporterait à une fiche déjà présente
    const apports = existant
      ? comparerAvecExistant(existant, { email, telephones, libelle, numero_licence: licence })
      : { complements: [], differences: [] }

    return {
      numeroLigne: i + 2,           // +2 : l'en-tête compte, et on part de 1
      nom, prenom, email, telephones,
      libelle,
      numero_licence: licence,
      creneauxIds: [],
      niveauIds: [],
      anomalies,
      doublon,
      existant,
      complements: apports.complements,     // champs vides dans la base
      differences: apports.differences,     // champs renseignés mais différents
      // Nouveau : importable. Déjà présent : proposé en mise à jour s'il y a
      // quelque chose à compléter. Un écart de valeur n'est jamais appliqué
      // sans décision explicite.
      action: doublon ? (existant && apports.complements.length ? 'maj' : 'ignorer') : 'creer',
      selectionne: anomalies.length === 0 &&
        (!doublon || (Boolean(existant) && apports.complements.length > 0))
    }
  })

  return { enTetes, colonnes, lignes, erreur: null, separateur }
}
