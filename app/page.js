'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)

  // Datos para la reserva del cliente
  const [modalAbierto, setModalAbierto] = useState(false)
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  // Datos Admin
  const [canchaId, setCanchaId] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [guardando, setGuardando] = useState(false)

  // MI ALIAS DE MERCADO PAGO
  const MI_ALIAS = 'TU.ALIAS.AQUI' // 👈 CAMBIÁ ESTO POR TU ALIAS REAL
  const PRECIO_TURNO = '10000'     // 👈 MONTO A COBRAR (EJ: 10000)

  const hoy = new Date().toLocaleDateString('sv-SE')
  const horarios = [
    '07:00', '08:30', '10:00', '11:30', 
    '13:00', '14:30', '16:00', '17:30', 
    '19:00', '20:30', '22:00', '23:30', '01:00'
  ]

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

  // ABRIR FORMULARIO DE RESERVA AL TOCAR TURNO DISPONIBLE
  function seleccionarHorario(cancha, h) {
    setTurnoSeleccionado({ cancha, hora: h })
    setModalAbierto(true)
  }

  // PROCESAR RESERVA Y IR A MERCADO PAGO
  async function confirmarReservaCliente(e) {
    e.preventDefault()
    if (!nombreCliente || !telefonoCliente) return alert('Por favor completá tus datos.')

    const { error } = await supabase.from('reservas').insert([
      { 
        cancha_id: turnoSeleccionado.cancha.id, 
        fecha: hoy, 
        hora_inicio: turnoSeleccionado.hora, 
        estado: 'pendiente_pago',
        cliente_nombre: nombreCliente,
        cliente_telefono: telefonoCliente
      }
    ])

    if (error) {
      alert('Error al procesar la reserva: ' + error.message)
    } else {
      alert('¡Turno pre-reservado! Serás redirigido a Mercado Pago para abonar.')
      
      // Abrir enlace directo a Mercado Pago
      const urlMercadoPago = `https://link.mercadopago.com.ar/transfer?alias=${MI_ALIAS}&amount=${PRECIO_TURNO}`
      window.location.href = urlMercadoPago
    }
  }

  // ACCIÓN ADMIN: BLOQUEAR TURNO
  async function BloquearTurno(e) {
    e.preventDefault()
    if (!canchaId || !fecha || !hora) return alert('Completá todos los campos')
    setGuardando(true)

    const { error } = await supabase.from('reservas').insert([
      { cancha_id: canchaId, fecha, hora_inicio: hora, estado: 'bloqueado' }
    ])

    setGuardando(false)
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
      
      {/* VISTA CLIENTES */}
      <section style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>🎾 Reserva de Canchas</h1>
        <p style={{ color: '#666' }}>Disponibilidad para hoy ({hoy})</p>

        {cargando ? (
          <p>Cargando turnos...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            {canchas.map((cancha) => (
              <div key={cancha.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h2 style={{ margin: '0 0 15px 0' }}>{cancha.nombre}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {horarios.map((h) => {
                    const ocupado = reservas.some(
                      (r) => r.cancha_id === cancha.id && r.fecha === hoy && r.hora_inicio.startsWith(h)
                    )
                    return (
                      <button
                        key={h}
                        disabled={ocupado}
                        onClick={() => seleccionarHorario(cancha, h)}
                        style={{
                          padding: '12px 8px',
                          borderRadius: '8px',
                          background: ocupado ? '#fee2e2' : '#dcfce7',
                          color: ocupado ? '#991b1b' : '#166534',
                          fontWeight: 'bold',
                          border: ocupado ? '1px solid #f87171' : '1px solid #86efac',
                          cursor: ocupado ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {h} <br />
                        <small style={{ fontSize: '11px', fontWeight: 'normal' }}>{ocupado ? 'Ocupado' : 'Reservar'}</small>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL FORMULARIO CLIENTE */}
      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', maxWidth: '400px', width: '100%' }}>
            <h3>Confirmar Reserva</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Cancha: <strong>{turnoSeleccionado?.cancha.nombre}</strong> <br />
              Hora: <strong>{turnoSeleccionado?.hora} hs</strong>
            </p>
            
            <form onSubmit={confirmarReservaCliente} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Nombre completo" 
                value={nombreCliente} 
                onChange={(e) => setNombreCliente(e.target.value)} 
                required 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} 
              />
              <input 
                type="tel" 
                placeholder="Teléfono (WhatsApp)" 
                value={telefonoCliente} 
                onChange={(e) => setTelefonoCliente(e.target.value)} 
                required 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} 
              />

              <button type="submit" style={{ padding: '12px', background: '#009ee3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                Pagar en Mercado Pago
              </button>
              <button type="button" onClick={() => setModalAbierto(false)} style={{ padding: '10px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      <hr style={{ margin: '40px 0', border: 'none', borderTop: '2px dashed #ccc' }} />

      {/* PANEL ADMIN */}
      <section style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <h2>🔒 Panel de Control (Administrador)</h2>
        
        <form onSubmit={BloquearTurno} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px', marginBottom: '25px' }}>
          <h3>Cargar / Bloquear Turno</h3>
          
          <select onChange={(e) => setCanchaId(e.target.value)} value={canchaId} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
            <option value="">Seleccionar Cancha</option>
            {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha:</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hora inicio:</label>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          
          <button type="submit" disabled={guardando} style={{ padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {guardando ? 'Guardando...' : 'Cargar Turno'}
          </button>
        </form>

        <h3>Turnos Ocupados / Bloqueados</h3>
        {reservas.length === 0 ? (
          <p style={{ color: '#666' }}>No hay turnos registrados.</p>
        ) : (
          <ul style={{ paddingLeft: '20px' }}>
            {reservas.map(r => (
              <li key={r.id} style={{ marginBottom: '10px' }}>
                <strong>{r.canchas?.nombre}</strong> - {r.fecha} a las {r.hora_inicio} 
                {r.cliente_nombre && ` (${r.cliente_nombre} - ${r.cliente_telefono})`}
                <button onClick={() => cancelarReserva(r.id)} style={{ marginLeft: '12px', color: '#dc2626', background: 'none', border: '1px solid #dc2626', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                  Liberar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}
