import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'
import { analyserCsv, fusionner } from '../services/ImportCsv'
import { ouvrirMessagerie } from '../services/Messagerie'
import { useApp } from '../App'

function MembresPage() {
  const navigate = useNavigate()
  const { termes } = useApp()
  const [eleves, setEleves] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [niveaux, setNiveaux] = useState([])
  // Filtres cumulables : plusieurs groupes et plusieurs passeports à la fois
  const [filtreGroupes, setFiltreGroupes] = useState([])
  const [filtreNiveaux, setFiltreNiveaux] = useState([])
  // Sélection pour l'envoi groupé
  const [selection, setSelection] = useState(new Set())
  const [expediteur, setExpediteur] = useState('')
  const [sortBy, setSortBy] = useState('nom')
  const [sortOrder, setSortOrder] = useState('asc')
  const [showModal, setShowModal] = useState(false)
  const [editingEleve, setEditingEleve] = useState(null)
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    groupe: '',
    telephone: '',
    email: '',
    creneauxIds: []
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Import CSV
  const fileInputRef = useRef(null)
  const [importData, setImportData] = useState(null)
  const [importEnCours, setImportEnCours] = useState(false)
  const [importProgression, setImportProgression] = useState(0)
  const [aideImport, setAideImport] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [elevesData, creneauxData, niveauxData, configEmail] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux(),
          FirebaseService.getNiveaux(),
          FirebaseService.getEmailConfig()
        ])
        setEleves(elevesData)
        setCreneaux(creneauxData)
        setNiveaux(niveauxData)
        setExpediteur(configEmail?.emailFrom || '')
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Liste unique des groupes
  const uniqueGroupes = [...new Set(eleves.map(e => e.groupe).filter(Boolean))].sort()

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const filteredAndSortedEleves = eleves
    .filter(e => {
      const searchLower = searchTerm.toLowerCase()
      const matchSearch = 
        (e.nom || '').toLowerCase().includes(searchLower) ||
        (e.prenom || '').toLowerCase().includes(searchLower) ||
        (e.email || '').toLowerCase().includes(searchLower) ||
        (e.telephone || '').includes(searchTerm)
      
      // Aucun filtre coché = tout le monde. Sinon, il suffit de correspondre à
      // l'un des choix : « jaunes ET orange » veut dire jaunes ou orange.
      const matchGroupe = filtreGroupes.length === 0 || filtreGroupes.includes(e.groupe)

      const niveauxMembre = Array.isArray(e.niveauIds) ? e.niveauIds : []
      const matchNiveau = filtreNiveaux.length === 0 || filtreNiveaux.some(f =>
        f === '__aucun' ? niveauxMembre.length === 0 : niveauxMembre.includes(f)
      )

      return matchSearch && matchGroupe && matchNiveau
    })
    .sort((a, b) => {
      const aVal = (a[sortBy] || '').toLowerCase()
      const bVal = (b[sortBy] || '').toLowerCase()
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })

  /** Ajoute ou retire une valeur d'un filtre multiple. */
  const basculerFiltre = (setter, valeur) => {
    setter(prev => prev.includes(valeur) ? prev.filter(v => v !== valeur) : [...prev, valeur])
  }

  /** Coche tout ce qui est actuellement affiché, en gardant la sélection déjà faite. */
  const selectionnerAffiches = () => {
    setSelection(prev => {
      const s = new Set(prev)
      filteredAndSortedEleves.forEach(e => s.add(e.id))
      return s
    })
  }

  const basculerSelection = (id) => {
    setSelection(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  // Seuls les membres sélectionnés qui ont une adresse peuvent être destinataires
  const avecEmail = eleves.filter(e => selection.has(e.id) && e.email && e.email.includes('@'))

  /**
   * Ouvre un message vers les personnes sélectionnées.
   * Les adresses partent en copie cachée : sans cela, chaque famille
   * recevrait la liste complète des adresses des autres.
   */
  const ecrireAuxSelectionnes = () => {
    if (avecEmail.length === 0) return
    const sansEmail = selection.size - avecEmail.length
    ouvrirMessagerie({
      destinataire: expediteur,        // le club s'écrit à lui-même
      copieCachee: avecEmail.map(e => e.email),
      sujet: '',
      corps: 'Bonjour,\n\n',
      expediteur
    })
    if (sansEmail > 0) {
      showToast(`${sansEmail} membre(s) sans adresse n'ont pas été inclus`, 'info')
    }
  }

  /** Niveau le plus avancé d'un membre — celui que l'app utilise pour la couleur. */
  const niveauPrincipal = (eleve) => {
    const ids = Array.isArray(eleve.niveauIds) ? eleve.niveauIds : []
    if (!ids.length) return null
    return niveaux.filter(n => ids.includes(n.id)).sort((a, b) => b.ordre - a.ordre)[0] || null
  }

  const getGroupeBadgeClass = (groupe) => {
    const groupeNum = parseInt(groupe?.replace(/\D/g, '')) || 0
    if (groupeNum >= 1 && groupeNum <= 5) return `badge-g${groupeNum}`
    return 'badge-standard'
  }

  const openAddModal = () => {
    setEditingEleve(null)
    setFormData({
      nom: '',
      prenom: '',
      groupe: '',
      telephones: [],
      email: '',
      creneauxIds: [],
      niveauIds: []
    })
    setShowModal(true)
  }

  const openEditModal = (eleve) => {
    setEditingEleve(eleve)
    setFormData({
      nom: eleve.nom || '',
      prenom: eleve.prenom || '',
      groupe: eleve.groupe || '',
      telephones: Array.isArray(eleve.telephones) ? eleve.telephones.map(c => ({ ...c })) : [],
      email: eleve.email || '',
      creneauxIds: eleve.creneauxIds || [],
      niveauIds: eleve.niveauIds || []
    })
    setShowModal(true)
  }

  // ── Contacts téléphoniques ──
  const ajouterContact = () => {
    setFormData(prev => ({
      ...prev,
      telephones: [...(prev.telephones || []), { numero: '', libelle: '', actifSMS: true }]
    }))
  }

  const modifierContact = (index, champs) => {
    setFormData(prev => ({
      ...prev,
      telephones: (prev.telephones || []).map((c, i) => i === index ? { ...c, ...champs } : c)
    }))
  }

  const retirerContact = (index) => {
    setFormData(prev => ({
      ...prev,
      telephones: (prev.telephones || []).filter((_, i) => i !== index)
    }))
  }

  const handleNiveauToggle = (niveauId) => {
    setFormData(prev => {
      const ids = prev.niveauIds || []
      return {
        ...prev,
        niveauIds: ids.includes(niveauId)
          ? ids.filter(id => id !== niveauId)
          : [...ids, niveauId]
      }
    })
  }

  const handleCreneauToggle = (creneauId) => {
    setFormData(prev => {
      const ids = prev.creneauxIds || []
      if (ids.includes(creneauId)) {
        return { ...prev, creneauxIds: ids.filter(id => id !== creneauId) }
      } else {
        return { ...prev, creneauxIds: [...ids, creneauId] }
      }
    })
  }

  const handleSave = async () => {
    if (!formData.nom.trim() || !formData.prenom.trim()) {
      showToast('Le nom et prénom sont obligatoires', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingEleve) {
        await FirebaseService.updateEleve(editingEleve.id, formData)
        showToast('Membre modifié avec succès', 'success')
      } else {
        await FirebaseService.addEleve(formData)
        showToast('Membre ajouté avec succès', 'success')
      }
      setShowModal(false)
      loadData()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (eleve) => {
    if (!confirm(`Supprimer "${eleve.prenom} ${eleve.nom}" ?`)) return

    try {
      await FirebaseService.deleteEleve(eleve.id)
      showToast('Membre supprimé', 'success')
      loadData()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  // ── Import CSV ──────────────────────────────────────────────────────
  const handleFichierCsv = async (e) => {
    const fichier = e.target.files?.[0]
    e.target.value = ''            // permet de réimporter le même fichier
    if (!fichier) return

    try {
      const contenu = await fichier.text()
      const resultat = analyserCsv(contenu, eleves)
      if (resultat.erreur) {
        showToast(resultat.erreur, 'error')
        return
      }
      setImportData({ ...resultat, nomFichier: fichier.name })
    } catch (error) {
      console.error('Erreur lecture CSV:', error)
      showToast('Impossible de lire ce fichier', 'error')
    }
  }

  const basculerLigne = (numeroLigne) => {
    setImportData(prev => ({
      ...prev,
      lignes: prev.lignes.map(l =>
        l.numeroLigne === numeroLigne ? { ...l, selectionne: !l.selectionne } : l
      )
    }))
  }

  /** Autorise le remplacement d'une valeur qui diffère de celle de la base. */
  const forcerChamp = (numeroLigne, champ) => {
    setImportData(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => {
        if (l.numeroLigne !== numeroLigne) return l
        const forces = l.champsForces || []
        const nouveaux = forces.includes(champ)
          ? forces.filter(c => c !== champ)
          : [...forces, champ]
        return {
          ...l,
          champsForces: nouveaux,
          // Remplacer une valeur suffit à justifier la mise à jour de la fiche
          action: l.existant && (nouveaux.length || l.complements.length) ? 'maj' : l.action,
          selectionne: l.selectionne || nouveaux.length > 0
        }
      })
    }))
  }

  const toutSelectionner = (valeur) => {
    setImportData(prev => ({
      ...prev,
      // Une ligne sans nom ni prénom reste inimportable
      lignes: prev.lignes.map(l => ({
        ...l,
        selectionne: valeur && !l.anomalies.includes('Nom et prénom vides')
      }))
    }))
  }

  const lancerImport = async () => {
    const aImporter = importData.lignes.filter(l => l.selectionne)
    if (aImporter.length === 0) return

    setImportEnCours(true)
    setImportProgression(0)
    let reussis = 0
    const echecs = []

    let misesAJour = 0

    for (let i = 0; i < aImporter.length; i++) {
      const ligne = aImporter[i]
      try {
        if (ligne.existant && ligne.action === 'maj') {
          // Complète la fiche existante sans écraser ce qui est déjà renseigné
          const fusionnee = fusionner(ligne.existant, ligne, ligne.champsForces || [])
          await FirebaseService.updateEleve(ligne.existant.id, fusionnee)
          misesAJour++
        } else {
          await FirebaseService.addEleve({
            nom: ligne.nom,
            prenom: ligne.prenom,
            email: ligne.email,
            telephones: ligne.telephones,
            libelle: ligne.libelle,
            numero_licence: ligne.numero_licence,
            creneauxIds: [],
            niveauIds: []
          })
          reussis++
        }
      } catch (error) {
        console.error(`Ligne ${ligne.numeroLigne} :`, error)
        echecs.push(`${ligne.nom} ${ligne.prenom}`.trim() || `ligne ${ligne.numeroLigne}`)
      }
      setImportProgression(Math.round(((i + 1) / aImporter.length) * 100))
    }

    await FirebaseService.addAuditLog(
      'IMPORT_CSV',
      `${reussis} créé(s), ${misesAJour} mis à jour`,
      `Import depuis la PWA (${importData.nomFichier})`
    )

    setImportEnCours(false)
    setImportData(null)
    await loadData()

    const bilan = [
      reussis ? `${reussis} ajouté(s)` : null,
      misesAJour ? `${misesAJour} mis à jour` : null
    ].filter(Boolean).join(', ') || 'rien à importer'

    if (echecs.length === 0) {
      showToast(bilan, 'success')
    } else {
      showToast(`${bilan} — ${echecs.length} en échec : ${echecs.slice(0, 3).join(', ')}`, 'error')
    }
  }

  const exportCSV = () => {
    const headers = ['Nom', 'Prénom', 'Groupe', 'Téléphone', 'Email']
    const rows = eleves.map(e => [
      e.nom || '',
      e.prenom || '',
      e.groupe || '',
      e.telephone || e.tel || '',
      e.email || ''
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `membres_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export CSV téléchargé', 'success')
  }

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ opacity: 0.3 }}> ↕</span>
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  if (isLoading) {
    return (
      <Layout title={termes.eleves}>
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={termes.eleves}>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            className="form-input"
            placeholder={`Rechercher un ${termes.eleve.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            🔄
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            📤 CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
            📥 Importer
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={handleFichierCsv}
          />
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            ➕ Ajouter
          </button>
        </div>
      </div>

      {/* Filtres cumulables : plusieurs groupes et plusieurs passeports à la fois */}
      <div className="card" style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' }}>

          {uniqueGroupes.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                GROUPES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {uniqueGroupes.map(g => {
                  const actif = filtreGroupes.includes(g)
                  return (
                    <button
                      key={g}
                      className="btn btn-sm"
                      onClick={() => basculerFiltre(setFiltreGroupes, g)}
                      style={{
                        background: actif ? 'var(--primary)' : 'var(--bg-elevated)',
                        color: actif ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid rgba(255,255,255,0.15)'
                      }}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {niveaux.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                PASSEPORTS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {niveaux.map(n => {
                  const actif = filtreNiveaux.includes(n.id)
                  return (
                    <button
                      key={n.id}
                      title={n.nom}
                      onClick={() => basculerFiltre(setFiltreNiveaux, n.id)}
                      style={{
                        width: '26px', height: '26px', padding: 0,
                        borderRadius: '50%', cursor: 'pointer',
                        background: n.couleur,
                        border: actif ? '3px solid var(--primary)' : '1px solid rgba(255,255,255,0.35)',
                        boxShadow: actif ? '0 0 0 2px rgba(255,255,255,0.3)' : 'none'
                      }}
                    />
                  )
                })}
                <button
                  className="btn btn-sm"
                  onClick={() => basculerFiltre(setFiltreNiveaux, '__aucun')}
                  style={{
                    background: filtreNiveaux.includes('__aucun') ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: filtreNiveaux.includes('__aucun') ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}
                >
                  sans passeport
                </button>
              </div>
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {filteredAndSortedEleves.length} / {eleves.length}
            </span>
            {(filtreGroupes.length > 0 || filtreNiveaux.length > 0) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setFiltreGroupes([]); setFiltreNiveaux([]) }}
              >
                ✕ Effacer les filtres
              </button>
            )}
          </div>
        </div>

        {/* Sélection, pour écrire à plusieurs personnes d'un coup */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
          marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button className="btn btn-secondary btn-sm" onClick={selectionnerAffiches}>
            ☑ Sélectionner les {filteredAndSortedEleves.length} affichés
          </button>
          {selection.size > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setSelection(new Set())}>
              ✕ Tout désélectionner
            </button>
          )}
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {selection.size} sélectionné(s)
            {selection.size > 0 && avecEmail.length !== selection.size &&
              ` — ${avecEmail.length} avec e-mail`}
          </span>
          <button
            className="btn btn-primary btn-sm"
            disabled={avecEmail.length === 0}
            onClick={ecrireAuxSelectionnes}
            style={{ marginLeft: 'auto' }}
          >
            ✉️ Écrire aux {avecEmail.length} sélectionné(s)
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredAndSortedEleves.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">
              {eleves.length === 0 ? 'Aucun membre' : 'Aucun résultat'}
            </div>
            <div className="empty-state-desc">
              {eleves.length === 0 
                ? 'Ajoutez des membres pour commencer'
                : `Aucun résultat pour "${searchTerm}"`
              }
            </div>
            {eleves.length === 0 && (
              <button className="btn btn-primary" onClick={openAddModal}>
                ➕ Ajouter un membre
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>
                    <input
                      type="checkbox"
                      title="Sélectionner tout ce qui est affiché"
                      checked={filteredAndSortedEleves.length > 0 &&
                               filteredAndSortedEleves.every(e => selection.has(e.id))}
                      onChange={(ev) => {
                        if (ev.target.checked) selectionnerAffiches()
                        else setSelection(prev => {
                          const s = new Set(prev)
                          filteredAndSortedEleves.forEach(e => s.delete(e.id))
                          return s
                        })
                      }}
                    />
                  </th>
                  <th onClick={() => handleSort('nom')} style={{ cursor: 'pointer' }}>
                    Nom<SortIcon field="nom" />
                  </th>
                  <th onClick={() => handleSort('prenom')} style={{ cursor: 'pointer' }}>
                    Prénom<SortIcon field="prenom" />
                  </th>
                  <th onClick={() => handleSort('groupe')} style={{ cursor: 'pointer' }}>
                    Groupe<SortIcon field="groupe" />
                  </th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th>Créneaux</th>
                  <th style={{ width: '90px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEleves.map(eleve => (
                  <tr 
                    key={eleve.id}
                    onClick={() => navigate(`/membre/${eleve.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Cocher ne doit pas ouvrir la fiche */}
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selection.has(eleve.id)}
                        onChange={() => basculerSelection(eleve.id)}
                      />
                    </td>
                    <td style={{ fontWeight: 600 }}>{eleve.nom || '-'}</td>
                    <td>{eleve.prenom || '-'}</td>
                    <td>
                      {eleve.groupe && (
                        <span className={`badge ${getGroupeBadgeClass(eleve.groupe)}`}>
                          {eleve.groupe}
                        </span>
                      )}
                      {(() => {
                        const n = niveauPrincipal(eleve)
                        if (!n) return null
                        // Une simple pastille : le nom du niveau est dans l'infobulle
                        return (
                          <span
                            title={n.nom}
                            style={{
                              display: 'inline-block',
                              width: '14px', height: '14px',
                              borderRadius: '50%',
                              background: n.couleur,
                              border: '1px solid rgba(255,255,255,0.45)',
                              boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
                              verticalAlign: 'middle',
                              marginLeft: eleve.groupe ? '8px' : 0
                            }}
                          />
                        )
                      })()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {eleve.telephone || eleve.tel || '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {eleve.email || '-'}
                    </td>
                    <td>
                      {eleve.creneauxIds?.length > 0 && (
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>
                          {eleve.creneauxIds.length} créneau(x)
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn btn-secondary btn-icon"
                          onClick={(e) => { e.stopPropagation(); openEditModal(eleve); }}
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-danger btn-icon"
                          onClick={(e) => { e.stopPropagation(); handleDelete(eleve); }}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compteur */}
      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 'var(--spacing-md)' }}>
        {filteredAndSortedEleves.length} membre(s) sur {eleves.length}
      </p>

      {/* Modal ajout/édition */}
      {/* Aperçu avant import CSV */}
      {importData && (
        <div className="modal-overlay" onClick={() => !importEnCours && setImportData(null)}>
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(680px, 96vw)', maxWidth: '96vw' }}
          >
            <div className="modal-header">
              <h2 className="modal-title">📥 Importer {importData.nomFichier}</h2>
              {!importEnCours && (
                <button className="modal-close" onClick={() => setImportData(null)}>×</button>
              )}
            </div>

            <div className="modal-body">
              {(() => {
                const aCreer = importData.lignes.filter(l => l.selectionne && l.action === 'creer').length
                const aMaj = importData.lignes.filter(l => l.selectionne && l.action === 'maj').length
                const sansChangement = importData.lignes.filter(l => !l.selectionne).length

                return (
                  <>
                    <p style={{ fontSize: '0.9rem', marginTop: 0 }}>
                      <strong>{importData.lignes.length}</strong> ligne(s) dans le fichier :{' '}
                      <span style={{ color: '#67c23a' }}>{aCreer} à ajouter</span> ·{' '}
                      <span style={{ color: '#409eff' }}>{aMaj} à compléter</span> ·{' '}
                      <span style={{ opacity: 0.7 }}>{sansChangement} sans changement</span>
                    </p>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAideImport(v => !v)}
                      style={{ marginBottom: '8px' }}
                    >
                      ❓ Que veulent dire ces mentions ?
                    </button>

                    {aideImport && (
                      <div style={{
                        background: 'rgba(0,0,0,0.05)', borderRadius: '8px',
                        padding: '10px 12px', fontSize: '0.82rem', lineHeight: 1.6,
                        marginBottom: '10px'
                      }}>
                        <div><span style={{ color: '#67c23a' }}>✓ Nouveau</span> — cette personne n'est pas
                          encore dans la base : elle sera ajoutée.</div>
                        <div><span style={{ color: '#409eff' }}>↻ À compléter</span> — la personne existe
                          déjà, et le fichier apporte une information absente de sa fiche. Rien n'est
                          remplacé : on ne fait qu'ajouter.</div>
                        <div><span style={{ color: '#e6a23c' }}>⚠️ Valeur différente</span> — la fiche et le
                          fichier ne disent pas la même chose. Par précaution la fiche garde sa valeur ;
                          cochez « remplacer » pour prendre celle du fichier.</div>
                        <div style={{ opacity: 0.8, marginTop: '4px' }}>
                          Une adresse « * » dans la fiche vient d'un ancien import défectueux de
                          l'application : dans ce cas, cochez « remplacer » sans hésiter.
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', margin: '10px 0' }}>
                      <button className="btn btn-secondary btn-sm" disabled={importEnCours}
                              onClick={() => toutSelectionner(true)}>Tout cocher</button>
                      <button className="btn btn-secondary btn-sm" disabled={importEnCours}
                              onClick={() => toutSelectionner(false)}>Tout décocher</button>
                    </div>

                    {/* Une fiche par bloc : lisible à toute largeur, sans défilement latéral */}
                    <div style={{ maxHeight: '46vh', overflowY: 'auto', overflowX: 'hidden' }}>
                      {importData.lignes.map(ligne => {
                        const bloquee = ligne.anomalies.includes('Nom et prénom vides')
                        return (
                          <div
                            key={ligne.numeroLigne}
                            style={{
                              border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px',
                              padding: '10px 12px', marginBottom: '8px',
                              opacity: ligne.selectionne ? 1 : 0.6,
                              overflowWrap: 'anywhere'
                            }}
                          >
                            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <input
                                type="checkbox"
                                checked={ligne.selectionne}
                                disabled={importEnCours || bloquee}
                                onChange={() => basculerLigne(ligne.numeroLigne)}
                                style={{ marginTop: '3px' }}
                              />
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: 600 }}>
                                  {(ligne.nom || '').toUpperCase()} {ligne.prenom}
                                </span>

                                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '2px' }}>
                                  {ligne.email || 'sans e-mail'}
                                  {ligne.telephones.length > 0 && ' · ' + ligne.telephones.map(t => t.numero).join(' / ')}
                                </div>

                                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                                  {ligne.anomalies.length > 0 && (
                                    <div style={{ color: '#f56c6c' }}>⚠️ {ligne.anomalies.join(', ')}</div>
                                  )}
                                  {!ligne.doublon && ligne.anomalies.length === 0 && (
                                    <span style={{ color: '#67c23a' }}>✓ Nouveau — sera ajouté</span>
                                  )}
                                  {ligne.doublon && ligne.action === 'maj' && (
                                    <span style={{ color: '#409eff' }}>
                                      ↻ Déjà dans la base — à compléter :{' '}
                                      {ligne.complements.map(c => c.libelle).join(', ')}
                                    </span>
                                  )}
                                  {ligne.doublon && ligne.action === 'ignorer' && (
                                    <span style={{ opacity: 0.7 }}>
                                      Déjà dans la base, rien de nouveau à ajouter
                                    </span>
                                  )}
                                </div>
                              </span>
                            </label>

                            {ligne.differences && ligne.differences.length > 0 && (
                              <div style={{ marginTop: '8px', paddingLeft: '28px' }}>
                                {ligne.differences.map(d => (
                                  <div
                                    key={d.champ}
                                    style={{
                                      background: 'rgba(230,162,60,0.12)', borderRadius: '6px',
                                      padding: '6px 8px', marginTop: '4px', fontSize: '0.8rem'
                                    }}
                                  >
                                    <div style={{ color: '#e6a23c', fontWeight: 600 }}>
                                      ⚠️ {d.libelle} différent
                                    </div>
                                    <div>Fiche actuelle : <strong>{String(d.ancien) || '(vide)'}</strong></div>
                                    <div>Fichier : <strong>{String(d.nouveau)}</strong></div>
                                    <label style={{ cursor: 'pointer', display: 'inline-block', marginTop: '4px' }}>
                                      <input
                                        type="checkbox"
                                        disabled={importEnCours}
                                        checked={(ligne.champsForces || []).includes(d.champ)}
                                        onChange={() => forcerChamp(ligne.numeroLigne, d.champ)}
                                      />{' '}
                                      remplacer par la valeur du fichier
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <details style={{ marginTop: '10px', fontSize: '0.78rem', opacity: 0.8 }}>
                      <summary style={{ cursor: 'pointer' }}>Colonnes reconnues dans le fichier</summary>
                      <div style={{ marginTop: '6px' }}>
                        {Object.entries(importData.colonnes)
                          .filter(([, i]) => i >= 0)
                          .map(([champ, i]) => `${champ} → « ${importData.enTetes[i]} »`)
                          .join(' · ') || 'aucune'}
                      </div>
                    </details>

                    {importEnCours && (
                      <p style={{ fontSize: '0.85rem', marginBottom: 0 }}>
                        Import en cours… {importProgression} %
                      </p>
                    )}
                  </>
                )
              })()}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" disabled={importEnCours}
                      onClick={() => setImportData(null)}>Annuler</button>
              <button className="btn btn-primary"
                      disabled={importEnCours || importData.lignes.every(l => !l.selectionne)}
                      onClick={lancerImport}>
                {importEnCours
                  ? `Import… ${importProgression} %`
                  : `Valider (${importData.lignes.filter(l => l.selectionne).length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingEleve ? '✏️ Modifier le membre' : '➕ Nouveau membre'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="DUPONT"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prénom *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Jean"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Groupe</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="G1, G2..."
                    value={formData.groupe}
                    onChange={(e) => setFormData({ ...formData, groupe: e.target.value })}
                  />
                </div>
              </div>

              {/* Contacts téléphoniques — l'application en gère plusieurs,
                  avec un libellé et un indicateur « reçoit les SMS ». */}
              <div className="form-group">
                <label className="form-label">Téléphones</label>
                <div style={{
                  padding: '12px', background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {(formData.telephones || []).length === 0 && (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                      Aucun numéro enregistré.
                    </p>
                  )}

                  {(formData.telephones || []).map((contact, i) => (
                    <div key={i} style={{
                      display: 'flex', flexWrap: 'wrap', gap: '8px',
                      alignItems: 'center', marginBottom: '8px'
                    }}>
                      <input
                        type="tel"
                        className="form-input"
                        style={{ flex: '1 1 150px' }}
                        placeholder="06 12 34 56 78"
                        value={contact.numero || ''}
                        onChange={(e) => modifierContact(i, { numero: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: '1 1 110px' }}
                        placeholder="Papa, Maman…"
                        value={contact.libelle || ''}
                        onChange={(e) => modifierContact(i, { libelle: e.target.value })}
                      />
                      <label
                        title="Ce numéro reçoit les SMS d'absence"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px',
                                 fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <input
                          type="checkbox"
                          checked={contact.actifSMS !== false}
                          onChange={(e) => modifierContact(i, { actifSMS: e.target.checked })}
                        />
                        SMS
                      </label>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => retirerContact(i)}
                        title="Retirer ce numéro"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  <button className="btn btn-secondary btn-sm" onClick={ajouterContact}>
                    ➕ Ajouter un numéro
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="jean.dupont@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {creneaux.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Créneaux</label>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {creneaux.map(c => (
                      <label 
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: formData.creneauxIds?.includes(c.id) ? 'var(--primary)' : 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.creneauxIds?.includes(c.id)}
                          onChange={() => handleCreneauToggle(c.id)}
                          style={{ display: 'none' }}
                        />
                        {c.nom}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {niveaux.length > 0 && (
                <div className="form-group">
                  <label className="form-label">
                    Passeport / niveau
                    {(formData.niveauIds?.length > 0) && (
                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                        {' '}— {niveaux.filter(n => formData.niveauIds.includes(n.id)).map(n => n.nom).join(', ')}
                      </span>
                    )}
                  </label>
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px',
                    padding: '12px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {niveaux.map(n => {
                      const actif = formData.niveauIds?.includes(n.id)
                      return (
                        <label
                          key={n.id}
                          title={n.nom}
                          style={{ cursor: 'pointer', lineHeight: 0 }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(actif)}
                            onChange={() => handleNiveauToggle(n.id)}
                            style={{ display: 'none' }}
                          />
                          <span style={{
                            display: 'inline-block',
                            width: '30px', height: '30px',
                            borderRadius: '50%',
                            background: n.couleur,
                            // le niveau retenu se distingue par un anneau, pas par du texte
                            border: actif ? '3px solid var(--primary)' : '1px solid rgba(255,255,255,0.35)',
                            boxShadow: actif ? '0 0 0 2px rgba(255,255,255,0.25)' : 'none'
                          }} />
                        </label>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Touchez une pastille pour attribuer ou retirer le passeport.
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MembresPage
