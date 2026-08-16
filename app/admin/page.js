'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)

  // Control de vista Admin
  const [esAdmin, setEsAdmin] = useState(false)
  const [claveAdmin, setClaveAdmin] = useState('')

  // Selección de fecha por parte del cliente
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toLocaleDateString('sv-SE')
  )

  // Datos para reserva del cliente
  const [modalAbierto, setModalAbierto] = useState(false)
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  // Datos Admin
  const [canchaId, setCanchaId] = useState('')
  const [fechaAdmin, setFechaAdmin] = useState('')
  const [horaAdmin, setHoraAdmin] = useState('')
  const [guardando, setGuardando] = useState(false)

  // CONFIGURACIÓN
  const CLAVE_ACCESO = 'admin123' // 👈 CAMBIÁ ESTA CONTRASEÑA POR LA QUE QUIERAS
  const MI_ALIAS = 'TU.ALIAS.AQUI' // 👈 TU ALIAS DE MERCADO PAGO
  const PRECIO_TURNO = '10000'

  const generarHorarios = () => {
    const lista = []
    for (let h = 7; h < 24; h++) {
      const horaStr = h.toString().padStart(2, '0')
      lista.push(`${horaStr}:00`, `${horaStr}:30`)
    }
    lista.push('00:00', '00:30', '01:00', '01:30', '02:00')
    return lista
  }

  const horarios = generarHorarios()

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

  function loginAdmin(e) {
    e.preventDefault()
    if (claveAdmin === CLAVE_ACCESO) {
      setEsAdmin(true)
    } else {
      alert('Contraseña incorrecta')
    }
  }

  function seleccionarHorario(cancha, h) {
    setTurnoSeleccionado({ cancha, hora: h })
    setModalAbierto(true)
  }

  async function confirmarReservaCliente(e) {
    e.preventDefault()
    if (!nombreCliente || !telefonoCliente) return alert('Por favor completá tus datos.')

    const { error } = await supabase.from('reservas').insert([
      { 
        cancha_id: turnoSeleccionado.cancha.id, 
        fecha: fechaSeleccionada, 
        hora_inicio: turnoSeleccionado.hora, 
        estado: 'pendiente_pago',
        cliente_nombre: nombreCliente,
        cliente_telefono: telefonoCliente,
        pago_confirmado: false
      }
    ])

    if (error) {
      alert('Error al procesar la reserva: ' + error.message)
    } else {
      alert('¡Turno reservado! Serás redirigido a Mercado Pago para abonar.')
      const urlMercadoPago = `https://link.mercadopago.com.ar/transfer?alias=${MI_ALIAS}&amount=${PRECIO_TURNO}`
      window.location.href = urlMercadoPago
    }
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
      alert('¡Turno bloqueado por el Administrador!')
      cargarDatos()
    }
  }

  async function cambiarEstadoPago(id, estadoActual) {
    await supabase.from('reservas').update({ pago_confirmado: !estadoActual }).eq('id', id)
    cargarDatos()
  }

  async function cancelarReserva(id) {
    if (!confirm('¿Seguro que querés eliminar este turno permanentemente?')) return
    await supabase.from('reservas').delete().eq('id', id)
    cargarDatos()
  }

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* VISTA CLIENTES */}
      <section style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1>🎾 Reserva de Canchas</h1>
        
        <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Seleccionar Día:</label>
          <input 
            type="date" 
            value={fechaSeleccionada} 
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
          />
        </div>

        {cargando ? (
          <p>Cargando turnos...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '20px' }}>
            {canchas.map((cancha) => (
              <div key={cancha.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h2 style={{ margin: '0 0 15px 0' }}>{cancha.nombre}</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                  {horarios.map((h) => {
                    const ocupado = reservas.some(
                      (r) => r.cancha_id === cancha.id && r.fecha === fechaSeleccionada && r.hora_inicio.startsWith(h)
                    )
                    return (
                      <button
                        key={h}
                        disabled={ocupado}
                        onClick={() => seleccionarHorario(cancha, h)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '6px',
                          background: ocupado ? '#ef4444' : '#dcfce7',
                          color: ocupado ? '#ffffff' : '#166534',
                          fontWeight: 'bold',
                          border: ocupado ? '1px solid #dc2626' : '1px solid #86efac',
                          cursor: ocupado ? 'not-allowed' : 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        {h} <br />
                        <small style={{ fontSize: '10px', fontWeight: 'normal' }}>
                          {ocupado ? 'Ocupado' : 'Reservar'}
                        </small>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL RESERVA CLIENTE */}
      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', maxWidth: '400px', width: '100%' }}>
            <h3>Confirmar Reserva</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Cancha: <strong>{turnoSeleccionado?.cancha.nombre}</strong> <br />
              Día: <strong>{fechaSeleccionada}</strong> <br />
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

      {/* ACCESO / PANEL ADMINISTRADOR */}
      {!esAdmin ? (
        <div style={{ textAlign: 'center', padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <h3>Acceso Administrador</h3>
          <form onSubmit={loginAdmin} style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={claveAdmin} 
              onChange={(e) => setClaveAdmin(e.target.value)} 
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <button type="submit" style={{ padding: '8px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Ingresar
            </button>
          </form>
        </div>
      ) : (
        <section style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>🔒 Panel de Control (Admin)</h2>
            <button onClick={() => setEsAdmin(false)} style={{ background: '#666', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Cerrar Sesión</button>
          </div>

          <form onSubmit={BloquearTurnoAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', marginBottom: '25px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3>Bloquear / Cargar Turno Manual</h3>
            <select onChange={(e) => setCanchaId(e.target.value)} value={canchaId} required style={{ padding: '8px' }}>
              <option value="">Seleccionar Cancha</option>
              {canchas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input type="date" value={fechaAdmin} onChange={(e) => setFechaAdmin(e.target.value)} required style={{ padding: '8px' }} />
            <input type="time" value={horaAdmin} onChange={(e) => setHoraAdmin(e.target.value)} required style={{ padding: '8px' }} />
            <button type="submit" disabled={guardando} style={{ padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : 'Bloquear Turno'}
            </button>
          </form>

          <h3>Control de Reservas y Pagos</h3>
          {reservas.length === 0 ? (
            <p style={{ color: '#666' }}>No hay reservas registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reservas.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <div>
                    <strong>{r.canchas?.nombre}</strong> - {r.fecha} a las {r.hora_inicio} <br />
                    <small style={{ color: '#555' }}>
                      Cliente: {r.cliente_nombre ? `${r.cliente_nombre} (${r.cliente_telefono})` : 'Manual / Bloqueado'}
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => cambiarEstadoPago(r.id, r.pago_confirmado)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        background: r.pago_confirmado ? '#22c55e' : '#eab308',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {r.pago_confirmado ? '✓ Pago Confirmado' : '⚡ Marcar como Pagado'}
                    </button>
                    <button 
                      onClick={() => cancelarReserva(r.id)} 
                      style={{ color: '#dc2626', background: 'none', border: '1px solid #dc2626', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  )
}
