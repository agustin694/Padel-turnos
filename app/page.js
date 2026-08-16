'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)

  const horarios = ['16:00', '17:30', '19:00', '20:30', '22:00']
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const { data: dataCanchas } = await supabase.from('canchas').select('*')
    if (dataCanchas) setCanchas(dataCanchas)

    const { data: dataReservas } = await supabase
      .from('reservas')
      .select('*')
      .eq('fecha', hoy)

    if (dataReservas) setReservas(dataReservas)
    setLoading(false)
  }

  const estaOcupado = (canchaId, hora) => {
    return reservas.some(
      (r) => r.cancha_id === canchaId && r.hora_inicio === `${hora}:00` && r.estado === 'reservado'
    )
  }

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#16a34a' }}>🎾 Reserva de Canchas</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>Disponibilidad para hoy ({hoy})</p>

      {loading ? (
        <p style={{ textAlign: 'center' }}>Cargando turnos...</p>
      ) : (
        canchas.map((cancha) => (
          <div key={cancha.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <h2>{cancha.nombre}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
              {horarios.map((hora) => {
                const ocupado = estaOcupado(cancha.id, hora)
                return (
                  <button
                    key={hora}
                    disabled={ocupado}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: ocupado ? '#ef4444' : '#22c55e',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: ocupado ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {hora} hs - {ocupado ? 'Ocupado' : 'Disponible'}
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}
    </main>
  )
}
