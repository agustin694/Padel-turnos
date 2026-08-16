'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPage() {
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)

  // Estados Formulario Admin
  const [canchaId, setCanchaId] = useState('')
  const [fechaAdmin, setFechaAdmin] = useState('')
  const [horaAdmin, setHoraAdmin] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const { data: dataCanchas } = await supabase.from('canchas').select('*')
    const { data: dataReservas } = await supabase.from('reservas').select('*, canchas(nombre)')
    
    if (dataCanchas) setCanchas(dataCanchas)
    if (dataReservas) setReservas(dataReservas)
    setCargando(false)
  }

  async function BloquearTurnoAdmin(e) {
    e.preventDefault()
    if (!canchaId || !fechaAdmin || !horaAdmin) return alert('Completá todos los campos')
    setGuardando(true)

    const { error } = await supabase.from('reservas').insert([
      { cancha_id: canchaId, fecha: fechaAdmin, hora_inicio: horaAdmin, estado: 'bloqueado', pago_confirmado: true }
    ])

    setGuardando(false)
    if (error) {
      alert('Error al reservar: ' + error.message)
    } else {
      alert('¡Turno bloqueado exitosamente!')
      cargarDatos()
    }
  }

  async function cambiarEstadoPago(id, estadoActual) {
    await supabase.from('reservas').update({ pago_confirmado: !estadoActual }).eq('id', id)
    cargarDatos()
  }

  async function cancelarReserva(id) {
    if (!confirm('¿Seguro que querés eliminar este turno? Solo el administrador puede hacer esto.')) return
    await supabase.from('reservas').delete().eq('id', id)
    cargarDatos()
  }

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>🔒 Panel de Control (Administrador)</h1>

      {/* FORMULARIO PARA BLOQUEAR TURNOS */}
      <form onSubmit={BloquearTurnoAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', marginBottom: '30px', background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <h3>Cargar / Bloquear Turno Manualmente</h3>
        
        <select onChange={(e) => setCanchaId(e.target.value)} value={canchaId} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <option value="">Seleccionar Cancha</option>
          {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha:</label>
        <input type="date" value={fechaAdmin} onChange={(e) => setFechaAdmin(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />

        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hora Inicio:</label>
        <input type="time" value={horaAdmin} onChange={(e) => setHoraAdmin(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />

        <button type="submit" disabled={guardando} style={{ padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
          {guardando ? 'Guardando...' : 'Bloquear Turno'}
        </button>
      </form>

      <hr style={{ margin: '30px 0' }} />

      {/* LISTA DE RESERVAS Y CONTROL DE PAGOS */}
      <h3>Control de Reservas y Mercado Pago</h3>
      {cargando ? (
        <p>Cargando reservas...</p>
      ) : reservas.length === 0 ? (
        <p style={{ color: '#666' }}>No hay reservas registradas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reservas.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div>
                <strong>{r.canchas?.nombre}</strong> - {r.fecha} a las {r.hora_inicio} hs <br />
                <small style={{ color: '#555', fontSize: '13px' }}>
                  Cliente: {r.cliente_nombre ? `${r.cliente_nombre} (${r.cliente_telefono})` : 'Cargado por Admin'}
                </small>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => cambiarEstadoPago(r.id, r.pago_confirmado)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: r.pago_confirmado ? '#22c55e' : '#eab308',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {r.pago_confirmado ? '✓ Pagado' : '⚡ Confirmar Pago MP'}
                </button>

                <button 
                  onClick={() => cancelarReserva(r.id)} 
                  style={{ color: '#dc2626', background: 'none', border: '1px solid #dc2626', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Eliminar Turno
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
