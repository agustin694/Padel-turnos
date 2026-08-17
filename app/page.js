'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)

  // Configuración General
  const NOMBRE_CLUB = 'Quinta Padel'
  const CLAVE_ACCESO = 'admin123'
  const MI_ALIAS = 'TU.ALIAS.AQUI' 
  const NUMERO_WHATSAPP = '5491112345678'

  // Resto de estados igual...
  const [esAdmin, setEsAdmin] = useState(false)
  const [claveAdmin, setClaveAdmin] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toLocaleDateString('sv-SE'))
  const [modalAbierto, setModalAbierto] = useState(false)
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null)
  const [horaInicio, setHoraInicio] = useState('14:00')
  const [horaFin, setHoraFin] = useState('15:30')
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  // Generador de horarios cada 30 min (de 07:00 a 02:00)
  const generarHorarios = () => {
    const lista = []
    for (let h = 7; h < 24; h++) {
      lista.push(`${h.toString().padStart(2, '0')}:00`, `${h.toString().padStart(2, '0')}:30`)
    }
    lista.push('00:00', '00:30', '01:00', '01:30', '02:00')
    return lista
  }
  const horarios = generarHorarios()

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const { data: dataCanchas } = await supabase.from('canchas').select('*')
    const { data: dataReservas } = await supabase.from('reservas').select('*, canchas(nombre)')
    if (dataCanchas) setCanchas(dataCanchas)
    if (dataReservas) setReservas(dataReservas)
    setCargando(false)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>🎾 {NOMBRE_CLUB}</h1>

      {/* LOGIN ADMIN */}
      <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
        {!esAdmin ? (
          <form onSubmit={(e) => { e.preventDefault(); if(claveAdmin === CLAVE_ACCESO) setEsAdmin(true); }}>
            <input type="password" placeholder="Clave Admin" onChange={(e) => setClaveAdmin(e.target.value)} />
            <button type="submit">Ingresar</button>
          </form>
        ) : (
          <div>
            <h3>Panel Admin - {NOMBRE_CLUB}</h3>
            <h4>Agenda del día: {fechaSeleccionada}</h4>
            
            {/* LISTADO DE TURNOS DETALLADOS */}
            <div style={{ marginTop: '20px' }}>
              {reservas.filter(r => r.fecha === fechaSeleccionada).map(r => (
                <div key={r.id} style={{ background: '#fff', padding: '10px', marginBottom: '5px', border: '1px solid #ddd', borderRadius: '5px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <strong>{r.hora_inicio}</strong> - {r.cliente_nombre || 'Sin nombre'} 
                    <small> ({r.cliente_telefono || 'Sin tel'})</small>
                  </span>
                  <button onClick={async () => { await supabase.from('reservas').delete().eq('id', r.id); cargarDatos(); }}>X</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* VISTA PÚBLICA (Ya tiene los horarios cada 30 min por la función de arriba) */}
      {/* ...resto del componente de grilla... */}
    </div>
  )
}

