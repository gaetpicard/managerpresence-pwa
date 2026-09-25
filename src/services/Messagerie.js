/**
 * Ouverture d'un message depuis la boîte configurée dans les Paramètres
 * (document config/email, champ emailFrom) plutôt que depuis le logiciel de
 * messagerie par défaut de l'ordinateur.
 *
 * Un site web ne peut pas imposer un client de messagerie : un lien mailto:
 * est toujours remis au logiciel déclaré dans le système. On ouvre donc
 * directement la fenêtre de rédaction du webmail correspondant au domaine de
 * l'adresse d'envoi, en précisant le compte à utiliser.
 *
 * Si le domaine n'est pas reconnu (adresse professionnelle, hébergeur privé),
 * on retombe sur mailto: — le seul comportement possible dans ce cas.
 */

const WEBMAILS = [
  {
    domaines: ['gmail.com', 'googlemail.com'],
    // authuser force le compte quand plusieurs sessions Google sont ouvertes
    url: ({ to, cci, sujet, corps, from }) =>
      `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&bcc=${cci}&su=${sujet}&body=${corps}&authuser=${from}`
  },
  {
    domaines: ['outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'msn.com'],
    url: ({ to, cci, sujet, corps }) =>
      `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&bcc=${cci}&subject=${sujet}&body=${corps}`
  },
  {
    domaines: ['yahoo.com', 'yahoo.fr'],
    url: ({ to, cci, sujet, corps }) =>
      `https://compose.mail.yahoo.com/?to=${to}&bcc=${cci}&subject=${sujet}&body=${corps}`
  }
]

/**
 * Construit l'adresse d'ouverture du message.
 *
 * `copieCachee` reçoit la liste des destinataires d'un envoi groupé. Ils sont
 * mis en copie cachée et non en destinataires : sans cela, chaque famille
 * recevrait les adresses de toutes les autres.
 */
export function lienMessagerie({ destinataire, copieCachee = [], sujet = '', corps = '', expediteur = '' }) {
  const to = encodeURIComponent(destinataire || '')
  const cci = encodeURIComponent(
    (Array.isArray(copieCachee) ? copieCachee : [copieCachee]).filter(Boolean).join(',')
  )
  const su = encodeURIComponent(sujet)
  const bd = encodeURIComponent(corps)

  const from = String(expediteur || '').trim()
  const domaine = from.includes('@') ? from.split('@').pop().toLowerCase() : ''
  const fournisseur = domaine && WEBMAILS.find(w => w.domaines.includes(domaine))

  if (fournisseur) {
    return fournisseur.url({ to, cci, sujet: su, corps: bd, from: encodeURIComponent(from) })
  }
  return `mailto:${to}?bcc=${cci}&subject=${su}&body=${bd}`
}

/** Ouvre la rédaction du message dans un nouvel onglet. */
export function ouvrirMessagerie(options) {
  window.open(lienMessagerie(options), '_blank', 'noopener')
}

/**
 * Adresse de support du développeur, encodée comme dans l'application.
 * Elle n'est pas secrète — elle est faite pour être contactée — mais écrite
 * en clair dans le JavaScript, elle serait moissonnée par les robots
 * collecteurs d'adresses qui parcourent les sites.
 */
export function adresseSupport() {
  return atob('Y3Auc3VwcG9ydC5kZXZAZ21haWwuY29t')
}

/** Vrai si l'adresse d'envoi correspond à un webmail connu. */
export function webmailReconnu(expediteur) {
  const from = String(expediteur || '').trim()
  const domaine = from.includes('@') ? from.split('@').pop().toLowerCase() : ''
  return Boolean(domaine && WEBMAILS.some(w => w.domaines.includes(domaine)))
}
