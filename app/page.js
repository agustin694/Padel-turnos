'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)

  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function cargarDatos() {
      const { data: dataCanchas } = await supabase.from('canchas').select('*')
      const { data: dataReservas } = await supabase.from('reservas').select('*').eq('fecha', hoy)
      
      if (dataCanchas) setCanchas(dataCanchas)
      if (dataReservas) setReservas(dataReservas)
      setCargando(false)
    }
    cargarDatos()
  }, [hoy])

  const horarios = ['14:00', '15:30', '17:00', '18:30', '20:00', '21:30']

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🎾 Reserva de Canchas</h1>
      <p style={{ color: '#666' }}>Disponibilidad para hoy ({hoy})</p>

      {cargando ? (
        <p>Cargando turnos...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          {canchas.map((cancha) => (
            <div key={cancha.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', background: '#f9f9f9' }}>
              <h2>{cancha.nombre}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                {horarios.map((hora) => {
                  const ocupado = reservas.some((r) => r.cancha_id === cancha.id && r.hora_inicio === hora)
                  return (
                    <div
                      key={hora}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: ocupado ? '#fee2e2' : '#dcfce7',
                        color: ocupado ? '#991b1b' : '#166534',
                        fontWeight: 'bold',
                        border: ocupado ? '1px solid #f87171' : '1px solid #86efac'
                      }}
                    >
                      {hora} <br />
                      <small style={{ fontSize: '11px' }}>{ocupado ? 'Ocupado' : 'Disponible'}</small>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
