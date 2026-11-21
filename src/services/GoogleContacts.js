/**
 * Synchronisation Google Contacts → fiches membres (lecture seule).
 *
 * Google Contacts fait foi : il est tenu à jour depuis les fiches d'inscription.
 * Pour chaque membre retrouvé dans les libellés choisis, on compare l'e-mail,
 * les numéros et leur étiquette (« Qui ? ») et on propose les corrections.
 * Rien n'est écrit chez Google ; le jeton reste dans le navigateur.
 */

import { nettoyerTelephone } from './ImportCsv'

// Identifiant OAuth « Application Web » du projet Google Cloud de l'appli.
// Un identifiant client n'est pas un secret : il est visible par tout navigateur.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '436731311529-uhmdov771tmo365jk17hulnete80ulaj.apps.googleusercontent.com'

const SCOPE = 'https://www.googleapis.com/auth/contacts.readonly'
const API = 'https://people.googleapis.com/v1'

// Types de numéro prévus par Google : ce ne sont pas des « Qui ? »
const TYPES_STANDARD = ['mobile', 'home', 'work', 'homefax', 'workfax', 'otherfax', 'pager',
  'workmobile', 'workpager', 'main', 'googlevoice', 'other']

const norm = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '')

/** Forme de comparaison d'un numéro : chiffres seuls, +33 ramené à 0. */
export const cleTel = (n) => nettoyerTelephone(n).replace(/\D/g, '')

/** « 0670633239 » → « 06 70 63 32 39 », comme les numéros saisis dans l'appli. */
const formaterTel = (n) => {
  const t = nettoyerTelephone(n)
  return /^0\d{9}$/.test(t) ? t.replace(/(\d{2})(?=\d)/g, '$1 ') : t
}

// ── Connexion Google (Google Identity Services, côté navigateur) ─────────

let scriptGis = null
const chargerGis = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!scriptGis) {
    scriptGis = new Promise((ok, ko) => {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = ok
      s.onerror = () => { scriptGis = null; ko(new Error('Impossible de charger la connexion Google')) }
      document.head.appendChild(s)
    })
  }
  return scriptGis
}

/** Ouvre la fenêtre Google et renvoie un jeton d'accès en lecture seule. */
export async function connecterGoogle(compte = '') {
  if (!GOOGLE_CLIENT_ID) throw new Error("La connexion Google n'est pas encore configurée (identifiant client manquant).")
  await chargerGis()
  return new Promise((ok, ko) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      hint: compte || undefined,
      callback: (r) => (r.error ? ko(new Error(r.error_description || r.error)) : ok(r.access_token)),
      error_callback: (e) => ko(new Error(e?.type === 'popup_closed' ? 'Fenêtre Google fermée' : (e?.message || 'Connexion Google refusée')))
    })
    client.requestAccessToken()
  })
}

/** Rend l'autorisation à Google une fois la synchro terminée. */
export function deconnecterGoogle(jeton) {
  try { window.google?.accounts?.oauth2?.revoke(jeton, () => {}) } catch { /* sans importance */ }
}

async function appeler(jeton, chemin) {
  const r = await fetch(API + chemin, { headers: { Authorization: `Bearer ${jeton}` } })
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}))
    throw new Error(detail?.error?.message || `Google a répondu ${r.status}`)
  }
  return r.json()
}

/** Libellés créés par l'utilisateur (pas « Mes contacts », « Favoris »…). */
export async function lireLibelles(jeton) {
  const d = await appeler(jeton, '/contactGroups?pageSize=1000&groupFields=name,groupType,memberCount')
  return (d.contactGroups || [])
    .filter(g => g.groupType === 'USER_CONTACT_GROUP')
    .map(g => ({ id: g.resourceName, nom: g.formattedName || g.name, nombre: g.memberCount || 0 }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true }))
}

/** Tous les contacts, réduits à ce qui sert à la comparaison. */
export async function lireContacts(jeton) {
  const contacts = []
  let page = ''
  do {
    const d = await appeler(jeton, '/people/me/connections?pageSize=1000' +
      '&personFields=names,emailAddresses,phoneNumbers,memberships' +
      (page ? `&pageToken=${encodeURIComponent(page)}` : ''))
    for (const p of d.connections || []) {
      const n = (p.names || [])[0] || {}
      const emails = p.emailAddresses || []
      const principal = emails.find(e => e.metadata?.primary) || emails[0]
      contacts.push({
        id: p.resourceName,
        prenom: (n.givenName || '').trim(),
        nom: (n.familyName || '').trim(),
        affiche: (n.displayName || '').trim(),
        email: (principal?.value || '').trim(),
        telephones: (p.phoneNumbers || [])
          .filter(t => cleTel(t.value))
          .map(t => ({
            numero: formaterTel(t.value),
            qui: TYPES_STANDARD.includes(norm(t.type)) ? '' : (t.formattedType || t.type || '').trim()
          })),
        libelles: (p.memberships || [])
          .map(m => m.contactGroupMembership?.contactGroupResourceName)
          .filter(Boolean)
      })
    }
    page = d.nextPageToken || ''
  } while (page)
  return contacts
}

const nomContact = (c) => (c.affiche || `${c.prenom} ${c.nom}`).trim()

// ── Conflits : un même numéro sous plusieurs noms ───────────────────────

const motsNom = (c) => String(c.nom || c.affiche || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .split(/[^a-z0-9]+/).filter(m => m.length >= 3)

/** Même famille : au moins un mot du nom en commun (METAY DERRUAU / METAY). */
export function memeFamille(a, b) {
  const ma = motsNom(a)
  return motsNom(b).some(m => ma.includes(m))
}

/**
 * Numéros présents sur plusieurs contacts des libellés choisis.
 * Frères et sœurs (même nom de famille) : normal, pas de conflit.
 * Sinon : conflit à régler — pour chaque porteur, garder ou écarter le numéro.
 * `regles` = décisions déjà prises { cleTel: [ids des contacts écartés] }.
 */
export function trouverConflits(contacts, libellesChoisis, regles = {}) {
  const retenus = contacts.filter(c => c.libelles.some(l => libellesChoisis.includes(l)))
  const parNumero = new Map()
  for (const c of retenus) {
    for (const t of c.telephones) {
      const k = cleTel(t.numero)
      if (!k) continue
      if (!parNumero.has(k)) parNumero.set(k, [])
      const liste = parNumero.get(k)
      if (!liste.some(p => p.contact.id === c.id)) liste.push({ contact: c, qui: t.qui, numero: t.numero })
    }
  }
  const conflits = []
  for (const [k, porteurs] of parNumero) {
    if (porteurs.length < 2) continue
    const famille = porteurs.every((p, i) => porteurs.every((q, j) => i === j || memeFamille(p.contact, q.contact)))
    if (famille) continue
    const ecartes = regles[k]
    conflits.push({
      cle: k,
      numero: porteurs[0].numero,
      dejaRegle: Array.isArray(ecartes),
      porteurs: porteurs.map(p => ({
        id: p.contact.id, nom: nomContact(p.contact), qui: p.qui,
        garde: !(ecartes || []).includes(p.contact.id)
      }))
    })
  }
  conflits.sort((a, b) => Number(a.dejaRegle) - Number(b.dejaRegle) || a.numero.localeCompare(b.numero))
  return conflits
}

/** Retire des contacts les numéros écartés lors du règlement des conflits. */
export function ecarterNumeros(contacts, conflits) {
  const ecartes = new Map(conflits.map(cf => [cf.cle, cf.porteurs.filter(p => !p.garde).map(p => p.id)]))
  return contacts.map(c => ({
    ...c,
    telephones: c.telephones.filter(t => !(ecartes.get(cleTel(t.numero)) || []).includes(c.id))
  }))
}

/** Décisions à mémoriser : { cleTel: [ids écartés] } (liste vide = tout gardé, mais réglé). */
export function reglesDepuisConflits(conflits, anciennes = {}) {
  const regles = { ...anciennes }
  for (const cf of conflits) regles[cf.cle] = cf.porteurs.filter(p => !p.garde).map(p => p.id)
  return regles
}

// ── Comparaison ─────────────────────────────────────────────────────────

/** Deux numéros qui ne diffèrent que d'un chiffre, ou de deux chiffres voisins inversés : faute de frappe probable. */
export function presqueIdentiques(a, b) {
  if (!a || !b || a === b || a.length !== b.length) return false
  const diff = []
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i)
  if (diff.length === 1) return true
  return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]
}

/**
 * Numéros presque identiques dans une même fiche Google (ex. 06 41… / 06 61…).
 * Les autres fiches Google (frères et sœurs) départagent : le numéro qu'on y
 * retrouve est gardé, l'autre est signalé comme faute de frappe probable.
 * Sans confirmation, les deux sont gardés et signalés « à vérifier ».
 */
function departagerNumeros(c, retenus, changements, actuels) {
  const cles = [...new Set(c.telephones.map(t => cleTel(t.numero)))]
  const confirme = (k) => retenus.filter(x => x.id !== c.id && x.telephones.some(t => cleTel(t.numero) === k)).map(nomContact)
  const enAppli = new Set(actuels.map(t => cleTel(t.numero)))
  const fmt = (k) => c.telephones.find(t => cleTel(t.numero) === k)?.numero || k
  const signaler = (k, alerte, garder) => {
    let ch = changements.find(x => x.cle.endsWith(`:${k}`))
    if (!garder && enAppli.has(k)) {
      // Présent dans l'appli : proposer de le retirer à la place de tout autre changement
      const i = changements.indexOf(ch)
      const qui = actuels.find(t => cleTel(t.numero) === k)?.libelle || ''
      const retrait = { cle: `retirer:${k}`, type: 'retirer', numero: fmt(k), qui, actif: true, alerte }
      if (i >= 0) changements[i] = retrait; else changements.push(retrait)
      return
    }
    if (!ch) {
      ch = { cle: `note:${k}`, type: 'note', numero: fmt(k), actif: false }
      changements.push(ch)
    }
    if (!garder && ch.type === 'ajouter') ch.actif = false
    ch.alerte = ch.alerte ? `${ch.alerte} · ${alerte}` : alerte
  }
  for (let i = 0; i < cles.length; i++) {
    for (let j = i + 1; j < cles.length; j++) {
      const a = cles[i], b = cles[j]
      if (!presqueIdentiques(a, b)) continue
      const ca = confirme(a), cb = confirme(b)
      if (ca.length && !cb.length || cb.length && !ca.length) {
        const [bon, faux, par] = ca.length ? [a, b, ca] : [b, a, cb]
        signaler(faux, `⚠️ faute de frappe probable : ressemble à ${fmt(bon)}, confirmé par la fiche Google de ${par.join(', ')}`, false)
        signaler(bon, `✔ confirmé par la fiche Google de ${par.join(', ')}`, true)
      } else {
        const alerte = `⚠️ à vérifier : ${fmt(a)} et ${fmt(b)} ne diffèrent que d'un chiffre (faute de frappe probable dans Google)`
        signaler(a, alerte, true)
        signaler(b, alerte, true)
      }
    }
  }
}

/**
 * Rapproche membres et contacts des libellés choisis, puis liste les changements.
 * Rapprochement : nom + prénom (sans accents ni casse), sinon un numéro ou
 * l'e-mail commun — ces derniers cas sont « à vérifier » et décochés.
 */
export function comparer(eleves, contacts, libellesChoisis) {
  const retenus = contacts.filter(c => c.libelles.some(l => libellesChoisis.includes(l)))

  const parNom = new Map()
  const ajouterCle = (cle, c) => { if (cle && !parNom.has(cle)) parNom.set(cle, c) }
  for (const c of retenus) {
    ajouterCle(`${norm(c.nom)}|${norm(c.prenom)}`, c)
    ajouterCle(`${norm(c.prenom)}|${norm(c.nom)}`, c)
    ajouterCle(`affiche|${norm(c.affiche)}`, c)
  }

  const utilises = new Set()
  const fiches = []

  for (const e of eleves) {
    let c = parNom.get(`${norm(e.nom)}|${norm(e.prenom)}`) ||
      parNom.get(`affiche|${norm(`${e.prenom} ${e.nom}`)}`) ||
      parNom.get(`affiche|${norm(`${e.nom} ${e.prenom}`)}`)
    let douteux = false

    if (!c) {
      const tels = (e.telephones || []).map(t => cleTel(t.numero)).filter(Boolean)
      const mail = norm(e.email)
      c = retenus.find(x => !utilises.has(x.id) &&
        ((mail && norm(x.email) === mail) || x.telephones.some(t => tels.includes(cleTel(t.numero)))))
      douteux = Boolean(c)
    }
    if (!c) continue
    utilises.add(c.id)

    const changements = []
    if (c.email && norm(c.email) !== norm(e.email)) {
      changements.push({ cle: 'email', type: 'email', ancien: e.email || '', nouveau: c.email, actif: true })
    }

    const actuels = Array.isArray(e.telephones) ? e.telephones : []
    const google = new Map(c.telephones.map(t => [cleTel(t.numero), t]))
    for (const t of actuels) {
      const g = google.get(cleTel(t.numero))
      if (!g) {
        changements.push({ cle: `retirer:${cleTel(t.numero)}`, type: 'retirer', numero: t.numero, qui: t.libelle || '', actif: true })
      } else if (g.qui && g.qui !== (t.libelle || '').trim()) {
        changements.push({ cle: `qui:${cleTel(t.numero)}`, type: 'qui', numero: t.numero, ancien: t.libelle || '', nouveau: g.qui, actif: true })
      }
    }
    const connus = new Set(actuels.map(t => cleTel(t.numero)))
    for (const [k, g] of google) {
      if (!connus.has(k)) changements.push({ cle: `ajouter:${k}`, type: 'ajouter', numero: g.numero, qui: g.qui, actif: true })
    }
    departagerNumeros(c, retenus, changements, actuels)

    if (changements.length) {
      fiches.push({ eleve: e, contact: c, douteux, choisie: !douteux, changements })
    }
  }

  // Contacts Google sans fiche dans l'appli : création possible, jamais par défaut
  const nouveaux = retenus
    .filter(c => !utilises.has(c.id) && (c.nom || c.prenom || c.affiche))
    .map(c => ({ contact: c, choisie: false }))

  const nom = (f) => `${norm(f.eleve?.nom ?? f.contact.nom)}${norm(f.eleve?.prenom ?? f.contact.prenom)}`
  fiches.sort((a, b) => Number(a.douteux) - Number(b.douteux) || nom(a).localeCompare(nom(b)))
  nouveaux.sort((a, b) => nom(a).localeCompare(nom(b)))

  return { fiches, nouveaux, retenus: retenus.length }
}

/** Fiche membre après application des seuls changements cochés. */
export function appliquer(eleve, changements) {
  const actifs = changements.filter(ch => ch.actif)
  const sortie = { ...eleve }
  let tels = (Array.isArray(eleve.telephones) ? eleve.telephones : []).map(t => ({ ...t }))

  for (const ch of actifs) {
    if (ch.type === 'email') sortie.email = ch.nouveau
    if (ch.type === 'qui') tels = tels.map(t => (cleTel(t.numero) === cleTel(ch.numero) ? { ...t, libelle: ch.nouveau } : t))
    if (ch.type === 'retirer') tels = tels.filter(t => cleTel(t.numero) !== cleTel(ch.numero))
    if (ch.type === 'ajouter' && !tels.some(t => cleTel(t.numero) === cleTel(ch.numero))) tels.push({ numero: ch.numero, libelle: ch.qui || '', actifSMS: true })
  }
  sortie.telephones = tels
  delete sortie.telephone       // sinon _preparerEleve réécrit le premier numéro
  return sortie
}
