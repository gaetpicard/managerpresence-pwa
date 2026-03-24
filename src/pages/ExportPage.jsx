import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function ExportPage() {
  const [eleves, setEleves] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [presences, setPresences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Filtres
  const [periodeType, setPeriodeType] = useState('month')
  const [periodeDebut, setPeriodeDebut] = useState('')
  const [periodeFin, setPeriodeFin] = useState('')
  const [selectedEleves, setSelectedEleves] = useState([])
  const [selectAll, setSelectAll] = useState(true)
  const [filterGroupe, setFilterGroupe] = useState('')
  const [exportFormat, setExportFormat] = useState('csv')

  useEffect(() => {
    loadData()
    // Initialiser les dates par défaut (mois en cours)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setPeriodeDebut(firstDay.toISOString().split('T')[0])
    setPeriodeFin(lastDay.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    // Mettre à jour les dates selon le type de période
    const now = new Date()
    if (periodeType === 'week') {
      const firstDay = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      setPeriodeDebut(firstDay.toISOString().split('T')[0])
      setPeriodeFin(now.toISOString().split('T')[0])
    } else if (periodeType === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setPeriodeDebut(firstDay.toISOString().split('T')[0])
      setPeriodeFin(lastDay.toISOString().split('T')[0])
    } else if (periodeType === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      const lastDay = new Date(now.getFullYear(), 11, 31)
      setPeriodeDebut(firstDay.toISOString().split('T')[0])
      setPeriodeFin(lastDay.toISOString().split('T')[0])
    }
  }, [periodeType])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [elevesData, creneauxData, presencesData] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux(),
          FirebaseService.getAllPresences()
        ])
        setEleves(elevesData)
        setCreneaux(creneauxData)
        setPresences(presencesData)
        setSelectedEleves(elevesData.map(e => e.id))
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      showToast('Erreur lors du chargement', 'error')
    }
    setIsLoading(false)
  }

  // Liste unique des groupes
  const uniqueGroupes = [...new Set(eleves.map(e => e.groupe).filter(Boolean))].sort()

  // Filtrer les élèves par groupe
  const filteredEleves = eleves.filter(e => 
    filterGroupe === '' || e.groupe === filterGroupe
  )

  // Toggle sélection
  const toggleEleve = (eleveId) => {
    setSelectedEleves(prev => {
      if (prev.includes(eleveId)) {
        return prev.filter(id => id !== eleveId)
      } else {
        return [...prev, eleveId]
      }
    })
    setSelectAll(false)
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEleves([])
    } else {
      setSelectedEleves(filteredEleves.map(e => e.id))
    }
    setSelectAll(!selectAll)
  }

  // Calculer les stats pour l'export
  const calculateExportData = () => {
    const data = []
    
    for (const eleveId of selectedEleves) {
      const eleve = eleves.find(e => e.id === eleveId)
      if (!eleve) continue

      const elevePresences = presences.filter(p => {
        if (p.eleveId !== eleveId) return false
        if (!p.date) return false
        return p.date >= periodeDebut && p.date <= periodeFin
      })

      const present = elevePresences.filter(p => p.present === true).length
      const absent = elevePresences.filter(p => p.present === false).length
      const excuse = elevePresences.filter(p => p.present === 'excuse').length
      const retard = elevePresences.filter(p => p.present === 'retard').length
      const total = elevePresences.length
      const tauxPresence = total > 0 ? Math.round(((present + retard) / total) * 100) : 0

      data.push({
        nom: eleve.nom || '',
        prenom: eleve.prenom || '',
        groupe: eleve.groupe || '',
        email: eleve.email || '',
        telephone: eleve.telephone || '',
        present,
        absent,
        excuse,
        retard,
        total,
        tauxPresence
      })
    }

    return data.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`))
  }

  // Export CSV standard
  const exportCSV = () => {
    const data = calculateExportData()
    
    const headers = [
      'Nom', 'Prénom', 'Groupe', 'Email', 'Téléphone',
      'Présences', 'Absences', 'Excusés', 'Retards', 'Total', 'Taux (%)'
    ]
    
    const rows = data.map(d => [
      d.nom, d.prenom, d.groupe, d.email, d.telephone,
      d.present, d.absent, d.excuse, d.retard, d.total, d.tauxPresence
    ])
    
    // Ajouter ligne de totaux
    const totals = data.reduce((acc, d) => ({
      present: acc.present + d.present,
      absent: acc.absent + d.absent,
      excuse: acc.excuse + d.excuse,
      retard: acc.retard + d.retard,
      total: acc.total + d.total
    }), { present: 0, absent: 0, excuse: 0, retard: 0, total: 0 })
    
    rows.push([])
    rows.push([
      'TOTAL', '', '', '', '',
      totals.present, totals.absent, totals.excuse, totals.retard, totals.total,
      totals.total > 0 ? Math.round(((totals.present + totals.retard) / totals.total) * 100) : 0
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `export_presences_${periodeDebut}_${periodeFin}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export CSV téléchargé', 'success')
  }

  // Export format comptabilité (CSV avec colonnes spécifiques)
  const exportComptabilite = () => {
    const data = calculateExportData()
    
    // Format compatible logiciels de gestion
    const headers = [
      'CODE', 'NOM_COMPLET', 'GROUPE', 'PERIODE_DEBUT', 'PERIODE_FIN',
      'NB_PRESENCES', 'NB_ABSENCES', 'NB_EXCUSES', 'NB_RETARDS',
      'TOTAL_SEANCES', 'TAUX_PRESENCE_PCT'
    ]
    
    const rows = data.map((d, idx) => [
      `MBR${String(idx + 1).padStart(4, '0')}`,
      `${d.nom} ${d.prenom}`.trim(),
      d.groupe,
      periodeDebut,
      periodeFin,
      d.present,
      d.absent,
      d.excuse,
      d.retard,
      d.total,
      d.tauxPresence
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `comptabilite_presences_${periodeDebut}_${periodeFin}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export comptabilité téléchargé', 'success')
  }

  // Export détaillé jour par jour
  const exportDetail = () => {
    const headers = ['Date', 'Nom', 'Prénom', 'Groupe', 'Créneau', 'Statut']
    const rows = []
    
    for (const eleveId of selectedEleves) {
      const eleve = eleves.find(e => e.id === eleveId)
      if (!eleve) continue

      const elevePresences = presences
        .filter(p => {
          if (p.eleveId !== eleveId) return false
          if (!p.date) return false
          return p.date >= periodeDebut && p.date <= periodeFin
        })
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

      for (const p of elevePresences) {
        const creneau = creneaux.find(c => c.id === p.creneauId)
        let statut = 'Non pointé'
        if (p.present === true) statut = 'Présent'
        else if (p.present === false) statut = 'Absent'
        else if (p.present === 'excuse') statut = 'Excusé'
        else if (p.present === 'retard') statut = 'Retard'
        
        rows.push([
          p.date,
          eleve.nom || '',
          eleve.prenom || '',
          eleve.groupe || '',
          creneau?.nom || '-',
          statut
        ])
      }
    }

    rows.sort((a, b) => (a[0] || '').localeCompare(b[0] || ''))
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `detail_presences_${periodeDebut}_${periodeFin}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    showToast('Export détaillé téléchargé', 'success')
  }

  // Aperçu des données
  const previewData = calculateExportData().slice(0, 10)
  const totalSelected = selectedEleves.length

  if (isLoading) {
    return (
      <Layout title="Exports">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Exports & Comptabilité">
      {/* Filtres période */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📅 Période</h3>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Type de période</label>
            <select
              className="form-input form-select"
              value={periodeType}
              onChange={(e) => setPeriodeType(e.target.value)}
              style={{ width: '180px' }}
            >
              <option value="week">Semaine en cours</option>
              <option value="month">Mois en cours</option>
              <option value="year">Année en cours</option>
              <option value="custom">Personnalisée</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Du</label>
            <input
              type="date"
              className="form-input"
              value={periodeDebut}
              onChange={(e) => { setPeriodeDebut(e.target.value); setPeriodeType('custom'); }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Au</label>
            <input
              type="date"
              className="form-input"
              value={periodeFin}
              onChange={(e) => { setPeriodeFin(e.target.value); setPeriodeType('custom'); }}
            />
          </div>
        </div>
      </div>

      {/* Sélection des membres */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">👥 Membres à inclure ({totalSelected} sélectionné(s))</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <select
              className="form-input form-select"
              value={filterGroupe}
              onChange={(e) => setFilterGroupe(e.target.value)}
              style={{ width: '150px' }}
            >
              <option value="">Tous les groupes</option>
              {uniqueGroupes.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={handleSelectAll}>
              {selectAll ? '☐ Désélectionner tout' : '☑️ Tout sélectionner'}
            </button>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--spacing-sm)',
          maxHeight: '300px',
          overflowY: 'auto',
          padding: 'var(--spacing-sm)'
        }}>
          {filteredEleves.map(eleve => (
            <label 
              key={eleve.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: selectedEleves.includes(eleve.id) ? 'var(--primary)' : 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              <input
                type="checkbox"
                checked={selectedEleves.includes(eleve.id)}
                onChange={() => toggleEleve(eleve.id)}
                style={{ display: 'none' }}
              />
              <span style={{ 
                width: '18px', 
                height: '18px', 
                border: '2px solid',
                borderColor: selectedEleves.includes(eleve.id) ? 'white' : 'var(--text-muted)',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                flexShrink: 0
              }}>
                {selectedEleves.includes(eleve.id) && '✓'}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {eleve.prenom} {eleve.nom}
              </span>
              {eleve.groupe && (
                <span style={{ fontSize: '10px', opacity: 0.7 }}>({eleve.groupe})</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Boutons d'export */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📤 Exporter</h3>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={exportCSV} disabled={totalSelected === 0}>
            📊 Export résumé (CSV)
          </button>
          <button className="btn btn-success" onClick={exportComptabilite} disabled={totalSelected === 0}>
            💼 Export comptabilité
          </button>
          <button className="btn btn-secondary" onClick={exportDetail} disabled={totalSelected === 0}>
            📋 Export détaillé (jour par jour)
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--spacing-md)' }}>
          💡 Les fichiers CSV utilisent le séparateur ";" pour compatibilité Excel/Google Sheets
        </p>
      </div>

      {/* Aperçu */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: 'var(--spacing-lg)' }}>
          <h3 className="card-title">👁️ Aperçu (10 premiers)</h3>
        </div>

        {previewData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">Aucune donnée</div>
            <div className="empty-state-desc">
              Sélectionnez des membres et une période
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Groupe</th>
                  <th style={{ textAlign: 'center' }}>✅</th>
                  <th style={{ textAlign: 'center' }}>❌</th>
                  <th style={{ textAlign: 'center' }}>📝</th>
                  <th style={{ textAlign: 'center' }}>⏰</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Taux</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((d, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 500 }}>{d.prenom} {d.nom}</td>
                    <td>{d.groupe || '-'}</td>
                    <td style={{ textAlign: 'center', color: 'var(--present)' }}>{d.present}</td>
                    <td style={{ textAlign: 'center', color: 'var(--absent)' }}>{d.absent}</td>
                    <td style={{ textAlign: 'center', color: 'var(--excuse)' }}>{d.excuse}</td>
                    <td style={{ textAlign: 'center', color: 'var(--retard)' }}>{d.retard}</td>
                    <td style={{ textAlign: 'center' }}>{d.total}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        color: d.tauxPresence >= 70 ? 'var(--present)' : d.tauxPresence >= 50 ? 'var(--excuse)' : 'var(--absent)'
                      }}>
                        {d.tauxPresence}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

export default ExportPage
