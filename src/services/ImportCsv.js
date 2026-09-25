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
  const trouver = (cles) => {
    const exact = normalises.findIndex(h => cles.includes(h))
    if (exact >= 0) return exact
    return normalises.findIndex(h => h && cles.some(k => h.includes(k)))
  }
  return Object.fromEntries(Object.entries(CLES).map(([champ, cles]) => [champ, trouver(cles)]))
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
    if (nomsExistants.has(cle)) doublon = 'déjà dans la base'
    else if (email && emailsExistants.has(norm(email))) doublon = 'e-mail déjà utilisé'
    else if (vusDansFichier.has(cle)) doublon = 'en double dans le fichier'
    vusDansFichier.add(cle)

    const telephones = []
    if (tel) telephones.push({ numero: tel, libelle: '', actifSMS: true })
    if (tel2) telephones.push({ numero: tel2, libelle: '', actifSMS: true })

    return {
      numeroLigne: i + 2,           // +2 : l'en-tête compte, et on part de 1
      nom, prenom, email, telephones,
      libelle: valeur(champs, colonnes.libelle),
      numero_licence: valeur(champs, colonnes.licence),
      creneauxIds: [],
      niveauIds: [],
      anomalies,
      doublon,
      // Importable par défaut : ni bloquant, ni doublon
      selectionne: anomalies.length === 0 && !doublon
    }
  })

  return { enTetes, colonnes, lignes, erreur: null, separateur }
}
