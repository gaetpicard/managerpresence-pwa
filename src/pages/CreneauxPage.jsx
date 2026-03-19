import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { FirebaseService } from '../services/FirebaseService'

function CreneauxPage() {
  const [creneaux, setCreneaux] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCreneaux()
  }, [])

  const loadCreneaux = async () => {
    setIsLoading(true)
    try {
      if (FirebaseService.isInitialized()) {
        const data = await FirebaseService.getCreneaux()
        setCreneaux(data)
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
    }
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <Layout title="Créneaux">
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Créneaux">
      {/* Info */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--info) 0%, #2B6CB0 100%)' }}>
        <p>
          📅 Les créneaux sont gérés depuis l'application mobile. 
          Vous pouvez les consulter ici.
        </p>
      </div>

      {/* Liste des créneaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {creneaux.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📅</p>
            <p style={{ color: 'var(--text-muted)' }}>Aucun créneau configuré</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Créez des créneaux depuis l'application mobile
            </p>
          </div>
        ) : (
          creneaux.map(creneau => (
            <div key={creneau.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                  {creneau.nom || creneau.jour || 'Créneau'}
                </h3>
                {creneau.actif !== false && (
                  <span className="badge badge-success">Actif</span>
                )}
              </div>
              
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {creneau.jour && (
                  <p style={{ marginBottom: '4px' }}>📆 {creneau.jour}</p>
                )}
                {creneau.heure && (
                  <p style={{ marginBottom: '4px' }}>🕐 {creneau.heure}</p>
                )}
                {creneau.lieu && (
                  <p style={{ marginBottom: '4px' }}>📍 {creneau.lieu}</p>
                )}
                {creneau.groupe && (
                  <p>👥 Groupe: {creneau.groupe}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}

export default CreneauxPage
