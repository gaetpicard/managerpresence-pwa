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
      setSeances(s); setCreneaux(cr); setCadres(ca); setDispos(d); setJauges(j); setForum(f); setSorties(so)
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
  const nomCreneau = id => creneaux.find(c => c.id === id)
  const jourDe = s => dispos[idJour(s.reelle)] || {}
  const titreJour = s => `${JOURS[s.reelle.getDay()]} ${s.date}`

  const voter = async (s, creneauId, v) => {
    if (!pourQui) { showToast('Choisir pour qui répondre', 'error'); return }
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

  const reglerJauge = async (creneauId, n) => {
    if (n < 0) return
    try {
      await FirebaseService.reglerJaugeDispo(creneauId, n)
      setJauges(prev => ({ ...prev, [creneauId]: n }))
    } catch (e) {
      showToast('Jauge non enregistrée', 'error')
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

  return (
    <Layout title="Disponibilités">
      <div className="card" style={{ marginBottom: 'var(--spacing-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        <button className={`btn btn-sm ${onglet === 'prochaines' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOnglet('prochaines')}>Prochaines {(termes?.seances || 'séances').toLowerCase()}</button>
        <button className={`btn btn-sm ${onglet === 'sorties' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOnglet('sorties')}>🏔 Sorties</button>
        <button className={`btn btn-sm ${onglet === 'journal' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOnglet('journal')}>Journal</button>
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
          <h3 className="card-title">Encadrants idéaux par {(termes?.creneau || 'créneau').toLowerCase()}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>0 = pas de jauge (jamais en orange).</p>
          {creneaux.map(cr => (
            <div key={cr.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span style={{ flex: 1 }}>{cr.nom}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => reglerJauge(cr.id, (jauges[cr.id] || 0) - 1)}>−</button>
              <strong>{jauges[cr.id] || 0}</strong>
              <button className="btn btn-secondary btn-sm" onClick={() => reglerJauge(cr.id, (jauges[cr.id] || 0) + 1)}>+</button>
            </div>
          ))}
        </div>
      )}

      {onglet === 'prochaines' && (prochaines.length === 0
        ? <div className="empty-state"><div className="empty-state-title">Aucune séance à venir</div></div>
        : prochaines.map(s => {
          const jour = jourDe(s)
          const alerte = s.creneauxActifsIds.some(id => (jauges[id] || 0) > 0 &&
            Object.values((jour.votes || {})[id] || {}).filter(x => x.v === 'OUI').length < jauges[id])
          const fil = filDe(s.date)
          const reponses = reponsesDe(fil)
          return (
            <div key={s.id} className="card" style={{ marginBottom: 'var(--spacing-md)', border: alerte ? '3px solid #e65100' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{titreJour(s)}</strong>
                <button className="btn btn-secondary btn-sm" onClick={() => setOuvert(ouvert === s.date ? null : s.date)}>
                  💬 {reponses.length || 'Discuter'}
                </button>
              </div>
              {s.creneauxActifsIds.map(id => nomCreneau(id)).filter(Boolean).map(cr => {
                const votes = (jour.votes || {})[cr.id] || {}
                const oui = Object.values(votes).filter(x => x.v === 'OUI').length
                const jauge = jauges[cr.id] || 0
                const sous = jauge > 0 && oui < jauge
                const monVote = votes[pourQui]
                const sansReponse = cadres.map(c => c.id).filter(n => !votes[n]).sort()
                return (
                  <div key={cr.id} style={{ marginTop: 10, ...(sous ? { border: '2px solid #e65100', background: '#ffe0b2', borderRadius: 8, padding: 6 } : {}) }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{cr.nom} {cr.heureDebut}-{cr.heureFin}</span>
                      <strong style={{ color: sous ? '#e65100' : '#2e7d32' }}>{jauge > 0 ? `${oui}/${jauge} encadrant(s)` : `${oui} oui`}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {CHOIX.map(c => (
                        <span key={c.v} style={puce(monVote?.v === c.v, c.couleur)} onClick={() => voter(s, cr.id, c.v)}>{c.label}</span>
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
        passees.forEach(s => Object.values(jourDe(s).presents || {}).flat().forEach(n => { bilan[n] = (bilan[n] || 0) + 1 }))
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
                  <strong>{titreJour(s)}</strong>
                  {s.creneauxActifsIds.map(id => nomCreneau(id)).filter(Boolean).map(cr => {
                    const coches = (jour.presents || {})[cr.id] || []
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

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </Layout>
  )
}

export default DisposPage
