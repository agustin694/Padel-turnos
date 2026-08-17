'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const DIAS = [
  { numero: 1, nombre: 'Lun' },
  { numero: 2, nombre: 'Mar' },
  { numero: 3, nombre: 'Mié' },
  { numero: 4, nombre: 'Jue' },
  { numero: 5, nombre: 'Vie' },
  { numero: 6, nombre: 'Sáb' },
  { numero: 0, nombre: 'Dom' }
]

const NOMBRES_DIAS_SEMANA = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
]

const DURACIONES = [60, 90, 120, 150, 180]

const HORARIOS = []

for (let minutos = 7 * 60; minutos <= 25 * 60; minutos += 30) {
  const h = Math.floor(minutos / 60) % 24
  const m = minutos % 60

  HORARIOS.push(
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  )
}

function hoyLocal() {
  const ahora = new Date()

  return `${ahora.getFullYear()}-${String(
    ahora.getMonth() + 1
  ).padStart(2, '0')}-${String(
    ahora.getDate()
  ).padStart(2, '0')}`
}

function minutosDesdeHora(hora) {
  const [h, m] = hora.slice(0, 5).split(':').map(Number)

  let minutos = h * 60 + m

  if (h < 7) {
    minutos += 24 * 60
  }

  return minutos
}

function horaDesdeMinutos(minutos) {
  const h = Math.floor(minutos / 60) % 24
  const m = minutos % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function sumarMinutos(hora, minutos) {
  return horaDesdeMinutos(minutosDesdeHora(hora) + minutos)
}

function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00`)

  d.setDate(d.getDate() + dias)

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${y}-${m}-${day}`
}

function lunesDeSemana(fecha) {
  const d = new Date(`${fecha}T12:00:00`)

  const dia = d.getDay()

  const offset = dia === 0 ? -6 : 1 - dia

  return sumarDias(fecha, offset)
}

function labelDuracion(minutos) {
  const horas = Math.floor(minutos / 60)
  const extra = minutos % 60 === 30

  return `${horas} hora${horas > 1 ? 's' : ''}${extra ? ' y 30 minutos' : ''}`
}

export default function AdminPage() {

  const router = useRouter()

  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [turnosFijos, setTurnosFijos] = useState([])
  const [reservasSemana, setReservasSemana] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [fechaAgenda, setFechaAgenda] = useState(hoyLocal())

  const [canchaId, setCanchaId] = useState('')
  const [canchaSemana, setCanchaSemana] = useState('')

  const [tipoTurno, setTipoTurno] = useState('casual')

  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')

  // Campos turno casual
  const [fechaCasual, setFechaCasual] = useState(hoyLocal())
  const [horaCasual, setHoraCasual] = useState('')
  const [duracionCasual, setDuracionCasual] = useState(60)

  // Campos turno fijo
  const [fechaDesde, setFechaDesde] = useState(hoyLocal())
  const [fechaHasta, setFechaHasta] = useState('')
  const [diasSeleccionados, setDiasSeleccionados] = useState([])
  const [horaFijo, setHoraFijo] = useState('18:00')
  const [duracionFijo, setDuracionFijo] = useState(60)

  const [mostrarFijos, setMostrarFijos] = useState(true)
  const [mostrarReservas, setMostrarReservas] = useState(true)

  useEffect(() => {
    cargarDatos()
    cargarSemana(lunesDeSemana(fechaAgenda))
  }, [fechaAgenda])

  useEffect(() => {
    if (!canchaSemana && canchas.length > 0) {
      setCanchaSemana(canchas[0].id)
    }
  }, [canchas])

  function nombreCancha(canchaIdBuscado) {

    const index = canchas.findIndex(
      c => Number(c.id) === Number(canchaIdBuscado)
    )

    return index >= 0 ? `Cancha ${index + 1}` : 'Cancha'
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function cargarDatos() {

    setCargando(true)

    try {

      const [
        { data: dataCanchas, error: errorCanchas },
        { data: dataReservas, error: errorReservas },
        { data: dataFijos, error: errorFijos }
      ] = await Promise.all([

        supabase
          .from('canchas')
          .select('*')
          .order('id'),

        supabase
          .from('reservas')
          .select('*, canchas(nombre)')
          .eq('fecha', fechaAgenda)
          .order('hora_inicio'),

        supabase
          .from('turnos_fijos')
          .select('*, canchas(nombre)')
          .eq('estado', 'activo')
          .order('hora_inicio')

      ])

      if (errorCanchas) {
        throw errorCanchas
      }

      if (errorReservas) {
        throw errorReservas
      }

      if (errorFijos) {
        throw errorFijos
      }

      setCanchas(dataCanchas || [])
      setReservas(dataReservas || [])
      setTurnosFijos(dataFijos || [])

      if (
        !canchaId &&
        dataCanchas &&
        dataCanchas.length > 0
      ) {
        setCanchaId(dataCanchas[0].id)
      }

    } catch (error) {

      console.error(error)

      alert(
        'No se pudieron cargar los datos:\n\n' +
        error.message
      )

    } finally {

      setCargando(false)

    }
  }

  async function cargarSemana(lunes) {

    const domingo = sumarDias(lunes, 6)

    const { data, error } = await supabase
      .from('reservas')
      .select('*')
      .gte('fecha', lunes)
      .lte('fecha', domingo)

    if (!error) {
      setReservasSemana(data || [])
    }
  }

  function cambiarDia(dia) {

    setDiasSeleccionados(prev => {

      if (prev.includes(dia)) {
        return prev.filter(d => d !== dia)
      }

      return [...prev, dia].sort()

    })
  }

  function cambiarDiaNavegacion(numeroDia) {
    const actual = new Date(`${fechaAgenda}T12:00:00`)
    const diaActual = actual.getDay()
    const diff = numeroDia - diaActual
    actual.setDate(actual.getDate() + diff)
    setFechaAgenda(actual.toISOString().split('T')[0])
  }

  function turnoFijoCoincideConFecha(turno, fecha) {

    if (
      fecha < turno.fecha_desde ||
      fecha > turno.fecha_hasta
    ) {
      return false
    }

    const fechaObj = new Date(
      `${fecha}T12:00:00`
    )

    const dia =
      fechaObj.getDay()

    return (
      Array.isArray(turno.dias_semana) &&
      turno.dias_semana.includes(dia)
    )
  }

  function horaFinTurno(turno) {

    const duracionTurno =
      turno.duracion_minutos || 60

    const minutos =
      minutosDesdeHora(
        turno.hora_inicio
      ) + duracionTurno

    return horaDesdeMinutos(minutos)
  }

  function esFijoEnHora(canchaIdBuscada, hora, fecha) {
    const inicioSlot = minutosDesdeHora(hora)
    const finSlot = inicioSlot + 30

    return turnosFijos.some(t => {
      if (Number(t.cancha_id) !== Number(canchaIdBuscada)) return false
      if (!turnoFijoCoincideConFecha(t, fecha)) return false
      const inicioFijo = minutosDesdeHora(t.hora_inicio)
      const duracion = t.duracion_minutos || 60
      const finFijo = inicioFijo + duracion

      return inicioSlot < finFijo && finSlot > inicioFijo
    })
  }

  function esCasualEnHora(canchaIdBuscada, hora, fecha) {
    const inicioSlot = minutosDesdeHora(hora)
    const finSlot = inicioSlot + 30

    return reservasNormales.some(r => {
      if (Number(r.cancha_id) !== Number(canchaIdBuscada)) return false
      if (r.fecha !== fecha) return false
      const inicioReserva = minutosDesdeHora(r.hora_inicio)
      const finReserva = r.hora_fin ? minutosDesdeHora(r.hora_fin) : inicioReserva + 90

      return inicioSlot < finReserva && finSlot > inicioReserva
    })
  }

  async function crearTurnoCasual(e) {

    e.preventDefault()

    if (!canchaId) {
      alert('Seleccioná una cancha.')
      return
    }

    if (!clienteNombre.trim()) {
      alert('Ingresá el nombre del cliente.')
      return
    }

    if (!fechaCasual) {
      alert('Seleccioná una fecha.')
      return
    }

    if (!horaCasual) {
      alert('Seleccioná un horario.')
      return
    }

    setGuardando(true)

    try {

      const horaFin = sumarMinutos(horaCasual, duracionCasual)

      const { error } = await supabase
        .from('reservas')
        .insert([
          {
            cancha_id: canchaId,
            fecha: fechaCasual,
            hora_inicio: horaCasual,
            hora_fin: horaFin,
            cliente_nombre: clienteNombre.trim(),
            cliente_telefono: clienteTelefono.trim() || null,
            estado: 'confirmada',
            pago_confirmado: false,
            tipo: 'normal'
          }
        ])

      if (error) {
        throw error
      }

      alert(
        '✅ Turno casual creado correctamente.'
      )

      setClienteNombre('')
      setClienteTelefono('')
      setHoraCasual('')

      await cargarDatos()
      await cargarSemana(lunesDeSemana(fechaAgenda))

    } catch (error) {

      console.error(error)

      alert(
        'No se pudo crear el turno:\n\n' +
        error.message
      )

    } finally {

      setGuardando(false)

    }
  }

  async function crearTurnoFijo(e) {

    e.preventDefault()

    if (!canchaId) {
      alert('Seleccioná una cancha.')
      return
    }

    if (!clienteNombre.trim()) {
      alert('Ingresá el nombre del cliente.')
      return
    }

    if (!fechaDesde || !fechaHasta) {
      alert('Seleccioná las fechas.')
      return
    }

    if (fechaHasta < fechaDesde) {
      alert(
        'La fecha hasta no puede ser anterior a la fecha desde.'
      )
      return
    }

    if (diasSeleccionados.length === 0) {
      alert(
        'Seleccioná al menos un día de la semana.'
      )
      return
    }

    setGuardando(true)

    try {

      const { error } = await supabase
        .from('turnos_fijos')
        .insert([

          {
            cancha_id: canchaId,

            cliente_nombre:
              clienteNombre.trim(),

            cliente_telefono:
              clienteTelefono.trim() || null,

            fecha_desde:
              fechaDesde,

            fecha_hasta:
              fechaHasta,

            dias_semana:
              diasSeleccionados,

            hora_inicio:
              horaFijo,

            duracion_minutos:
              duracionFijo,

            estado:
              'activo'
          }

        ])

      if (error) {
        throw error
      }

      alert(
        '✅ Turno fijo creado correctamente. Se va a repetir automáticamente todas las semanas, en los días elegidos, dentro del rango de fechas.'
      )

      setClienteNombre('')
      setClienteTelefono('')
      setDiasSeleccionados([])
      setFechaHasta('')

      await cargarDatos()
      await cargarSemana(lunesDeSemana(fechaAgenda))

    } catch (error) {

      console.error(error)

      alert(
        'No se pudo crear el turno fijo:\n\n' +
        error.message
      )

    } finally {

      setGuardando(false)

    }
  }

  async function eliminarTurnoFijo(id) {

    const confirmar = confirm(
      '¿Querés eliminar este turno fijo completo?'
    )

    if (!confirmar) {
      return
    }

    const { error } = await supabase
      .from('turnos_fijos')
      .delete()
      .eq('id', id)

    if (error) {

      alert(
        'No se pudo eliminar:\n\n' +
        error.message
      )

      return
    }

    alert('Turno fijo eliminado.')

    cargarDatos()
    cargarSemana(lunesDeSemana(fechaAgenda))
  }

  async function cancelarReserva(id) {

    const confirmar = confirm(
      '¿Seguro que querés cancelar esta reserva?'
    )

    if (!confirmar) {
      return
    }

    const { error } = await supabase
      .from('reservas')
      .delete()
      .eq('id', id)

    if (error) {

      alert(
        'No se pudo cancelar:\n\n' +
        error.message
      )

      return
    }

    cargarDatos()
    cargarSemana(lunesDeSemana(fechaAgenda))
  }

  async function cambiarPago(id, estadoActual) {

    const { error } = await supabase
      .from('reservas')
      .update({
        pago_confirmado:
          !estadoActual
      })
      .eq('id', id)

    if (error) {

      alert(
        'No se pudo actualizar el pago:\n\n' +
        error.message
      )

      return
    }

    cargarDatos()
  }

  function hayReservaEnSemana(canchaIdBuscada, fecha, hora) {

    const inicio = minutosDesdeHora(hora)
    const fin = inicio + 30

    return reservasSemana.some(r => {

      if (Number(r.cancha_id) !== Number(canchaIdBuscada)) {
        return false
      }

      if (r.fecha !== fecha) {
        return false
      }

      const inicioReserva = minutosDesdeHora(r.hora_inicio)

      const finReserva = r.hora_fin
        ? minutosDesdeHora(r.hora_fin)
        : inicioReserva + 90

      return inicio < finReserva && fin > inicioReserva

    })
  }

  function hayTurnoFijoEnSemana(canchaIdBuscada, fecha, hora) {

    const inicio = minutosDesdeHora(hora)
    const fin = inicio + 30

    return turnosFijos.some(t => {

      if (Number(t.cancha_id) !== Number(canchaIdBuscada)) {
        return false
      }

      if (!turnoFijoCoincideConFecha(t, fecha)) {
        return false
      }

      const inicioFijo = minutosDesdeHora(t.hora_inicio)
      const finFijo = inicioFijo + (t.duracion_minutos || 60)

      return inicio < finFijo && fin > inicioFijo

    })
  }

  function horariosLibresDia(fecha) {

    const hoy = hoyLocal()

    if (!canchaSemana) {
      return []
    }

    return HORARIOS.filter(hora => {

      if (fecha < hoy) {
        return false
      }

      if (fecha === hoy) {

        const ahora = new Date()

        const minutosActuales =
          ahora.getHours() * 60 + ahora.getMinutes()

        if (minutosDesdeHora(hora) <= minutosActuales) {
          return false
        }
      }

      return (
        !hayReservaEnSemana(canchaSemana, fecha, hora) &&
        !hayTurnoFijoEnSemana(canchaSemana, fecha, hora)
      )

    })
  }

  const diasSemanaFechas = useMemo(() => {

    const lunes = lunesDeSemana(fechaAgenda)

    return [0, 1, 2, 3, 4, 5, 6].map(i => sumarDias(lunes, i))

  }, [fechaAgenda])

  const fijosDelDia =
    turnosFijos.filter(
      t => turnoFijoCoincideConFecha(t, fechaAgenda)
    )

  const reservasNormales =
    reservas.filter(
      r =>
        r.estado !== 'bloqueado'
    )

  return (

    <main>

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #07110d;
          color: white;
          font-family: Arial, sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .contenedor {
          max-width: 800px;
          margin: auto;
          padding: 18px;
        }

        .tituloPrincipal {
          text-align: center;
          margin-bottom: 22px;
        }

        .tituloPrincipal h1 {
          margin: 0;
          font-size: 28px;
        }

        .tituloPrincipal p {
          color: #91a69b;
        }

        .btnLogout {
          margin-top: 10px;
          padding: 8px 14px;
          border: 1px solid #3b574a;
          border-radius: 10px;
          background: transparent;
          color: #c2d0ca;
          cursor: pointer;
        }

        .tarjeta {
          background: #0d1d16;
          border: 1px solid #254536;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 16px;
        }

        .tarjeta h2 {
          margin-top: 0;
          font-size: 19px;
        }

        .campo {
          margin-bottom: 12px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          color: #afc0b8;
          font-size: 12px;
          font-weight: bold;
        }

        input,
        select {
          width: 100%;
          padding: 12px;
          background: #07110d;
          color: white;
          border: 1px solid #355546;
          border-radius: 10px;
        }

        .fila {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .dias {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-top: 8px;
        }

        .dia {
          padding: 10px 4px;
          border-radius: 8px;
          border: 1px solid #355546;
          background: #07110d;
          color: #a9bbb2;
          cursor: pointer;
          font-size: 12px;
          text-align: center;
        }

        .dia.activo {
          background: #d7ff45;
          color: #142009;
          border-color: #d7ff45;
          font-weight: bold;
        }

        .tabsTipo {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }

        .tabTipo {
          padding: 13px;
          border-radius: 12px;
          border: 1px solid #355546;
          background: #07110d;
          color: #a9bbb2;
          font-weight: 800;
          cursor: pointer;
        }

        .tabTipo.activo {
          background: #d7ff45;
          color: #142009;
          border-color: #d7ff45;
        }

        .btnPrincipal {
          width: 100%;
          padding: 14px;
          margin-top: 8px;
          border: 0;
          border-radius: 12px;
          background: #d7ff45;
          color: #17200b;
          font-weight: 900;
          cursor: pointer;
        }

        .btnPrincipal:disabled {
          opacity: .5;
        }

        .agendaHeader {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .agendaHeader button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 10px;
          background: #183126;
          color: white;
          cursor: pointer;
        }

        .fecha {
          flex: 1;
          text-align: center;
          font-weight: bold;
          text-transform: capitalize;
        }

        .agendaCancha {
          border-top: 1px solid #274536;
          padding-top: 14px;
          margin-top: 14px;
        }

        .agendaCancha h3 {
          margin: 0 0 10px;
        }

        .reserva {
          background: #182c24;
          border-left: 4px solid #d7ff45;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 8px;
        }

        .fijo {
          background: #211f0d;
          border-left: 4px solid #eab308;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 8px;
        }

        .info {
          color: #a9bbb2;
          font-size: 12px;
          margin-top: 4px;
        }

        .acciones {
          display: flex;
          gap: 7px;
          margin-top: 10px;
          flex-wrap: wrap;
        }

        .btnPago {
          border: 0;
          border-radius: 8px;
          padding: 8px 10px;
          color: white;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
        }

        .pagado {
          background: #16a34a;
        }

        .pendiente {
          background: #ca8a04;
        }

        .btnEliminar {
          border: 1px solid #ef4444;
          color: #ff7777;
          background: transparent;
          border-radius: 8px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 11px;
        }

        .vacio {
          color: #83968d;
          padding: 15px 0;
          text-align: center;
        }

        .toggle {
          width: 100%;
          text-align: left;
          background: transparent;
          color: white;
          border: 0;
          font-weight: bold;
          padding: 5px 0 15px;
          cursor: pointer;
        }

        .semanaGrid {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
        }

        .diaSemana {
          min-width: 118px;
          background: #07120d;
          border: 1px solid #2b6642;
          border-radius: 12px;
          padding: 10px;
          text-align: center;
          flex-shrink: 0;
        }

        .diaSemana strong {
          display: block;
          font-size: 13px;
        }

        .fechaChica {
          color: #82978d;
          font-size: 11px;
          margin-bottom: 6px;
        }

        .cantidadLibre {
          color: #9ce66a;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .chipsHorarios {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          justify-content: center;
          margin-bottom: 10px;
          min-height: 22px;
        }

        .chip {
          background: rgba(215,255,69,.12);
          border: 1px solid rgba(215,255,69,.25);
          color: #d7ff45;
          font-size: 10px;
          padding: 3px 6px;
          border-radius: 6px;
        }

        .btnVerDia {
          width: 100%;
          border: 1px solid #355546;
          background: transparent;
          color: #c2d0ca;
          padding: 7px;
          border-radius: 8px;
          font-size: 11px;
          cursor: pointer;
        }

        .grupoCancha {
          margin-bottom: 18px;
        }

        .grupoCancha h3 {
          margin: 0 0 10px;
        }

        @media(max-width: 520px) {

          .fila {
            grid-template-columns: 1fr;
          }

          .contenedor {
            padding: 12px;
          }

          .dias {
            grid-template-columns: repeat(4, 1fr);
          }

        }

      `}</style>

      <div className="contenedor">

        <div className="tituloPrincipal">

          <h1>
            🔒 Panel Admin: Quinta Padel
          </h1>

          <p>
            {fechaAgenda}
          </p>

          <button
            className="btnLogout"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>

        </div>

        {/* NAVEGADOR RÁPIDO DE DÍAS (LUNES A DOMINGO) */}
        <section className="tarjeta">
          <label style={{ marginBottom: '8px' }}>Navegación semanal rápida</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {[
              { numero: 1, nombre: 'Lun' },
              { numero: 2, nombre: 'Mar' },
              { numero: 3, nombre: 'Mié' },
              { numero: 4, nombre: 'Jue' },
              { numero: 5, nombre: 'Vie' },
              { numero: 6, nombre: 'Sáb' },
              { numero: 0, nombre: 'Dom' }
            ].map(d => (
              <button
                key={d.numero}
                type="button"
                onClick={() => cambiarDiaNavegacion(d.numero)}
                style={{
                  background: '#183126',
                  color: 'white',
                  border: '1px solid #355546',
                  padding: '8px 2px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                {d.nombre}
              </button>
            ))}
          </div>
        </section>

        {/* VISTA RÁPIDA DE COLORES SEPARADA POR CANCHA */}
        <section className="tarjeta">
          <h2>👁️ Vista rápida de horarios ({fechaAgenda})</h2>
          
          {canchas.map(cancha => (
            <div key={cancha.id} style={{ marginTop: '14px' }}>
              <h3 style={{ fontSize: '14px', margin: '0 0 6px 0', color: '#d7ff45' }}>🎾 {nombreCancha(cancha.id)}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                {HORARIOS.map(h => {
                  const fijo = esFijoEnHora(cancha.id, h, fechaAgenda)
                  const casual = esCasualEnHora(cancha.id, h, fechaAgenda)
                  const colorBg = fijo ? '#3b82f6' : casual ? '#8b5cf6' : '#22c55e'
                  return (
                    <div
                      key={h}
                      style={{
                        background: colorBg,
                        textAlign: 'center',
                        fontSize: '10px',
                        padding: '5px 2px',
                        borderRadius: '4px',
                        color: '#fff',
                        fontWeight: 'bold'
                      }}
                    >
                      {h}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '15px', fontSize: '11px' }}>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px', marginRight: '4px' }}></span> Fijo</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#8b5cf6', borderRadius: '2px', marginRight: '4px' }}></span> Casual</span>
            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22c55e', borderRadius: '2px', marginRight: '4px' }}></span> Libre</span>
          </div>
        </section>

        {/* CREAR TURNO */}

        <section className="tarjeta">

          <h2>
            ➕ Crear turno
          </h2>

          <div className="tabsTipo">

            <button
              type="button"
              className={
                `tabTipo ${tipoTurno === 'casual' ? 'activo' : ''}`
              }
              onClick={() => setTipoTurno('casual')}
            >
              🟢 Turno casual
            </button>

            <button
              type="button"
              className={
                `tabTipo ${tipoTurno === 'fijo' ? 'activo' : ''}`
              }
              onClick={() => setTipoTurno('fijo')}
            >
              🔵 Turno fijo
            </button>

          </div>

          <form
            onSubmit={
              tipoTurno === 'casual'
                ? crearTurnoCasual
                : crearTurnoFijo
            }
          >

            <div className="campo">

              <label>
                Cancha
              </label>

              <select
                value={canchaId}
                onChange={(e) =>
                  setCanchaId(e.target.value)
                }
              >

                <option value="">
                  Seleccionar cancha
                </option>

                {canchas.map(c => (

                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {nombreCancha(c.id)}
                  </option>

                ))}

              </select>

            </div>

            <div className="fila">

              <div className="campo">

                <label>
                  Cliente
                </label>

                <input
                  value={clienteNombre}
                  onChange={(e) =>
                    setClienteNombre(
                      e.target.value
                    )
                  }
                  placeholder="Nombre"
                />

              </div>

              <div className="campo">

                <label>
                  WhatsApp
                </label>

                <input
                  value={clienteTelefono}
                  onChange={(e) =>
                    setClienteTelefono(
                      e.target.value
                    )
                  }
                  placeholder="Teléfono"
                />

              </div>

            </div>

            {tipoTurno === 'casual' ? (

              <>

                <div className="fila">

                  <div className="campo">

                    <label>
                      Fecha
                    </label>

                    <input
                      type="date"
                      value={fechaCasual}
                      onChange={(e) =>
                        setFechaCasual(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="campo">

                    <label>
                      Hora de inicio
                    </label>

                    <select
                      value={horaCasual}
                      onChange={(e) =>
                        setHoraCasual(
                          e.target.value
                        )
                      }
                    >

                      <option value="">
                        Elegir horario
                      </option>

                      {HORARIOS.map(hora => (

                        <option
                          key={hora}
                          value={hora}
                        >
                          {hora}
                        </option>

                      ))}

                    </select>

                  </div>

                </div>

                <div className="campo">

                  <label>
                    Duración
                  </label>

                  <select
                    value={duracionCasual}
                    onChange={(e) =>
                      setDuracionCasual(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >

                    {DURACIONES.map(minutos => (

                      <option
                        key={minutos}
                        value={minutos}
                      >
                        {labelDuracion(minutos)}
                      </option>

                    ))}

                  </select>

                </div>

              </>

            ) : (

              <>

                <div className="fila">

                  <div className="campo">

                    <label>
                      Desde
                    </label>

                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) =>
                        setFechaDesde(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="campo">

                    <label>
                      Hasta
                    </label>

                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) =>
                        setFechaHasta(
                          e.target.value
                        )
                      }
                    />

                  </div>

                </div>

                <div className="campo">

                  <label>
                    Días (se va a repetir automáticamente cada semana en los días marcados, dentro del rango de fechas)
                  </label>

                  <div className="dias">

                    {DIAS.map(dia => (

                      <button
                        type="button"
                        key={dia.numero}
                        className={
                          `dia ${
                            diasSeleccionados.includes(
                              dia.numero
                            )
                              ? 'activo'
                              : ''
                          }`
                        }
                        onClick={() =>
                          cambiarDia(
                            dia.numero
                          )
                        }
                      >

                        {diasSeleccionados.includes(
                          dia.numero
                        )
                          ? '✓ '
                          : ''}

                        {dia.nombre}

                      </button>

                    ))}

                  </div>

                </div>

                <div className="fila">

                  <div className="campo">

                    <label>
                      Hora de inicio
                    </label>

                    <select
                      value={horaFijo}
                      onChange={(e) =>
                        setHoraFijo(
                          e.target.value
                        )
                      }
                    >

                      {HORARIOS.map(hora => (

                        <option
                          key={hora}
                          value={hora}
                        >
                          {hora}
                        </option>

                      ))}

                    </select>

                  </div>

                  <div className="campo">

                    <label>
                      Duración
                    </label>

                    <select
                      value={duracionFijo}
                      onChange={(e) =>
                        setDuracionFijo(
                          Number(
                            e.target.value
                          )
                        )
                      }
                    >

                      {DURACIONES.map(minutos => (

                        <option
                          key={minutos}
                          value={minutos}
                        >
                          {labelDuracion(minutos)}
                        </option>

                      ))}

                    </select>

                  </div>

                </div>

              </>

            )}

            <button
              className="btnPrincipal"
              disabled={guardando}
            >

              {guardando
                ? 'Creando...'
                : tipoTurno === 'casual'
                  ? '➕ Crear turno casual'
                  : '➕ Crear turno fijo'}

            </button>

          </form>

        </section>

        {/* DISPONIBILIDAD SEMANAL */}

        <section className="tarjeta">

          <h2>
            📆 Disponibilidad semanal
          </h2>

          <div className="campo">

            <label>
              Cancha
            </label>

            <select
              value={canchaSemana}
              onChange={(e) =>
                setCanchaSemana(e.target.value)
              }
            >

              {canchas.map(c => (

                <option
                  key={c.id}
                  value={c.id}
                >
                  {nombreCancha(c.id)}
                </option>

              ))}

            </select>

          </div>

          <div className="semanaGrid">

            {diasSemanaFechas.map((fecha, i) => {

              const libres = horariosLibresDia(fecha)

              return (

                <div
                  className="diaSemana"
                  key={fecha}
                >

                  <strong>
                    {NOMBRES_DIAS_SEMANA[i]}
                  </strong>

                  <div className="fechaChica">
                    {fecha.slice(8, 10)}/{fecha.slice(5, 7)}
                  </div>

                  <div className="cantidadLibre">
                    {libres.length} libres
                  </div>

                  <div className="chipsHorarios">

                    {libres.slice(0, 4).map(hora => (

                      <span
                        className="chip"
                        key={hora}
                      >
                        {hora}
                      </span>

                    ))}

                    {libres.length > 4 && (

                      <span className="chip">
                        +{libres.length - 4}
                      </span>

                    )}

                  </div>

                  <button
                    className="btnVerDia"
                    onClick={() =>
                      setFechaAgenda(fecha)
                    }
                  >
                    Ver agenda
                  </button>

                </div>

              )

            })}

          </div>

        </section>

        {/* AGENDA */}

        <section className="tarjeta">

          <h2>
            📅 Agenda
          </h2>

          <div className="agendaHeader">

            <button
              onClick={() => {

                setFechaAgenda(
                  sumarDias(fechaAgenda, -1)
                )

              }}
            >
              ‹
            </button>

            <div className="fecha">
              {fechaAgenda}
            </div>

            <button
              onClick={() => {

                setFechaAgenda(
                  sumarDias(fechaAgenda, 1)
                )

              }}
            >
              ›
            </button>

          </div>

          {cargando ? (

            <div className="vacio">
              Cargando...
            </div>

          ) : (

            canchas.map(cancha => {

              const reservasCancha =
                reservasNormales.filter(
                  r =>
                    Number(
                      r.cancha_id
                    ) ===
                    Number(cancha.id)
                )

              const fijosCancha =
                fijosDelDia.filter(
                  r =>
                    Number(
                      r.cancha_id
                    ) ===
                    Number(cancha.id)
                )

              return (

                <div
                  className="agendaCancha"
                  key={cancha.id}
                >

                  <h3>
                    🎾 {nombreCancha(cancha.id)}
                  </h3>

                  {mostrarFijos && fijosCancha.map(fijo => (

                    <div
                      className="fijo"
                      key={`fijo-${fijo.id}`}
                    >

                      <strong>
                        🔵 {fijo.hora_inicio}
                        {' - '}
                        {horaFinTurno(fijo)}
                      </strong>

                      <div className="info">

                        Turno fijo ·{' '}
                        {fijo.cliente_nombre}

                        {fijo.cliente_telefono
                          ? ` · ${fijo.cliente_telefono}`
                          : ''}

                      </div>

                      <div className="acciones">

                        <button
                          className="btnEliminar"
                          onClick={() =>
                            eliminarTurnoFijo(
                              fijo.id
                            )
                          }
                        >
                          🗑️ Eliminar fijo
                        </button>

                      </div>

                    </div>

                  ))}

                  {mostrarReservas && reservasCancha.map(reserva => (

                    <div
                      className="reserva"
                      key={reserva.id}
                    >

                      <strong>
                        🟢 {reserva.hora_inicio}
                        {reserva.hora_fin
                          ? ` - ${reserva.hora_fin}`
                          : ''}
                      </strong>

                      <div className="info">

                        Cliente:{' '}
                        {reserva.cliente_nombre ||
                          'Sin nombre'}

                        {reserva.cliente_telefono
                          ? ` · ${reserva.cliente_telefono}`
                          : ''}

                      </div>

                      <div className="acciones">

                        <button
                          className={
                            `btnPago ${
                              reserva.pago_confirmado
                                ? 'pagado'
                                : 'pendiente'
                            }`
                          }
                          onClick={() =>
                            cambiarPago(
                              reserva.id,
                              reserva.pago_confirmado
                            )
                          }
                        >

                          {reserva.pago_confirmado
                            ? '✓ Pagado'
                            : '⚡ Confirmar pago'}

                        </button>

                        <button
                          className="btnEliminar"
                          onClick={() =>
                            cancelarReserva(
                              reserva.id
                            )
                          }
                        >
                          🗑️ Liberar turno
                        </button>

                      </div>

                    </div>

                  ))}

                  {reservasCancha.length === 0 &&
                    fijosCancha.length === 0 && (

                      <div className="vacio">
                        No hay reservas.
                      </div>

                    )}

                </div>

              )

            })

          )}

        </section>

        {/* TURNOS FIJOS, SEPARADOS POR CANCHA */}

        <section className="tarjeta">

          <button
            className="toggle"
            onClick={() =>
              setMostrarFijos(
                !mostrarFijos
              )
            }
          >
            🔵 Turnos fijos activos
            {' '}
            ({turnosFijos.length})
            {' '}
            {mostrarFijos ? '▲' : '▼'}
          </button>

          {mostrarFijos && canchas.map(cancha => {

            const fijosCancha = turnosFijos.filter(
              t => Number(t.cancha_id) === Number(cancha.id)
            )

            return (

              <div
                className="grupoCancha"
                key={cancha.id}
              >

                <h3>
                  🎾 {nombreCancha(cancha.id)} ({fijosCancha.length})
                </h3>

                {fijosCancha.length === 0 && (

                  <div className="vacio">
                    Sin turnos fijos en esta cancha.
                  </div>

                )}

                {fijosCancha.map(fijo => (

                  <div
                    className="fijo"
                    key={fijo.id}
                  >

                    <strong>
                      {fijo.hora_inicio}
                      {' - '}
                      {horaFinTurno(fijo)}
                    </strong>

                    <div className="info">

                      {fijo.cliente_nombre}

                      {' · '}

                      {fijo.fecha_desde}
                      {' → '}
                      {fijo.fecha_hasta}

                    </div>

                    <div className="info">

                      Días:{' '}

                      {Array.isArray(
                        fijo.dias_semana
                      )
                        ? fijo.dias_semana
                            .map(
                              d =>
                                DIAS.find(
                                  dia =>
                                    dia.numero ===
                                    Number(d)
                                )?.nombre
                            )
                            .join(', ')
                        : 'Sin días'}

                    </div>

                    <div className="acciones">

                      <button
                        className="btnEliminar"
                        onClick={() =>
                          eliminarTurnoFijo(
                            fijo.id
                          )
                        }
                      >
                        🗑️ Eliminar turno fijo
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            )

          })}

        </section>

      </div>

    </main>
  )
}

