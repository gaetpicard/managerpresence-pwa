/**
 * Vacances scolaires françaises, par zone.
 *
 * Même source et même cache que l'application Android : l'open data de
 * l'Éducation nationale, mémorisé dans le document `config/calendrier_scolaire`
 * du club. Si l'app a déjà téléchargé l'année, la PWA la lit sans réseau —
 * et inversement.
 */

const API =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records'

export const ACADEMIES = {
  A: ['Besançon', 'Bordeaux', 'Clermont-Ferrand', 'Dijon', 'Grenoble', 'Limoges', 'Lyon', 'Poitiers'],
  B: ['Aix-Marseille', 'Amiens', 'Caen', 'Lille', 'Nancy-Metz', 'Nantes', 'Nice', 'Orléans-Tours',
      'Reims', 'Rennes', 'Rouen', 'Strasbourg'],
  C: ['Créteil', 'Montpellier', 'Paris', 'Toulouse', 'Versailles']
}

/** Année scolaire en cours, ex. « 2026-2027 » (bascule au 1er août). */
export function anneeScolaireCourante() {
  const d = new Date()
  const debut = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
  return `${debut}-${debut + 1}`
}

/** La précédente, celle en cours, la suivante. */
export function anneesProposees() {
  const debut = Number(anneeScolaireCourante().split('-')[0])
  return [debut - 1, debut, debut + 1].map(a => `${a}-${a + 1}`)
}

/**
 * Ordre chronologique d'une liste de dates « JJ/MM », qui ne portent pas
 * l'année. Un tri brut sur mois×100+jour place janvier (115) AVANT
 * septembre (901) et casse l'ordre d'une saison à cheval sur deux années.
 * On déduit donc le mois d'ouverture de la saison du plus grand trou dans
 * les mois utilisés : septembre pour un club, janvier pour une entreprise.
 */
export function moisDebutSaison(dates) {
  const mois = [...new Set(dates
    .map(d => Number(String(d).split('/')[1]))
    .filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b)

  if (mois.length < 2) return mois[0] || 1

  let plusGrandTrou = 0
  let debut = mois[0]
  mois.forEach((courant, i) => {
    const suivant = mois[(i + 1) % mois.length]
    const trou = ((suivant - courant) + 12) % 12
    if (trou > plusGrandTrou) { plusGrandTrou = trou; debut = suivant }
  })
  return debut
}

/**
 * Date réelle d'un « JJ/MM », l'année étant déduite de la saison.
 * `new Date('15/01')` ne veut rien dire : toute comparaison de dates doit
 * passer par ici, sinon les filtres par période ne filtrent rien.
 */
export function dateReelle(jjmm, debutSaison, aujourdhui = new Date()) {
  const [jour, mois] = String(jjmm || '').split('/').map(Number)
  if (!jour || !mois) return null
  const ouverture = (aujourdhui.getMonth() + 1) >= debutSaison
    ? aujourdhui.getFullYear()
    : aujourdhui.getFullYear() - 1
  const annee = mois >= debutSaison ? ouverture : ouverture + 1
  return new Date(annee, mois - 1, jour)
}

/** Clé de tri d'une date « JJ/MM », relative au début de saison. */
export function cleTri(date, debutSaison) {
  const [jour, mois] = String(date || '').split('/').map(Number)
  if (!jour || !mois) return 9999
  return ((mois - debutSaison + 12) % 12) * 100 + jour
}

/** Date d'un instant ISO, ramenée au jour parisien. */
function jourParis(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  // « fr-CA » donne AAAA-MM-JJ, directement comparable
  const [a, m, j] = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d).split('-').map(Number)
  return { annee: a, mois: m, jour: j }
}

function versDate({ annee, mois, jour }) {
  return new Date(annee, mois - 1, jour)
}

/** Télécharge les vacances officielles. null si l'API ne répond pas. */
export async function telechargerVacances(zone, annee) {
  try {
    const filtre = encodeURIComponent(`annee_scolaire="${annee}" and zones="Zone ${zone}"`)
    const url = `${API}?where=${filtre}&limit=100&select=description,start_date,end_date,population`
    const reponse = await fetch(url)
    if (!reponse.ok) return null

    const { results = [] } = await reponse.json()
    const vues = new Set()
    const periodes = []

    for (const o of results) {
      // Les dates « Enseignants » diffèrent de celles des élèves
      if (o.population === 'Enseignants') continue

      const nom = String(o.description || '')
        .replace(/^Vacances (de la |de l'|des |de |d')/, '').trim()
      const debut = jourParis(o.start_date)
      const finBrute = jourParis(o.end_date)
      if (!debut || !finBrute) continue

      // L'API donne le jour de REPRISE : le dernier jour off est la veille
      const fin = versDate(finBrute)
      fin.setDate(fin.getDate() - 1)
      const finJour = { annee: fin.getFullYear(), mois: fin.getMonth() + 1, jour: fin.getDate() }
      if (versDate(finJour) < versDate(debut)) Object.assign(finJour, debut)

      const cle = `${nom}|${JSON.stringify(debut)}|${JSON.stringify(finJour)}`
      if (vues.has(cle)) continue
      vues.add(cle)
      periodes.push({ nom, debut, fin: finJour })
    }

    return periodes.sort((a, b) => versDate(a.debut) - versDate(b.debut))
  } catch (error) {
    console.warn('Calendrier scolaire indisponible :', error)
    return null
  }
}

/** Vrai si la date tombe pendant l'une des périodes (bornes comprises). */
export function estEnVacances(date, vacances) {
  return vacances.some(p => {
    const d = versDate(p.debut)
    const f = versDate(p.fin)
    f.setHours(23, 59, 59, 999)
    return date >= d && date <= f
  })
}

/**
 * Jours retenus entre deux dates, au format « JJ/MM » attendu par
 * l'application, en excluant les vacances fournies.
 * `joursSemaine` : 0 = dimanche … 6 = samedi.
 */
export function genererDates(debut, fin, joursSemaine, vacances = []) {
  const dates = []
  const courant = new Date(debut)
  courant.setHours(0, 0, 0, 0)

  while (courant <= fin) {
    if (joursSemaine.includes(courant.getDay()) && !estEnVacances(courant, vacances)) {
      const j = String(courant.getDate()).padStart(2, '0')
      const m = String(courant.getMonth() + 1).padStart(2, '0')
      dates.push(`${j}/${m}`)
    }
    courant.setDate(courant.getDate() + 1)
  }
  return [...new Set(dates)]
}
