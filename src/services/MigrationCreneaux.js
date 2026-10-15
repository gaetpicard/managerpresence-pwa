/**
 * Règle de déplacement des pointages quand un membre change de créneau.
 *
 * Isolée du service Firebase pour être vérifiable sans base de données : cette
 * règle décide de réécrire des données historiques, elle doit pouvoir être
 * mise à l'épreuve toute seule.
 *
 * Rappel du contexte : un pointage est rangé sous la clé
 * "<eleveId>_<creneauId>" dans le champ `presences` d'une séance. Le créneau
 * fait donc partie de son identité, et changer un membre de créneau rend son
 * historique introuvable si l'on ne déplace rien.
 */

/**
 * @param {string[]} anciensCreneaux créneaux du membre avant modification
 * @param {string[]} nouveauxCreneaux créneaux après modification
 * @returns {{retires: string[], destination: string} | null}
 *          null quand il n'y a rien à déplacer, ou quand la destination est
 *          ambiguë — auquel cas on préfère ne rien réécrire que deviner.
 */
export function calculerDeplacementCreneau(anciensCreneaux, nouveauxCreneaux) {
  const anciens = Array.isArray(anciensCreneaux) ? anciensCreneaux : []
  const nouveaux = Array.isArray(nouveauxCreneaux) ? nouveauxCreneaux : []

  const retires = anciens.filter(c => !nouveaux.includes(c))
  const ajoutes = nouveaux.filter(c => !anciens.includes(c))

  // Rien n'a été quitté : le membre a simplement été inscrit à un créneau de
  // plus. Ses pointages existants restent exactement où ils sont — c'est le
  // cas courant des membres inscrits à plusieurs créneaux, et y toucher
  // reviendrait à déplacer un historique parfaitement valide.
  if (retires.length === 0) return null

  // Plusieurs créneaux d'arrivée (ou aucun) : impossible de savoir lequel
  // hérite de l'historique. On ne devine pas.
  if (ajoutes.length !== 1) return null

  return { retires, destination: ajoutes[0] }
}
