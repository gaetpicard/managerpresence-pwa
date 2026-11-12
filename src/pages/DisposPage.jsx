import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { moisDebutSaison, dateReelle } from '../services/CalendrierScolaire'
import { useApp } from '../App'
import SortiesOnglet from './SortiesOnglet'

/**
 * Disponibilités des encadrants (même données que l'application, voir Disponibilites.kt).
 * La PWA n'a pas d'identité de cadre : on choisit pour qui on répond
 * (par défaut, le cadre qui a généré le code d'accès).
 */

const NB_SEANCES = 8
const CHOIX = [
  { v: 'OUI', label: 'Oui', couleur: '#c8e6c9' },
  { v: 'PEUT_ETRE', label: 'Peut-être', couleur: '#fff9c4' },
  { v: 'NON', label: 'Non', couleur: '#ffcdd2' }
]
const JOURS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const pad = n => String(n).padStart(2, '0')
/** Identifiant du document : l'année y figure, les « JJ/MM » reviennent chaque saison. */
const idJour = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function DisposPage() {
  const { generatedBy, termes } = useApp()
  const [isLoading, setIsLoading] = useState(true)
  const [seances, setSeances] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [cadres, setCadres] = useState([])
  const [dispos, setDispos] = useState({})
  const [jauges, setJauges] = useState({})
  const [jaugesMax, setJaugesMax] = useState({})
  const [seanceEditee, setSeanceEditee] = useState(null) // { s, intitule, mins, maxs }
  const [forum, setForum] = useState([])
  const [pourQui, setPourQui] = useState('')
  const [onglet, setOnglet] = useState('prochaines')
  const [ouvert, setOuvert] = useState(null)
  const [message, setMessage] = useState('')
  const [showJauges, setShowJauges] = useState(false)
  const [toast, setToast] = useState(null)
  const [sorties, setSorties] = useState([])
  // Jauges réglables par les administrateurs seulement (rôle du cadre qui a généré le code d'accès)
  const estAdmin = cadres.find(c => c.id === generatedBy)?.role === 'ADMIN'

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setIsLoading(true)
    try {
      const [s, cr, ca, d, j, f, so] = await Promise.all([
        FirebaseService.getSeances(), FirebaseService.getCreneaux(), FirebaseService.getCadres(),
        FirebaseService.getDispos(), FirebaseService.getJaugesDispos(), FirebaseService.getForumMessages(),
        FirebaseService.getSorties()
      ])
      setSeances(s); setCreneaux(cr); setCadres(ca); setDispos(d); setJauges(j.jauges); setJaugesMax(j.jaugesMax); setForum(f); setSorties(so)
      setPourQui(prev => prev || (ca.some(c => c.id === generatedBy) ? generatedBy : ''))
    } catch (e) {
      console.error('Erreur chargement dispos:', e)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  const showToast = (msg, type = 'info') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const debutSaison = moisDebutSaison(seances.map(s => s.date))
  const minuit = new Date(); minuit.setHours(0, 0, 0, 0)
  const avecDate = seances
    .filter(s => (s.creneauxActifsIds || []).length > 0)
    .map(s => ({ ...s, reelle: dateReelle(s.date, debutSaison) }))
    .filter(s => s.reelle)
    .filter(s => !sorties.some(so => so.annulerSalle && so.jour === idJour(s.reelle)))
  const prochaines = avecDate.filter(s => s.reelle >= minuit).sort((a, b) => a.reelle - b.reelle).slice(0, NB_SEANCES)
  const passees = avecDate.filter(s => s.reelle <= new Date()).sort((a, b) => b.reelle - a.reelle)
  const jourDe = s => dispos[idJour(s.reelle)] || {}
  const titreJour = s => `${JOURS[s.reelle.getDay()]} ${s.date}`
  const intituleDe = s => jourDe(s).intitule ? ` — ${jourDe(s).intitule}` : ''
  // Jauges d'une date : réglage propre à la séance, sinon celui du créneau (0 = aucune)
  const jaugeMin = (s, crId) => (jourDe(s).jauges || {})[crId] ?? jauges[crId] ?? 0
  const jaugeMax = (s, crId) => (jourDe(s).jaugesMax || {})[crId] ?? jaugesMax[crId] ?? 0
  const nbOuiDe = (s, crId) => Object.values((jourDe(s).votes || {})[crId] || {}).filter(x => x.v === 'OUI').length
  // Maximum atteint : plus de Oui pour ce cadre (sauf s'il l'a déjà dit, ou si on est admin)
  const ouiBloque = (s, crId) => !estAdmin && jaugeMax(s, crId) > 0 && nbOuiDe(s, crId) >= jaugeMax(s, crId) &&
    ((jourDe(s).votes || {})[crId] || {})[pourQui]?.v !== 'OUI'

  const voter = async (s, creneauId, v) => {
    if (!pourQui) { showToast('Choisir pour qui répondre', 'error'); return }
    if (v === 'OUI' && ouiBloque(s, creneauId)) { showToast('Complet : le nombre maximal d\'encadrants est atteint', 'error'); return }
    const id = idJour(s.reelle)
    try {
      await FirebaseService.voterDispo(id, s.date, creneauId, pourQui, v, generatedBy || 'PWA')
      // Mise à jour locale sans tout recharger
      setDispos(prev => {
        const jour = prev[id] || { date: s.date, votes: {} }
        const votes = { ...(jour.votes || {}) }
        votes[creneauId] = { ...(votes[creneauId] || {}), [pourQui]: { v, par: generatedBy || 'PWA', ts: Date.now() } }
        return { ...prev, [id]: { ...jour, votes } }
      })
    } catch (e) {
      console.error('Erreur vote:', e)
      showToast('Vote non enregistré', 'error')
    }
  }

  // Cadre arrivé au dernier moment : se déclarer présent le jour même, même après l'appel
  const basculerPresent = async (s, creneauId, present) => {
    if (!pourQui) { showToast('Choisir pour qui répondre', 'error'); return }
    const id = idJour(s.reelle)
    try {
      await FirebaseService.basculerPresentDispo(id, s.date, creneauId, pourQui, present)
      setDispos(prev => {
        const jour = prev[id] || { date: s.date }
        const liste = ((jour.presents || {})[creneauId] || []).filter(n => n !== pourQui)
        return { ...prev, [id]: { ...jour, presents: { ...(jour.presents || {}), [creneauId]: present ? [...liste, pourQui] : liste } } }
      })
    } catch (e) {
      showToast('Présence non enregistrée', 'error')
    }
  }

  const reglerJauge = async (creneauId, n, max = false) => {
    if (n < 0) return
    try {
      await FirebaseService.reglerJaugeDispo(creneauId, n, max)
      ;(max ? setJaugesMax : setJauges)(prev => ({ ...prev, [creneauId]: n }))
    } catch (e) {
      showToast('Jauge non enregistrée', 'error')
    }
  }

  const ouvrirEdition = s => setSeanceEditee({
    s, intitule: jourDe(s).intitule || '',
    mins: Object.fromEntries(s.creneauxActifsIds.map(id => [id, jaugeMin(s, id)])),
    maxs: Object.fromEntries(s.creneauxActifsIds.map(id => [id, jaugeMax(s, id)]))
  })

  const enregistrerSeance = async () => {
    const { s, intitule, mins, maxs } = seanceEditee
    // Une jauge égale à celle du créneau n'est pas gardée pour la date
    const propres = (m, defaut) => Object.fromEntries(Object.entries(m).map(([k, n]) => [k, n === (defaut[k] || 0) ? null : n]))
    try {
      await FirebaseService.modifierSeanceDispo(idJour(s.reelle), s.date, intitule, propres(mins, jauges), propres(maxs, jaugesMax))
      setDispos(await FirebaseService.getDispos())
      setSeanceEditee(null)
    } catch (e) {
      showToast('Séance non enregistrée', 'error')
    }
  }

  // Discussion d'une séance : fil du forum `type = "seance"`, `eleveId` = la date
  const filDe = date => forum.find(m => m.type === 'seance' && m.eleveId === date && !m.parentId)
  const reponsesDe = fil => fil ? forum.filter(m => m.parentId === fil.id).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)) : []

  const envoyer = async (date) => {
    if (!message.trim()) return
    const auteur = generatedBy || 'PWA'
    try {
      let fil = filDe(date)
      let filId = fil?.id
      if (!filId) {
        filId = await FirebaseService.addForumMessage({
          type: 'seance', eleveId: date, titre: `📅 Séance du ${date}`,
          contenu: `Discussion sur la séance du ${date}`, auteur, lu: [auteur]
        })
      }
      await FirebaseService.addForumMessage({ contenu: message.trim(), auteur, parentId: filId, lu: [auteur] })
      setMessage('')
      setForum(await FirebaseService.getForumMessages())
    } catch (e) {
      console.error('Erreur message:', e)
      showToast('Message non envoyé', 'error')
    }
  }

  if (isLoading) {
    return (
      <Layout title="Disponibilités">
        <div className="empty-state"><div className="loading-spinner"></div><p>Chargement...</p></div>
      </Layout>
    )
  }

  const puce = (actif, couleur) => ({
    padding: '4px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 13,
    border: actif ? '2px solid #000' : '1px solid #ccc',
    background: actif ? couleur : '#fff', fontWeight: actif ? 600 : 400
  })

  // Onglets où il reste à répondre (pour le cadre connecté) : ils clignotent en orange
  const moi = generatedBy
  const nbSeances = moi ? prochaines.reduce((n, s) => n + s.creneauxActifsIds.filter(cr => !((jourDe(s).votes || {})[cr] || {})[moi]).length, 0) : 0
  const nbSorties = moi ? sorties.filter(so => so.jour >= idJour(minuit) && !(so.votes || {})[moi]).length : 0
  const nbSortiesPrevues = sorties.filter(so => so.jour >= idJour(minuit)).length
  // Onglets matérialisés : liseré noir sur fond blanc, onglet ouvert en blanc sur noir
  const styleOnglet = (n, actif) => n > 0
    ? { animation: 'clignoteOrange 1.2s ease-in-out infinite', border: '2px solid red', fontWeight: 'bold', color: '#000' }
    : { border: '1px solid #000', background: actif ? '#000' : '#fff', color: actif ? '#fff' : '#000' }
  const pastille = { display: 'inline-block', minWidth: 16, padding: '0 4px', marginLeft: 4, borderRadius: 8, background: '#1565c0', color: '#fff', fontSize: 10, fontWeight: 'bold', lineHeight: '16px', textAlign: 'center' }
  const texteJauge = (oui, ideal, max) => {
    const base = ideal > 0 ? `${oui}/${ideal} encadrant(s)` : `${oui} oui`
    return max > 0 && oui >= max ? `${base} · 🔒 Complet` : max > 0 ? `${base} · max ${max}` : base
  }
  const compteur = (libelle, n, onChange) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
      <span style={{ flex: 1 }}>{libelle}</span>
      <button className="btn btn-secondary btn-sm" onClick={() => n > 0 && onChange(n - 1)}>−</button>
      <strong>{n > 0 ? n : '—'}</strong>
      <button className="btn btn-secondary btn-sm" onClick={() => onChange(n + 1)}>+</button>
    </div>
  )

  return (
    <Layout title="Disponibilités">
      <div className="card" style={{ marginBottom: 'var(--spacing-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        <button className="btn btn-sm" onClick={() => setOnglet('prochaines')} style={styleOnglet(nbSeances, onglet === 'prochaines')}>Prochaines {(termes?.seances || 'séances').toLowerCase()}{nbSeances > 0 && ` (${nbSeances})`}</button>
        <button className="btn btn-sm" onClick={() => setOnglet('sorties')} style={styleOnglet(nbSorties, onglet === 'sorties')}>🏔 Sorties{nbSorties > 0 && ` (${nbSorties})`}{nbSorties === 0 && nbSortiesPrevues > 0 && <span style={pastille}>{nbSortiesPrevues}</span>}</button>
        <button className="btn btn-sm" onClick={() => setOnglet('journal')} style={styleOnglet(0, onglet === 'journal')}>Journal</button>
        {onglet !== 'journal' && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            Répondre pour :
            <select className="form-input" value={pourQui} onChange={e => setPourQui(e.target.value)} style={{ width: 'auto' }}>
              <option value="">— choisir —</option>
              {[...cadres].sort((a, b) => a.id.localeCompare(b.id)).map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
            </select>
          </label>
        )}
        {estAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setShowJauges(!showJauges)}>⚙ Jauges</button>}
        <button className="btn btn-secondary btn-sm" onClick={charger}>🔄</button>
      </div>

      {estAdmin && showJauges && (
        <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <h3 className="card-title">Encadrants par {(termes?.creneau || 'créneau').toLowerCase()}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Idéal : en orange tant qu'il n'est pas atteint. Maximum : plus de « Oui » possibles une fois atteint. — = aucune. Chaque séance peut avoir ses propres réglages (✏️).</p>
          {creneaux.map(cr => (
            <div key={cr.id} style={{ padding: '4px 0' }}>
              <strong>{cr.nom} {cr.heureDebut}-{cr.heureFin}</strong>
              {compteur('Idéal', jauges[cr.id] || 0, n => reglerJauge(cr.id, n))}
              {compteur('Maximum', jaugesMax[cr.id] || 0, n => reglerJauge(cr.id, n, true))}
            </div>
          ))}
        </div>
      )}

      {onglet === 'prochaines' && (prochaines.length === 0
        ? <div className="empty-state"><div className="empty-state-title">Aucune séance à venir</div></div>
        : prochaines.map(s => {
          const jour = jourDe(s)
          const alerte = s.creneauxActifsIds.some(id => jaugeMin(s, id) > 0 && nbOuiDe(s, id) < jaugeMin(s, id))
          const fil = filDe(s.date)
          const reponses = reponsesDe(fil)
          return (
            <div key={s.id} className="card" style={{ marginBottom: 'var(--spacing-md)', border: alerte ? '3px solid #e65100' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ flex: 1 }}>{titreJour(s)}{intituleDe(s)}
                  {estAdmin && <span style={{ cursor: 'pointer', marginLeft: 8 }} title="Modifier la séance" onClick={() => ouvrirEdition(s)}>✏️</span>}
                </strong>
                <button className="btn btn-secondary btn-sm" onClick={() => setOuvert(ouvert === s.date ? null : s.date)}>
                  💬 {reponses.length || 'Discuter'}
                </button>
              </div>
              {creneaux.filter(c => s.creneauxActifsIds.includes(c.id)).map(cr => {
                const votes = (jour.votes || {})[cr.id] || {}
                const oui = Object.values(votes).filter(x => x.v === 'OUI').length
                const jauge = jaugeMin(s, cr.id)
                const max = jaugeMax(s, cr.id)
                const sous = jauge > 0 && oui < jauge
                const plein = max > 0 && oui >= max
                const bloque = ouiBloque(s, cr.id)
                const monVote = votes[pourQui]
                const sansReponse = cadres.map(c => c.id).filter(n => !votes[n]).sort()
                return (
                  <div key={cr.id} style={{ marginTop: 10, ...(sous ? { border: '2px solid #e65100', background: '#ffe0b2', borderRadius: 8, padding: 6 } : {}) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{cr.nom} {cr.heureDebut}-{cr.heureFin}</span>
                      <strong style={{ color: plein ? '#c62828' : sous ? '#e65100' : '#2e7d32' }}>{texteJauge(oui, jauge, max)}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {CHOIX.map(c => (
                        <span key={c.v} style={c.v === 'OUI' && bloque ? { ...puce(false), background: '#eee', color: '#888', cursor: 'not-allowed' } : puce(monVote?.v === c.v, c.couleur)}
                          onClick={() => voter(s, cr.id, c.v)}>{c.label}</span>
                      ))}
                    </div>
                    {monVote?.par && monVote.par !== pourQui && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>saisi par {monVote.par}</div>}
                    {s.reelle.getTime() === minuit.getTime() && pourQui && (() => {
                      const presents = (jour.presents || {})[cr.id] || []
                      const estLa = presents.includes(pourQui)
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 13 }}>
                          <span style={{ flex: 1 }}>Présents : {[...presents].sort().join(', ') || '—'}</span>
                          <button className="btn btn-secondary btn-sm" onClick={() => basculerPresent(s, cr.id, !estLa)}>
                            {estLa ? 'Retirer' : `✋ ${pourQui} est là`}
                          </button>
                        </div>
                      )
                    })()}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {[...CHOIX.map(c => {
                        const noms = Object.keys(votes).filter(n => votes[n].v === c.v).sort()
                        return noms.length ? `${c.label} : ${noms.join(', ')}` : null
                      }), sansReponse.length ? `Sans réponse : ${sansReponse.join(', ')}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                )
              })}
              {ouvert === s.date && (
                <div style={{ marginTop: 12, borderTop: '1px solid #ddd', paddingTop: 8 }}>
                  {reponses.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pas encore de message.</p>}
                  {reponses.map(r => (
                    <p key={r.id} style={{ fontSize: 13, margin: '4px 0' }}><strong>{r.auteur}</strong> : {r.contenu}</p>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input className="form-input" value={message} onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') envoyer(s.date) }} placeholder="Écrire un message..." style={{ flex: 1 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => envoyer(s.date)} disabled={!message.trim()}>📤</button>
                  </div>
                </div>
              )}
            </div>
          )
        }))}

      {onglet === 'sorties' && (
        <SortiesOnglet
          sorties={sorties}
          recharger={async () => setSorties(await FirebaseService.getSorties())}
          cadres={cadres}
          creneaux={creneaux}
          pourQui={pourQui}
          auteur={generatedBy || 'PWA'}
          estAdmin={estAdmin}
          dateEnJour={jjmm => {
            const d = dateReelle(jjmm, debutSaison)
            if (!d || `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` !== jjmm) return null
            return idJour(d)
          }}
          datesProposees={prochaines.map(s => ({ date: s.date, libelle: titreJour(s) }))}
          showToast={showToast}
        />
      )}

      {onglet === 'journal' && (() => {
        const bilan = {}
        // Présents d'un créneau : cochés à l'appel, sinon le cadre qui a validé l'appel
        const presentsDe = (s, crId) => {
          const coches = (jourDe(s).presents || {})[crId] || []
          if (coches.length) return coches
          const validateur = (s.cadreValidateur || {})[crId]
          return validateur ? [validateur] : []
        }
        passees.forEach(s => s.creneauxActifsIds.forEach(crId => presentsDe(s, crId).forEach(n => { bilan[n] = (bilan[n] || 0) + 1 })))
        return (
          <div className="card">
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>✓ = coché présent à l'appel · (oui) = s'était dit disponible</p>
            {Object.keys(bilan).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <strong>Présences sur la saison</strong>
                {Object.entries(bilan).sort((a, b) => b[1] - a[1]).map(([n, k]) => <div key={n}>{n} : {k}</div>)}
              </div>
            )}
            {passees.length === 0 && <p>Aucune séance passée.</p>}
            {passees.map(s => {
              const jour = jourDe(s)
              return (
                <div key={s.id} style={{ marginBottom: 8 }}>
                  <strong>{titreJour(s)}{intituleDe(s)}</strong>
                  {creneaux.filter(c => s.creneauxActifsIds.includes(c.id)).map(cr => {
                    const coches = presentsDe(s, cr.id)
                    const votes = (jour.votes || {})[cr.id] || {}
                    const ouiSeuls = Object.keys(votes).filter(n => votes[n].v === 'OUI' && !coches.includes(n))
                    const texte = [...[...coches].sort().map(n => `✓ ${n}`), ...ouiSeuls.sort().map(n => `${n} (oui)`)].join(', ') || 'personne de noté'
                    return <div key={cr.id} style={{ fontSize: 13, paddingLeft: 12 }}>{cr.nom} : {texte}</div>
                  })}
                </div>
              )
            })}
          </div>
        )
      })()}

      {seanceEditee && (
        <div className="modal-overlay" onClick={() => setSeanceEditee(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Modifier la séance — {titreJour(seanceEditee.s)}</h2>
              <button className="modal-close" onClick={() => setSeanceEditee(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="form-input" placeholder="Intitulé (facultatif)" value={seanceEditee.intitule}
                onChange={e => setSeanceEditee({ ...seanceEditee, intitule: e.target.value })} />
              {creneaux.filter(c => seanceEditee.s.creneauxActifsIds.includes(c.id)).map(cr => (
                <div key={cr.id}>
                  <strong>{cr.nom} {cr.heureDebut}-{cr.heureFin}</strong>
                  {compteur('Idéal', seanceEditee.mins[cr.id] || 0, n => setSeanceEditee({ ...seanceEditee, mins: { ...seanceEditee.mins, [cr.id]: n } }))}
                  {compteur('Maximum', seanceEditee.maxs[cr.id] || 0, n => setSeanceEditee({ ...seanceEditee, maxs: { ...seanceEditee.maxs, [cr.id]: n } }))}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSeanceEditee(null)}>Annuler</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={enregistrerSeance}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </Layout>
  )
}

export default DisposPage
