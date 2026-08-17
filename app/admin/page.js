'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const DIAS = [
  { numero: 0, nombre: 'Domingo' },
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
  { numero: 6, nombre: 'Sábado' }
]

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

export default function AdminPage() {

  const router = useRouter()

  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])
  const [turnosFijos, setTurnosFijos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [fechaAgenda, setFechaAgenda] = useState(hoyLocal())

  const [canchaId, setCanchaId] = useState('')

  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTelefono, setClienteTelefono] = useState('')

  const [fechaDesde, setFechaDesde] = useState(hoyLocal())
  const [fechaHasta, setFechaHasta] = useState('')

  const [diasSeleccionados, setDiasSeleccionados] = useState([])

  const [horaInicio, setHoraInicio] = useState('18:00')

  const [duracion, setDuracion] = useState(60)

  const [mostrarFijos, setMostrarFijos] = useState(true)
  const [mostrarReservas, setMostrarReservas] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [fechaAgenda])

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

  function cambiarDia(dia) {

    setDiasSeleccionados(prev => {

      if (prev.includes(dia)) {
        return prev.filter(d => d !== dia)
      }

      return [...prev, dia].sort()

    })
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
              horaInicio,

            duracion_minutos:
              duracion,

            estado:
              'activo'
          }

        ])

      if (error) {
        throw error
      }

      alert(
        '✅ Turno fijo creado correctamente.'
      )

      setClienteNombre('')
      setClienteTelefono('')
      setDiasSeleccionados([])
      setFechaHasta('')

      await cargarDatos()

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

  function turnoFijoCoincideConFecha(turno) {

    if (
      fechaAgenda < turno.fecha_desde ||
      fechaAgenda > turno.fecha_hasta
    ) {
      return false
    }

    const fecha =
      new Date(
        `${fechaAgenda}T12:00:00`
      )

    const dia =
      fecha.getDay()

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

  const fijosDelDia =
    turnosFijos.filter(
      turnoFijoCoincideConFecha
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
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 8px;
        }

        .dia {
          padding: 11px;
          border-radius: 10px;
          border: 1px solid #355546;
          background: #07110d;
          color: #a9bbb2;
          cursor: pointer;
        }

        .dia.activo {
          background: #d7ff45;
          color: #142009;
          border-color: #d7ff45;
          font-weight: bold;
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

        .separador {
          height: 1px;
          background: #294638;
          margin: 22px 0;
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

        @media(max-width: 520px) {

          .fila {
            grid-template-columns: 1fr;
          }

          .contenedor {
            padding: 12px;
          }

        }

      `}</style>

      <div className="contenedor">

        <div className="tituloPrincipal">

          <h1>
            🔒 Panel Admin
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

        {/* CREAR TURNO FIJO */}

        <section className="tarjeta">

          <h2>
            🔵 Crear turno fijo
          </h2>

          <form onSubmit={crearTurnoFijo}>

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
                    {c.nombre}
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
                Días
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
                  value={horaInicio}
                  onChange={(e) =>
                    setHoraInicio(
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
                  value={duracion}
                  onChange={(e) =>
                    setDuracion(
                      Number(
                        e.target.value
                      )
                    )
                  }
                >

                  <option value={60}>
                    1 hora
                  </option>

                  <option value={90}>
                    1 hora 30 minutos
                  </option>

                  <option value={120}>
                    2 horas
                  </option>

                  <option value={150}>
                    2 horas 30 minutos
                  </option>

                  <option value={180}>
                    3 horas
                  </option>

                </select>

              </div>

            </div>

            <button
              className="btnPrincipal"
              disabled={guardando}
            >

              {guardando
                ? 'Creando...'
                : '➕ Crear turno fijo'}

            </button>

          </form>

        </section>

        {/* AGENDA */}

        <section className="tarjeta">

          <h2>
            📅 Agenda
          </h2>

          <div className="agendaHeader">

            <button
              onClick={() => {

                const fecha =
                  new Date(
                    `${fechaAgenda}T12:00:00`
                  )

                fecha.setDate(
                  fecha.getDate() - 1
                )

                setFechaAgenda(
                  fecha
                    .toISOString()
                    .slice(0, 10)
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

                const fecha =
                  new Date(
                    `${fechaAgenda}T12:00:00`
                  )

                fecha.setDate(
                  fecha.getDate() + 1
                )

                setFechaAgenda(
                  fecha
                    .toISOString()
                    .slice(0, 10)
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
                    🎾 {cancha.nombre}
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

        {/* TURNOS FIJOS */}

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

          {mostrarFijos && turnosFijos.map(fijo => (

            <div
              className="fijo"
              key={fijo.id}
            >

              <strong>
                {fijo.canchas?.nombre}
                {' · '}
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

        </section>

      </div>

    </main>
  )
}

