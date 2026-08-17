'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// Funciones de utilidad necesarias
function hoyLocal() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sumarDias(fechaStr, dias) {
  const d = new Date(fechaStr + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatearHora(horaStr) {
  if (!horaStr) return ''
  return horaStr.slice(0, 5)
}

export default function AdminPage() {
  const router = useRouter()

  const [pagosPendientesGlobales, setPagosPendientesGlobales] = useState([])
  const [fechaAgenda, setFechaAgenda] = useState(hoyLocal())

  useEffect(() => {
    cargarPagosPendientes()
  }, [fechaAgenda])

  async function cargarPagosPendientes() {
    const { data } = await supabase
      .from('reservas')
      .select('*, canchas(nombre)')
      .eq('estado', 'pendiente_pago')
    
    setPagosPendientesGlobales(data || [])
  }

  async function cambiarPago(id, estadoActual) {
    const nuevoEstado = estadoActual ? 'pendiente_pago' : 'pagado'
    // Ajusta esto según cómo manejes el pago en tu base de datos (por ejemplo, campo 'pagado' o 'estado')
    await supabase
      .from('reservas')
      .update({ estado: 'confirmado' }) // O el cambio que corrompa/actualice el pago
      .eq('id', id)
    
    cargarPagosPendientes()
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main>
      <div className="contenedor">
        <div className="tituloPrincipal">
          <h1>🔒 Panel Admin: Quinta Padel</h1>
          <p>{fechaAgenda}</p>
          <button className="btnLogout" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>

        {/* SECCIÓN: PAGOS PENDIENTES GLOBALES */}
        <section className="tarjeta" style={{ border: '1px solid #ca8a04' }}>
          <h2 style={{ color: '#ca8a04' }}>🔔 Pagos Pendientes (Generales)</h2>
          {pagosPendientesGlobales.length === 0 ? (
            <p className="vacio">No hay pagos pendientes en el sistema.</p>
          ) : (
            pagosPendientesGlobales.map(r => (
              <div key={r.id} className="reserva" style={{ borderLeftColor: '#ca8a04' }}>
                <strong>{r.fecha} - {formatearHora(r.hora_inicio)}</strong>
                <div className="info">Cliente: {r.cliente_nombre}</div>
                <button className="btnPago pendiente" onClick={() => cambiarPago(r.id, true)}>⚡ Confirmar pago</button>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
