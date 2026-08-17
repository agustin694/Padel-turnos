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

  // Selección de fecha por parte del cliente / admin
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toLocaleDateString('sv-SE')
  )

  // Datos para reserva del cliente
  const [modalAbierto, setModalAbierto] = useState(false)
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null)
  const [horaInicio, setHoraInicio] = useState('14:00')
  const [horaFin, setHoraFin] = useState('15:30')
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  // Datos Admin
  const [canchaIdAdmin, setCanchaIdAdmin] = useState('')
  const [fechaAdmin, setFechaAdmin] = useState('')
  const [horaInicioAdmin, setHoraInicioAdmin] = useState('')
  const [horaFinAdmin, setHoraFinAdmin] = useState('')
  const [esTurnoFijo, setEsTurnoFijo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // CONFIGURACIÓN
  const CLAVE_ACCESO = 'admin123'
  const MI_ALIAS = 'TU.ALIAS.AQUI' // 👈 TU ALIAS REAL DE MP
  const NUMERO_WHATSAPP = '5491112345678' // 👈 TU NUMERO REAL

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

  function abrirModalReserva(cancha, h) {
    setCanchaSeleccionada(cancha)
    setHoraInicio(h)
    const idx = horarios.indexOf(h)
    if (idx !== -1 && idx + 3 < horarios.length) {
      setHoraFin(horarios[idx + 3])
    } else {
      setHoraFin(h)
    }
    setModalAbierto(true)
  }

  async function procesarReservaCliente(e, metodoPago) {
    e.preventDefault()
    if (!nombreCliente || !telefonoCliente) return alert('Por favor completá tus datos.')

    const { error } = await supabase.from('reservas').insert([
      { 
        cancha_id: canchaSeleccionada.id, 
        fecha: fechaSeleccionada, 
        hora_inicio: `${horaInicio} a ${horaFin}`, 
        estado: metodoPago === 'mp' ? 'pendiente_mp' : 'pendiente_coordinar',
        cliente_nombre: nombreCliente,
        cliente_telefono: telefonoCliente,
        pago_confirmado: false
      }
    ])

    if (error) {
      alert('Error al procesar la reserva: ' + error.message)
    } else {
      setModalAbierto(false)
      cargarDatos()

      if (metodoPago === 'mp') {
        alert('¡Turno registrado! Serás redirigido a Mercado Pago para abonar.')
        window.location.href = `https://link.mercadopago.com.ar/transfer?alias=${MI_ALIAS}`
      } else {
        const mensajeWA = `Hola! Quiero reservar el turno:%0A🎾 *${canchaSeleccionada.nombre}*%0A📅 Fecha: ${fechaSeleccionada}%0A⏰ Horario: ${horaInicio} a ${horaFin}%0A👤 Nombre: ${nombreCliente}%0A📱 Tel: ${telefonoCliente}%0A¿Me confirmás el turno para coordinar el pago?`
        window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeWA}`, '_blank')
      }
    }
  }

  async function BloquearTurnoAdmin(e) {
    e.preventDefault()
    if (!canchaIdAdmin || !fechaAdmin || !horaInicioAdmin || !horaFinAdmin) return alert('Completá todos los campos')
    setGuardando(true)

    const { error } = await supabase.from('reservas').insert([
      { 
        cancha_id: canchaIdAdmin, 
        fecha: fechaAdmin, 
        hora_inicio: `${horaInicioAdmin} a ${horaFinAdmin}`, 
        estado: esTurnoFijo ? 'fijo' : 'bloqueado', 
        pago_confirmado: true 
      }
    ])

    setGuardando(false)
    if (error) {
      alert('Error al reservar: ' + error.message)
    } else {
      alert(esTurnoFijo ? '¡Turno fijo registrado!' : '¡Turno bloqueado con éxito!')
      cargarDatos()
    }
  }

  async function cambiarEstadoPago(id, estadoActual) {
    await supabase.from('reservas').update({ pago_confirmado: !estadoActual }).eq('id', id)
    cargarDatos()
  }

  async function cancelarReserva(id) {
    if (!confirm('¿Seguro que querés eliminar este turno?')) return
    await supabase.from('reservas').delete().eq('id', id)
    cargarDatos()
  }

  // Cálculos para panel admin
  const totalPosiblesTurnos = canchas.length * horarios.length
  const turnosDelDia = reservas.filter(r => r.fecha === fechaSeleccionada)
  const turnosOcupadosCount = turnosDelDia.length
  const turnosLibresCount = totalPosiblesTurnos - turnosOcupadosCount
  const turnosFijosList = reservas.filter(r => r.estado === 'fijo')

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* BARRA SUPERIOR CON LOGIN/PANEL ADMIN */}
      <div style={{ background: '#f3f4f6', padding: '12px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!esAdmin ? (
          <form onSubmit={loginAdmin} style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Acceso Admin:</span>
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={claveAdmin} 
              onChange={(e) => setClaveAdmin(e.target.value)} 
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
            />
            <button type="submit" style={{ padding: '6px 12px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
              Entrar
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#16a34a' }}>✓ Sesión de Administrador Activa</span>
            <button onClick={() => setEsAdmin(false)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* DETALLES RESUMEN Y CONTROLES EXCLUSIVOS DE ADMIN */}
      {esAdmin && (
        <section style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '30px' }}>
          <h2>🔒 Panel de Control (Admin)</h2>

          {/* TARJETAS DE ESTADÍSTICAS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '15px 0' }}>
            <div style={{ background: '#dcfce7', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#166534' }}>Libres ({fechaSeleccionada})</span>
              <h3 style={{ margin: '5px 0 0 0', color: '#166534' }}>{turnosLibresCount}</h3>
            </div>
            <div style={{ background: '#fee2e2', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#991b1b' }}>Ocupados</span>
              <h3 style={{ margin: '5px 0 0 0', color: '#991b1b' }}>{turnosOcupadosCount}</h3>
            </div>
            <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', color: '#075985' }}>Turnos Fijos</span>
              <h3 style={{ margin: '5px 0 0 0', color: '#075985' }}>{turnosFijosList.length}</h3>
            </div>
          </div>

          {/* FORMULARIO DE BLOQUEO / TURNO FIJO */}
          <form onSubmit={BloquearTurnoAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '15px' }}>
            <h3>Bloquear Turno / Cargar Turno Fijo</h3>
            <select onChange={(e) => setCanchaIdAdmin(e.target.value)} value={canchaIdAdmin} required style={{ padding: '8px' }}>
              <option value="">Seleccionar Cancha</option>
              {canchas.map((c, i) => <option key={c.id} value={c.id}>Cancha {i + 1}</option>)}
            </select>
            <input type="date" value={fechaAdmin} onChange={(e) => setFechaAdmin(e.target.value)} required style={{ padding: '8px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="time" value={horaInicioAdmin} onChange={(e) => setHoraInicioAdmin(e.target.value)} required style={{ padding: '8px', flex: 1 }} placeholder="Desde" />
              <input type="time" value={horaFinAdmin} onChange={(e) => setHoraFinAdmin(e.target.value)} required style={{ padding: '8px', flex: 1 }} placeholder="Hasta" />
            </div>
            <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={esTurnoFijo} onChange={(e) => setEsTurnoFijo(e.target.checked)} />
              Marcar como <strong>Turno Fijo</strong>
            </label>
            <button type="submit" disabled={guardando} style={{ padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {guardando ? 'Guardando...' : 'Cargar / Bloquear'}
            </button>
          </form>

          {/* SECCIÓN TURNOS FIJOS */}
          <div style={{ marginTop: '20px' }}>
            <h4>📌 Lista de Turnos Fijos Registrados</h4>
            {turnosFijosList.length === 0 ? (
              <p style={{ color: '#666', fontSize: '13px' }}>No tenés turnos fijos cargados.</p>
            ) : (
              <ul style={{ paddingLeft: '20px', fontSize: '13px' }}>
                {turnosFijosList.map(tf => (
                  <li key={tf.id} style={{ marginBottom: '6px' }}>
                    <strong>{tf.canchas?.nombre}</strong> - {tf.fecha} ({tf.hora_inicio} hs)
                    <button onClick={() => cancelarReserva(tf.id)} style={{ marginLeft: '8px', color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Liberar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* VISTA PÚBLICA DE CLIENTES */}
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
            {canchas.map((cancha, index) => {
              const nombreSimplificado = `Cancha ${index + 1}`
              
              return (
                <div key={cancha.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ margin: '0 0 15px 0' }}>{nombreSimplificado}</h2>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                    {horarios.map((h) => {
                      const ocupado = reservas.some(
                        (r) => r.cancha_id === cancha.id && r.fecha === fechaSeleccionada && r.hora_inicio.includes(h)
                      )
                      return (
                        <button
                          key={h}
                          disabled={ocupado}
                          onClick={() => abrirModalReserva({ ...cancha, nombre: nombreSimplificado }, h)}
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
              )
            })}
          </div>
        )}
      </section>

      {/* MODAL RESERVA CLIENTE */}
      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', maxWidth: '400px', width: '100%' }}>
            <h3>Confirmar Turno</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Cancha: <strong>{canchaSeleccionada?.nombre}</strong> <br />
              Día: <strong>{fechaSeleccionada}</strong>
            </p>
            
            <form style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Desde:</label>
                  <select value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    {horarios.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Hasta:</label>
                  <select value={horaFin} onChange={(e) => setHoraFin(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    {horarios.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={(e) => procesarReservaCliente(e, 'mp')}
                  style={{ padding: '12px', background: '#009ee3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💳 Pagar con Mercado Pago
                </button>
                <button 
                  type="button" 
                  onClick={(e) => procesarReservaCliente(e, 'whatsapp')}
                  style={{ padding: '12px', background: '#25d366', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💬 Enviar WhatsApp para Coordinar
                </button>
              </div>

              <button type="button" onClick={() => setModalAbierto(false)} style={{ padding: '8px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginTop: '5px' }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

