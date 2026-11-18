import React, { useState, useEffect } from 'react'
import { FirebaseService } from '../services/FirebaseService'
import { nettoyerLibelle } from '../services/ImportCsv'
import {
  connecterGoogle, deconnecterGoogle, lireLibelles, lireContacts, comparer, appliquer
} from '../services/GoogleContacts'

/**
 * Fenêtre « Synchroniser avec Google Contacts » de la page Membres.
 * 1. connexion au compte Google de la structure ;
 * 2. choix des libellés à prendre en compte (mémorisés pour la structure) ;
 * 3. aperçu des changements, fiche par fiche, puis application.
 * Google fait foi pour l'e-mail, les numéros et leur « Qui ? ».
 */
function SynchroGoogle({ eleves, onFermer, onTermine, showToast }) {
  const [etape, setEtape] = useState('connexion')
  const [compte, setCompte] = useState('')
  const [jeton, setJeton] = useState(null)
  const [libelles, setLibelles] = useState([])
  const [choisis, setChoisis] = useState([])
  const [contacts, setContacts] = useState([])
  const [resultat, setResultat] = useState(null)
  const [occupe, setOccupe] = useState('')
  const [progression, setProgression] = useState(0)

  useEffect(() => {
    FirebaseService.getGoogleContactsConfig().then(c => {
      setCompte(c.compte || '')
      setChoisis(c.libelles || [])
    })
  }, [])

  const fermer = () => {
    if (jeton) deconnecterGoogle(jeton)
    onFermer()
  }

  const seConnecter = async () => {
    setOccupe('Connexion à Google…')
    try {
      const j = await connecterGoogle(compte)
      setJeton(j)
      setOccupe('Lecture des contacts…')
      const [ls, cs] = await Promise.all([lireLibelles(j), lireContacts(j)])
      setLibelles(ls)
      setContacts(cs)
      // Libellés mémorisés qui n'existent plus chez Google : oubliés
      setChoisis(prev => prev.filter(id => ls.some(l => l.id === id)))
      setEtape('libelles')
    } catch (e) {
      showToast(e.message, 'error')
    }
    setOccupe('')
  }

  const basculerLibelle = (id) =>
    setChoisis(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  const comparerMaintenant = async () => {
    try {
      await FirebaseService.updateGoogleContactsConfig({
        compte: compte.trim(),
        libelles: choisis,
        nomsLibelles: libelles.filter(l => choisis.includes(l.id)).map(l => l.nom)
      })
    } catch (e) {
      console.error('Réglages Google non enregistrés :', e)
    }
    setResultat(comparer(eleves, contacts, choisis))
    setEtape('apercu')
  }

  const basculerChangement = (iFiche, cle) => setResultat(r => ({
    ...r,
    fiches: r.fiches.map((f, i) => (i !== iFiche ? f : {
      ...f, changements: f.changements.map(ch => (ch.cle === cle ? { ...ch, actif: !ch.actif } : ch))
    }))
  }))
  const basculerFiche = (iFiche) => setResultat(r => ({
    ...r, fiches: r.fiches.map((f, i) => (i === iFiche ? { ...f, choisie: !f.choisie } : f))
  }))
  const basculerNouveau = (iNouveau) => setResultat(r => ({
    ...r, nouveaux: r.nouveaux.map((n, i) => (i === iNouveau ? { ...n, choisie: !n.choisie } : n))
  }))

  const aFaire = resultat ? [
    ...resultat.fiches.filter(f => f.choisie && f.changements.some(ch => ch.actif)),
    ...resultat.nouveaux.filter(n => n.choisie)
  ] : []

  const nomLibelle = (id) => libelles.find(l => l.id === id)?.nom || ''

  const valider = async () => {
    setOccupe('Mise à jour…')
    setProgression(0)
    let maj = 0, crees = 0
    const echecs = []
    for (let i = 0; i < aFaire.length; i++) {
      const x = aFaire[i]
      try {
        if (x.eleve) {
          await FirebaseService.updateEleve(x.eleve.id, appliquer(x.eleve, x.changements))
          maj++
        } else {
          const c = x.contact
          await FirebaseService.addEleve({
            nom: c.nom || c.affiche, prenom: c.prenom, email: c.email,
            telephones: c.telephones.map(t => ({ numero: t.numero, libelle: t.qui, actifSMS: true })),
            libelle: nettoyerLibelle(c.libelles.filter(l => choisis.includes(l)).map(nomLibelle).join(' ::: ')),
            creneauxIds: [], niveauIds: []
          })
          crees++
        }
      } catch (e) {
        console.error('Synchro Google :', e)
        const p = x.eleve || x.contact
        echecs.push(`${p.prenom || ''} ${p.nom || ''}`.trim())
      }
      setProgression(Math.round(((i + 1) / aFaire.length) * 100))
    }
    await FirebaseService.addAuditLog('SYNCHRO_GOOGLE',
      `${maj} mis à jour, ${crees} créé(s)`,
      `Google Contacts (${resultat.retenus} contacts des libellés choisis)`)
    setOccupe('')
    const bilan = [maj && `${maj} mis à jour`, crees && `${crees} créé(s)`].filter(Boolean).join(', ') || 'rien à faire'
    showToast(echecs.length ? `${bilan} — échec : ${echecs.slice(0, 3).join(', ')}` : bilan, echecs.length ? 'error' : 'success')
    if (jeton) deconnecterGoogle(jeton)
    onTermine()
  }

  const ligneChangement = (ch) => {
    if (ch.type === 'email') return <>✉️ E-mail : <s>{ch.ancien || 'vide'}</s> → <strong>{ch.nouveau}</strong></>
    if (ch.type === 'qui') return <>📞 {ch.numero} — Qui ? <s>{ch.ancien || 'vide'}</s> → <strong>{ch.nouveau}</strong></>
    if (ch.type === 'ajouter') return <>➕ Ajouter {ch.numero}{ch.qui ? ` (${ch.qui})` : ''}</>
    return <span style={{ color: '#c62828' }}>🗑 Retirer {ch.numero}{ch.qui ? ` (${ch.qui})` : ''} — absent de Google</span>
  }

  const carte = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', marginBottom: 8, background: '#fff', color: '#222' }

  return (
    <div className="modal-overlay" onClick={() => !occupe && fermer()}>
      <div className="modal" onClick={e => e.stopPropagation()}
           style={{ width: 'min(680px, 96vw)', maxWidth: '96vw' }}>
        <div className="modal-header">
          <h2 className="modal-title">🔄 Google Contacts</h2>
          {!occupe && <button className="modal-close" onClick={fermer}>×</button>}
        </div>

        <div className="modal-body">
          {etape === 'connexion' && (
            <>
              <p>Les fiches de l'appli sont comparées à Google Contacts, qui fait foi pour
                l'<strong>e-mail</strong>, les <strong>numéros</strong> et leur <strong>« Qui ? »</strong>.
                Rien n'est modifié chez Google ni enregistré avant ta validation.</p>
              <div className="form-group">
                <label className="form-label">Compte Google de la structure</label>
                <input className="form-input" type="email" value={compte}
                       placeholder="exemple@gmail.com" onChange={e => setCompte(e.target.value)} />
              </div>
            </>
          )}

          {etape === 'libelles' && (
            <>
              <p>Coche les libellés à prendre en compte (le choix est gardé pour la prochaine fois) :</p>
              {libelles.length === 0 && <p>Aucun libellé dans ce compte Google.</p>}
              {libelles.map(l => (
                <label key={l.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={choisis.includes(l.id)} onChange={() => basculerLibelle(l.id)} />
                  {l.nom} <span style={{ color: '#777' }}>({l.nombre})</span>
                </label>
              ))}
            </>
          )}

          {etape === 'apercu' && resultat && (
            <>
              <p><strong>{resultat.retenus}</strong> contact(s) Google dans les libellés choisis ·{' '}
                <strong>{resultat.fiches.length}</strong> fiche(s) à mettre à jour ·{' '}
                <strong>{resultat.nouveaux.length}</strong> absent(s) de l'appli.</p>
              {resultat.fiches.length === 0 && <p>✅ Toutes les fiches rapprochées sont déjà à jour.</p>}

              {resultat.fiches.map((f, i) => (
                <div key={f.eleve.id} style={{ ...carte, opacity: f.choisie ? 1 : 0.6 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, cursor: 'pointer' }}>
                    <input type="checkbox" checked={f.choisie} disabled={!!occupe} onChange={() => basculerFiche(i)} />
                    {f.eleve.prenom} {f.eleve.nom}
                    {f.douteux && (
                      <span style={{ color: '#e65100', fontWeight: 400 }}>
                        ⚠️ à vérifier : rapproché de « {f.contact.affiche} » par téléphone ou e-mail
                      </span>
                    )}
                  </label>
                  {f.changements.map(ch => (
                    <label key={ch.cle} style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 24, cursor: 'pointer' }}>
                      <input type="checkbox" checked={ch.actif} disabled={!f.choisie || !!occupe}
                             onChange={() => basculerChangement(i, ch.cle)} />
                      <span>{ligneChangement(ch)}</span>
                    </label>
                  ))}
                </div>
              ))}

              {resultat.nouveaux.length > 0 && (
                <>
                  <h3 style={{ margin: '14px 0 6px' }}>Dans Google mais pas dans l'appli</h3>
                  <p style={{ color: '#777', marginTop: 0 }}>À cocher seulement pour les créer.</p>
                  {resultat.nouveaux.map((n, i) => (
                    <label key={n.contact.id} style={{ ...carte, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={n.choisie} disabled={!!occupe} onChange={() => basculerNouveau(i)} />
                      <span>
                        <strong>{n.contact.prenom} {n.contact.nom || (!n.contact.prenom && n.contact.affiche)}</strong>
                        {n.contact.email && ` · ${n.contact.email}`}
                        {n.contact.telephones.map(t => ` · ${t.numero}${t.qui ? ` (${t.qui})` : ''}`).join('')}
                      </span>
                    </label>
                  ))}
                </>
              )}
            </>
          )}

          {occupe && <p style={{ fontWeight: 600 }}>{occupe}{etape === 'apercu' ? ` ${progression} %` : ''}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" disabled={!!occupe} onClick={fermer}>Annuler</button>
          {etape === 'connexion' && (
            <button className="btn btn-primary" disabled={!!occupe} onClick={seConnecter}>Se connecter à Google</button>
          )}
          {etape === 'libelles' && (
            <button className="btn btn-primary" disabled={!choisis.length} onClick={comparerMaintenant}>Comparer</button>
          )}
          {etape === 'apercu' && (
            <>
              <button className="btn btn-secondary" disabled={!!occupe} onClick={() => setEtape('libelles')}>Libellés</button>
              <button className="btn btn-primary" disabled={!!occupe || !aFaire.length} onClick={valider}>
                Valider ({aFaire.length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SynchroGoogle
