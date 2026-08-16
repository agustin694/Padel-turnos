'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPage() {
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [canchaId, setCanchaId] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const { data: dataCanchas } = await supabase.from('canchas').select('*')
    const { data: dataReservas } = await supabase.from('reservas').select('*, canchas(nombre)')
    if (dataCanchas) setCanchas(dataCanchas)
    if (dataReservas) setReservas(dataReservas)
  }

  async function BloquearTurno(e) {
    e.preventDefault()
    if (!canchaId || !fecha || !hora) return alert('Completá todos los campos')
    setCargando(true)

    const { error } = await supabase.from('reservas').insert([
      { cancha_id: canchaId, fecha, hora_inicio: hora, estado: 'bloqueado' }
    ])

    setCargando(false)
    if (error) {
      alert('Error al reservar: ' + error.message)
    } else {
      alert('¡Turno reservado/bloqueado con éxito!')
      cargarDatos()
    }
  }

  async function cancelarReserva(id) {
    if (!confirm('¿Seguro que querés liberar este turno?')) return
    await supabase.from('reservas').delete().eq('id', id)
    cargarDatos()
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>🔒 Panel de Control (Administrador)</h1>
      
      <form onSubmit={BloquearTurno} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
        <h3>Cargar / Bloquear Turno</h3>
        <select onChange={(e) => setCanchaId(e.target.value)} value={canchaId} required style={{ padding: '8px' }}>
          <option value="">Seleccionar Cancha</option>
          {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required style={{ padding: '8px' }} />
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required style={{ padding: '8px' }} />
        
        <button type="submit" disabled={cargando} style={{ padding: '10px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {cargando ? 'Guardando...' : 'Cargar Turno'}
        </button>
      </form>

      <hr />

      <h3>Turnos Ocupados / Bloqueados</h3>
      <ul>
        {reservas.map(r => (
          <li key={r.id} style={{ marginBottom: '8px' }}>
            {r.canchas?.nombre} - {r.fecha} a las {r.hora_inicio}
            <button onClick={() => cancelarReserva(r.id)} style={{ marginLeft: '10px', color: 'red' }}>Liberar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
