import React, { useState, useEffect } from 'react'
import { FirebaseService } from '../services/FirebaseService'

/**
 * 🏔 Sorties (même données que Sorties.kt de l'application).
 * Le jour de la sortie, ses élèves quittent leur créneau habituel (🏔 dans le tableau,
 * ni absence ni SMS) ; « annulerSalle » annule tous les créneaux en salle du jour.
 */

const CHOIX = [
  { v: 'OUI', label: 'Oui', couleur: '#c8e6c9' },
  { v: 'PEUT_ETRE', label: 'Peut-être', couleur: '#fff9c4' },
  { v: 'NON', label: 'Non', couleur: '#ffcdd2' }
]
const POINTAGES = [
  { v: 'PRESENT', label: 'P', couleur: '#c8e6c9' },
  { v: 'ABSENT', label: 'A', couleur: '#ffcdd2' },
  { v: 'EXCUSE', label: 'E', couleur: '#fff9c4' }
]
const JOURS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const pad = n => String(n).padStart(2, '0')
const VIDE = { titre: '', date: '', heureDebut: '09:00', heureFin: '17:00', lieu: '', jauge: 0, jaugeMax: 0, eleves: [], cadres: [], annulerSalle: false }

function SortiesOnglet({ sorties, recharger, cadres, creneaux, pourQui, auteur, estAdmin, dateEnJour, datesProposees, showToast }) {
  const [eleves, setEleves] = useState([])
  const [edition, setEdition] = useState(null)
  const [appel, setAppel] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [referent, setReferent] = useState('')
  const [presentsCadres, setPresentsCadres] = useState([])

  useEffect(() => { FirebaseService.getEleves().then(setEleves) }, [])

  const aujourdhui = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` })()
  const aVenir = sorties.filter(s => s.jour >= aujourdhui).sort((a, b) => (a.jour + a.heureDebut).localeCompare(b.jour + b.heureDebut))
  const passees = sorties.filter(s => s.jour < aujourdhui).sort((a, b) => (b.jour + b.heureDebut).localeCompare(a.jour + a.heureDebut))
  const titreJour = s => { const d = new Date(s.jour); return `${isNaN(d) ? '' : JOURS[d.getDay()]} ${s.date}` }
  const nomEleve = id => { const e = eleves.find(x => x.id === id); return e ? `${e.prenom} ${e.nom}` : id }
  const nbOui = s => Object.values(s.votes || {}).filter(x => x.v === 'OUI').length
  const sousJauge = s => (s.jauge || 0) > 0 && nbOui(s) < s.jauge
  const plein = s => (s.jaugeMax || 0) > 0 && nbOui(s) >= s.jaugeMax
  // Maximum atteint : plus de Oui pour ce cadre (sauf s'il l'a déjà dit, ou si on est admin)
  const ouiBloque = s => !estAdmin && plein(s) && (s.votes || {})[pourQui]?.v !== 'OUI'
  // Organisation et réglages : admin ou auteur de la sortie
  const modifiable = s => estAdmin || (!!s.creePar && s.creePar === auteur)
  const texteJauge = s => {
    const base = s.jauge > 0 ? `${nbOui(s)}/${s.jauge} encadrant(s)` : `${nbOui(s)} oui`
    return plein(s) ? `${base} · 🔒 Complet` : s.jaugeMax > 0 ? `${base} · max ${s.jaugeMax}` : base
  }

  const puce = (actif, couleur) => ({
    padding: '4px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 13,
    border: actif ? '2px solid #000' : '1px solid #ccc',
    background: actif ? couleur : '#fff', fontWeight: actif ? 600 : 400
  })

  const voter = async (s, v) => {
    if (!pourQui) { showToast('Choisir pour qui répondre', 'error'); return }
    if (v === 'OUI' && ouiBloque(s)) { showToast('Complet : le nombre maximal d\'encadrants est atteint', 'error'); return }
    try { await FirebaseService.voterSortie(s.id, pourQui, v, auteur); await recharger() }
    catch (e) { showToast('Vote non enregistré', 'error') }
  }

  const enregistrer = async () => {
    const e = edition
    if (e.id && !modifiable(e)) { showToast('Seul l\'auteur de la sortie ou un admin peut la modifier', 'error'); return }
    if (!e.titre.trim()) { showToast('Indique un titre', 'error'); return }
    const jour = dateEnJour(e.date)
    if (!/^\d{2}\/\d{2}$/.test(e.date) || !jour) { showToast('Date invalide (JJ/MM)', 'error'); return }
    if (!/^\d{2}:\d{2}$/.test(e.heureDebut) || !/^\d{2}:\d{2}$/.test(e.heureFin)) { showToast('Heures invalides (HH:MM)', 'error'); return }
    try {
      await FirebaseService.enregistrerSortie({ ...e, titre: e.titre.trim(), lieu: e.lieu.trim(), jour }, auteur)
      setEdition(null)
      await recharger()
    } catch (err) { showToast('Sortie non enregistrée', 'error') }
  }

  const supprimer = async s => {
    if (!confirm(`Supprimer la sortie « ${s.titre} » du ${s.date} ?`)) return
    try { await FirebaseService.supprimerSortie(s.id); await recharger() }
    catch (e) { showToast('Suppression impossible', 'error') }
  }

  const ouvrirAppel = s => {
    setAppel(s.id)
    setReferent(s.cadreReferent || auteur || '')
    setPresentsCadres(s.presentsCadres?.length ? s.presentsCadres : (s.cadres || []))
  }

  const pointer = async (s, eleveId, valeur) => {
    try { await FirebaseService.pointerSortie(s.id, eleveId, valeur); await recharger() }
    catch (e) { showToast('Pointage non enregistré', 'error') }
  }

  const validerAppel = async s => {
    const toutPointe = (s.eleves || []).every(id => (s.presences || {})[id])
    if (!toutPointe || !referent) { showToast('Toutes les présences doivent être pointées et un cadre référent choisi', 'error'); return }
    try { await FirebaseService.validerSortie(s.id, referent, presentsCadres); setAppel(null); await recharger() }
    catch (e) { showToast('Validation impossible', 'error') }
  }

  const basculer = (liste, x) => liste.includes(x) ? liste.filter(y => y !== x) : [...liste, x]
  const sortieAppel = sorties.find(s => s.id === appel)

  return (
    <div>
      <button className="btn btn-primary" style={{ marginBottom: 'var(--spacing-md)' }} onClick={() => { setRecherche(''); setEdition({ ...VIDE }) }}>＋ Nouvelle sortie</button>

      {aVenir.length === 0 && <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>Aucune sortie prévue.</div>}
      {aVenir.map(s => {
        const monVote = (s.votes || {})[pourQui]
        return (
          <div key={s.id} className="card" style={{ marginBottom: 'var(--spacing-md)', border: sousJauge(s) ? '3px solid #e65100' : undefined, background: sousJauge(s) ? '#ffe0b2' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>🏔 {s.titre}</strong>
              <strong style={{ color: plein(s) ? '#c62828' : sousJauge(s) ? '#e65100' : '#2e7d32' }}>{texteJauge(s)}</strong>
            </div>
            <div>{titreJour(s)} · 🕘 {s.heureDebut}-{s.heureFin}{s.lieu ? ` · 📍 ${s.lieu}` : ''}</div>
            {s.annulerSalle && <div style={{ color: '#c62828', fontWeight: 600, fontSize: 13 }}>🚫 Séances en salle annulées ce jour</div>}
            <div style={{ fontSize: 13 }}>Encadrants prévus : {[...(s.cadres || [])].sort().join(', ') || '—'} · {(s.eleves || []).length} inscrit(s)</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {CHOIX.map(c => <span key={c.v} style={c.v === 'OUI' && ouiBloque(s) ? { ...puce(false), background: '#eee', color: '#888', cursor: 'not-allowed' } : puce(monVote?.v === c.v, c.couleur)} onClick={() => voter(s, c.v)}>{c.label}</span>)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {CHOIX.map(c => {
                const noms = Object.keys(s.votes || {}).filter(n => s.votes[n].v === c.v).sort()
                return noms.length ? `${c.label} : ${noms.join(', ')}` : null
              }).filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => ouvrirAppel(s)}>📋 Appel{s.valide ? ' ✓' : ''}</button>
              {modifiable(s) && <button className="btn btn-secondary btn-sm" onClick={() => { setRecherche(''); setEdition({ ...VIDE, ...s }) }}>✏ Modifier</button>}
              {modifiable(s) && <button className="btn btn-secondary btn-sm" onClick={() => supprimer(s)}>🗑</button>}
            </div>
          </div>
        )
      })}

      <div className="card">
        <h3 className="card-title">📒 Journal des sorties</h3>
        {passees.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucune sortie passée.</p>}
        {passees.map(s => {
          const presents = (s.eleves || []).filter(id => (s.presences || {})[id] === 'PRESENT').length
          return (
            <div key={s.id} style={{ marginBottom: 10, cursor: 'pointer' }} onClick={() => ouvrirAppel(s)}>
              <strong>{titreJour(s)} · {s.titre}</strong>
              <div style={{ fontSize: 13 }}>🕘 {s.heureDebut}-{s.heureFin} · 📍 {s.lieu || '—'}</div>
              <div style={{ fontSize: 13 }}>Encadrants : {[...((s.presentsCadres?.length ? s.presentsCadres : s.cadres) || [])].sort().join(', ') || '—'}</div>
              <div style={{ fontSize: 13 }}>Présents : {presents} / {(s.eleves || []).length}{s.valide ? ' ✓' : ''}</div>
            </div>
          )
        })}
      </div>

      {edition && (
        <div className="modal-overlay" onClick={() => setEdition(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">{edition.id ? '✏ Modifier la sortie' : '＋ Nouvelle sortie'}</h2>
              <button className="modal-close" onClick={() => setEdition(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="form-input" placeholder="Titre (ex. Escalade en falaise)" value={edition.titre} onChange={e => setEdition({ ...edition, titre: e.target.value })} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="JJ/MM" value={edition.date} onChange={e => setEdition({ ...edition, date: e.target.value.slice(0, 5) })} />
                <input className="form-input" type="time" value={edition.heureDebut} onChange={e => setEdition({ ...edition, heureDebut: e.target.value })} />
                <input className="form-input" type="time" value={edition.heureFin} onChange={e => setEdition({ ...edition, heureFin: e.target.value })} />
              </div>
              {datesProposees.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {datesProposees.map(d => <span key={d.date} style={puce(edition.date === d.date, '#bbdefb')} onClick={() => setEdition({ ...edition, date: d.date })}>{d.libelle}</span>)}
                </div>
              )}
              <input className="form-input" placeholder="Lieu" value={edition.lieu} onChange={e => setEdition({ ...edition, lieu: e.target.value })} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Encadrants nécessaires
                <button className="btn btn-secondary btn-sm" onClick={() => setEdition({ ...edition, jauge: Math.max(0, (edition.jauge || 0) - 1) })}>−</button>
                <strong>{edition.jauge || 0}</strong>
                <button className="btn btn-secondary btn-sm" onClick={() => setEdition({ ...edition, jauge: (edition.jauge || 0) + 1 })}>+</button>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Encadrants maximum
                <button className="btn btn-secondary btn-sm" onClick={() => setEdition({ ...edition, jaugeMax: Math.max(0, (edition.jaugeMax || 0) - 1) })}>−</button>
                <strong>{edition.jaugeMax > 0 ? edition.jaugeMax : '—'}</strong>
                <button className="btn btn-secondary btn-sm" onClick={() => setEdition({ ...edition, jaugeMax: (edition.jaugeMax || 0) + 1 })}>+</button>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!edition.annulerSalle} onChange={e => setEdition({ ...edition, annulerSalle: e.target.checked })} />
                Annuler toutes les séances en salle ce jour-là
              </label>
              <strong>Encadrants de la sortie</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[...cadres].sort((a, b) => a.id.localeCompare(b.id)).map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={(edition.cadres || []).includes(c.id)} onChange={() => setEdition({ ...edition, cadres: basculer(edition.cadres || [], c.id) })} />
                    {c.id}
                  </label>
                ))}
              </div>
              <strong>Élèves inscrits ({(edition.eleves || []).length})</strong>
              <input className="form-input" placeholder="Rechercher un élève" value={recherche} onChange={e => setRecherche(e.target.value)} />
              {creneaux.map(cr => {
                const f = recherche.trim().toLowerCase()
                const liste = eleves.filter(e => (e.creneauxIds || []).includes(cr.id))
                  .filter(e => !f || `${e.prenom} ${e.nom}`.toLowerCase().includes(f))
                  .sort((a, b) => (a.prenom || '').localeCompare(b.prenom || ''))
                if (liste.length === 0) return null
                return (
                  <div key={cr.id}>
                    <div style={{ color: 'var(--info)', fontWeight: 600, fontSize: 13 }}>{cr.nom}</div>
                    {liste.map(e => (
                      <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={(edition.eleves || []).includes(e.id)} onChange={() => setEdition({ ...edition, eleves: basculer(edition.eleves || [], e.id) })} />
                        {e.prenom} {e.nom}
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEdition(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={enregistrer}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {sortieAppel && (
        <div className="modal-overlay" onClick={() => setAppel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">📋 {sortieAppel.titre} — {titreJour(sortieAppel)}</h2>
              <button className="modal-close" onClick={() => setAppel(null)}>×</button>
            </div>
            <div className="modal-body">
              {sortieAppel.valide && <p style={{ color: '#2e7d32' }}>✓ Appel validé par {sortieAppel.cadreReferent}</p>}
              {[...(sortieAppel.eleves || [])].sort((a, b) => nomEleve(a).localeCompare(nomEleve(b))).map(id => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                  <span style={{ flex: 1 }}>{nomEleve(id)}</span>
                  {POINTAGES.map(p => (
                    <span key={p.v} style={puce((sortieAppel.presences || {})[id] === p.v, p.couleur)} onClick={() => pointer(sortieAppel, id, p.v)}>{p.label}</span>
                  ))}
                </div>
              ))}
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
                Cadre référent :
                <select className="form-input" value={referent} onChange={e => setReferent(e.target.value)} style={{ width: 'auto' }}>
                  <option value="">— choisir —</option>
                  {[...cadres].sort((a, b) => a.id.localeCompare(b.id)).map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select>
              </label>
              <strong style={{ display: 'block', marginTop: 8 }}>Cadres présents</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[...cadres].sort((a, b) => a.id.localeCompare(b.id)).map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={presentsCadres.includes(c.id)} onChange={() => setPresentsCadres(basculer(presentsCadres, c.id))} />
                    {c.id}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAppel(null)}>Fermer</button>
              <button className="btn btn-primary" onClick={() => validerAppel(sortieAppel)}>Valider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SortiesOnglet
