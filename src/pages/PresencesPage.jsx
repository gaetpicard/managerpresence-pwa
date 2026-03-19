import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function PresencesPage() {
  const [eleves, setEleves] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [presences, setPresences] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedCreneau, setSelectedCreneau] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedDate && selectedCreneau) {
      loadPresences()
    }
  }, [selectedDate, selectedCreneau])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const [elevesData, creneauxData] = await Promise.all([
          FirebaseService.getEleves(),
          FirebaseService.getCreneaux()
        ])
        setEleves(elevesData)
        setCreneaux(creneauxData)
        
        if (creneauxData.length > 0) {
          setSelectedCreneau(creneauxData[0].id)
        }
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
    }
    setIsLoading(false)
  }

  const loadPresences = async () => {
    try {
      const presencesData = await FirebaseService.getPresences(selectedDate)
      const presencesMap = {}
      presencesData.forEach(p => {
        presencesMap[`${p.eleveId}_${p.creneauId}`] = p.present
      })
      setPresences(presencesMap)
    } catch (error) {
      console.error('Erreur chargement présences:', error)
    }
  }

  const togglePresence = async (eleveId) => {
    const key = `${eleveId}_${selectedCreneau}`
    const currentValue = presences[key] || false
    const newValue = !currentValue

    // Mise à jour optimiste
    setPresences(prev => ({ ...prev, [key]: newValue }))

    try {
      await FirebaseService.setPresence(eleveId, selectedDate, selectedCreneau, newValue)
    } catch (error) {
      console.error('Erreur enregistrement présence:', error)
      // Rollback en cas d'erreur
      setPresences(prev => ({ ...prev, [key]: currentValue }))
    }
  }

  const filteredEleves = eleves.filter(e => {
    const fullName = `${e.nom || ''} ${e.prenom || ''}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase())
  })

  const presentCount = filteredEleves.filter(e => presences[`${e.id}_${selectedCreneau}`]).length

  if (isLoading) {
    return (
      <Layout title="Présences">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Présences">
      {/* Filtres */}
      <div className="card">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: '1', minWidth: '150px' }}>
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0, flex: '1', minWidth: '200px' }}>
            <label className="form-label">Créneau</label>
            <select
              className="form-input"
              value={selectedCreneau}
              onChange={(e) => setSelectedCreneau(e.target.value)}
            >
              {creneaux.length === 0 && <option value="">Aucun créneau</option>}
              {creneaux.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nom || c.jour || c.id}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0, flex: '2', minWidth: '200px' }}>
            <label className="form-label">Rechercher</label>
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Compteur */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          {filteredEleves.length} membre(s)
        </span>
        <span className="badge badge-success">
          ✅ {presentCount} présent(s)
        </span>
      </div>

      {/* Liste des membres */}
      <div className="card" style={{ padding: 0 }}>
        {filteredEleves.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {eleves.length === 0 ? (
              <p>Aucun membre trouvé. Ajoutez des membres dans l'application mobile.</p>
            ) : (
              <p>Aucun résultat pour "{searchTerm}"</p>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Présent</th>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Groupe</th>
                </tr>
              </thead>
              <tbody>
                {filteredEleves.map(eleve => {
                  const isPresent = presences[`${eleve.id}_${selectedCreneau}`] || false
                  return (
                    <tr key={eleve.id}>
                      <td>
                        <button
                          onClick={() => togglePresence(eleve.id)}
                          style={{
                            width: '40px',
                            height: '40px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '18px',
                            background: isPresent ? 'var(--success)' : 'var(--bg-input)',
                            color: isPresent ? 'white' : 'var(--text-muted)'
                          }}
                        >
                          {isPresent ? '✓' : ''}
                        </button>
                      </td>
                      <td style={{ fontWeight: '500' }}>{eleve.nom || '-'}</td>
                      <td>{eleve.prenom || '-'}</td>
                      <td>
                        {eleve.groupe && (
                          <span className="badge badge-standard">{eleve.groupe}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default PresencesPage
