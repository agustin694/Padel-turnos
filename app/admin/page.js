'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ... (DIAS, DIAS_SHORT, DURACIONES, HORARIOS, funciones de utilidad se mantienen igual)
// [MANTENER TODO EL BLOQUE DE FUNCIONES INICIALES HASTA EL COMPONENTE AdminPage]

export default function AdminPage() {
  const router = useRouter()

  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [turnosFijos, setTurnosFijos] = useState([])
  
  // NUEVO: Estado para pagos pendientes globales
  const [pagosPendientesGlobales, setPagosPendientesGlobales] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [fechaAgenda, setFechaAgenda] = useState(hoyLocal())

  // ... (RESTO DE ESTADOS se mantienen igual)
  const [buscarReservasAbierto, setBuscarReservasAbierto] = useState(false)
  const [fechaConsultaFutura, setFechaConsultaFutura] = useState(sumarDias(hoyLocal(), 7))
  const [reservasFuturasConsulta, setReservasFuturasConsulta] = useState([])
  const [cargandoConsultaFutura, setCargandoConsultaFutura] = useState(false)
  const [canchaId, setCanchaId] = useState('')
  const [canchaAgendaFiltro, setCanchaAgendaFiltro] = useState('todas')
  const [canchaFijosFiltro, setCanchaFijosFiltro] = useState('')
  const [diaFijosFiltro, setDiaFijosFiltro] = useState(1)
  const [canchaCasualesConfirmadosFiltro, setCanchaCasualesConfirmadosFiltro] = useState('')
  const [diaCasualesFiltro, setDiaCasualesFiltro] = useState(1)
  const [mostrarCasualesConfirmados, setMostrarCasualesConfirmados] = useState(true)
  const [tipoTurno, setTipoTurno] = useState('casual')
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [fechaCasual, setFechaCasual] = useState(hoyLocal())
  const [horaCasual, setHoraCasual] = useState('')
  const [duracionCasual, setDuracionCasual] = useState(60)
  const [diasSeleccionados, setDiasSeleccionados] = useState([])
  const [horaFijo, setHoraFijo] = useState('18:00')
  const [duracionFijo, setDuracionFijo] = useState(60)
  const [mostrarFijosActivos, setMostrarFijosActivos] = useState(true)
  const [modalWhatsApp, setModalWhatsApp] = useState({ abierto: false, texto: '' })

  useEffect(() => {
    cargarDatos()
    cargarPagosPendientes() // Llamada independiente
  }, [fechaAgenda])

  // Nueva función para traer pagos pendientes de TODO el sistema
  async function cargarPagosPendientes() {
    const { data } = await supabase
      .from('reservas')
      .select('*, canchas(nombre)')
      .eq('estado', 'pendiente_pago')
    
    setPagosPendientesGlobales(data || [])
  }

  // ... (MANTENER todas tus funciones: cargarDatos, consultarFechaFutura, crearTurnoCasual, etc.)

  return (
    <main>
      {/* ... (TUS ESTILOS CSS SE MANTIENEN IGUAL) ... */}

      <div className="contenedor">
        <div className="tituloPrincipal">
          <h1>🔒 Panel Admin: Quinta Padel</h1>
          <p>{fechaAgenda}</p>
          <button className="btnLogout" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>

        {/* NUEVA SECCIÓN: PAGOS PENDIENTES GLOBALES */}
        <section className="tarjeta" style={{ border: '1px solid #ca8a04' }}>
          <h2 style={{ color: '#ca8a04' }}>🔔 Pagos Pendientes (Generales)</h2>
          {pagosPendientesGlobales.length === 0 ? (
            <p className="vacio">No hay pagos pendientes en el sistema.</p>
          ) : (
            pagosPendientesGlobales.map(r => (
              <div key={r.id} className="reserva" style={{ borderLeftColor: '#ca8a04' }}>
                <strong>{r.fecha} - {formatearHora(r.hora_inicio)}</strong>
                <div className="info">Cliente: {r.cliente_nombre}</div>
                <button className="btnPago pendiente" onClick={() => cambiarPago(r.id, false)}>⚡ Confirmar pago</button>
              </div>
            ))
          )}
        </section>

        {/* ... (RESTO DE TU CÓDIGO: Navegación, Vista rápida, Crear turno, Agenda, etc.) */}
      </div>
    </main>
  )
}
