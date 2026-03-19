import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function MembresPage() {
  const [eleves, setEleves] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('nom')
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    loadEleves()
  }, [])

  const loadEleves = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const data = await FirebaseService.getEleves()
        setEleves(data)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
    }
    setIsLoading(false)
  }

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
      const fullName = `${e.nom || ''} ${e.prenom || ''} ${e.groupe || ''}`.toLowerCase()
      return fullName.includes(searchTerm.toLowerCase())
    })
    .sort((a, b) => {
      const aVal = (a[sortBy] || '').toLowerCase()
      const bVal = (b[sortBy] || '').toLowerCase()
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal)
      } else {
        return bVal.localeCompare(aVal)
      }
    })

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  if (isLoading) {
    return (
      <Layout title="Membres">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Membres">
      {/* Barre d'actions */}
      <div className="card">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: '1', minWidth: '250px', maxWidth: '400px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadEleves}>
              🔄 Actualiser
            </button>
            <button className="btn btn-primary btn-sm">
              📥 Importer CSV
            </button>
            <button className="btn btn-secondary btn-sm">
              📤 Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Compteur */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          {filteredAndSortedEleves.length} membre(s) sur {eleves.length}
        </span>
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0 }}>
        {filteredAndSortedEleves.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {eleves.length === 0 ? (
              <>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>👥</p>
                <p>Aucun membre trouvé</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>
                  Importez un fichier CSV ou ajoutez des membres depuis l'application mobile
                </p>
              </>
            ) : (
              <p>Aucun résultat pour "{searchTerm}"</p>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th 
                    onClick={() => handleSort('nom')} 
                    style={{ cursor: 'pointer' }}
                  >
                    Nom<SortIcon field="nom" />
                  </th>
                  <th 
                    onClick={() => handleSort('prenom')} 
                    style={{ cursor: 'pointer' }}
                  >
                    Prénom<SortIcon field="prenom" />
                  </th>
                  <th 
                    onClick={() => handleSort('groupe')} 
                    style={{ cursor: 'pointer' }}
                  >
                    Groupe<SortIcon field="groupe" />
                  </th>
                  <th>Téléphone</th>
                  <th>Email</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedEleves.map(eleve => (
                  <tr key={eleve.id}>
                    <td style={{ fontWeight: '500' }}>{eleve.nom || '-'}</td>
                    <td>{eleve.prenom || '-'}</td>
                    <td>
                      {eleve.groupe && (
                        <span className="badge badge-standard">{eleve.groupe}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {eleve.telephone || eleve.tel || '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {eleve.email || '-'}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm">
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default MembresPage
