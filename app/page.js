'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const WHATSAPP = '5491122408566'

const HORARIOS = (() => {
  const horarios = []

  for (let minutos = 7 * 60; minutos <= 25 * 60; minutos += 30) {
    const hora = Math.floor(minutos / 60) % 24
    const minuto = minutos % 60

    horarios.push(
      `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
    )
  }

  return horarios
})()

const DIAS = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo'
]

function fechaLocal() {
  const ahora = new Date()

  const año = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')

  return `${año}-${mes}-${dia}`
}

function formatearFecha(fecha) {
  if (!fecha) return ''

  const [año, mes, dia] = fecha.split('-')

  return new Date(
    Number(año),
    Number(mes) - 1,
    Number(dia)
  ).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function sumarDias(fecha, cantidad) {
  const fechaObj = new Date(`${fecha}T12:00:00`)
  fechaObj.setDate(fechaObj.getDate() + cantidad)

  const año = fechaObj.getFullYear()
  const mes = String(fechaObj.getMonth() + 1).padStart(2, '0')
  const dia = String(fechaObj.getDate()).padStart(2, '0')

  return `${año}-${mes}-${dia}`
}

function obtenerDiaSemana(fecha) {
  const [año, mes, dia] = fecha.split('-')

  const fechaObj = new Date(
    Number(año),
    Number(mes) - 1,
    Number(dia)
  )

  let numero = fechaObj.getDay()

  if (numero === 0) numero = 7

  return numero
}

function obtenerNombreDia(fecha) {
  const numero = obtenerDiaSemana(fecha)

  return DIAS[numero - 1]
}

function agregarMinutos(hora, minutos) {
  const [h, m] = hora.split(':').map(Number)

  const total = h * 60 + m + minutos

  const horaFinal = Math.floor(total / 60) % 24
  const minutoFinal = total % 60

  return `${String(horaFinal).padStart(2, '0')}:${String(minutoFinal).padStart(2, '0')}`
}

function dinero(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Number(valor || 0))
}

export default function Home() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLocal())

  const [canchas, setCanchas] = useState([])
  const [canchaSeleccionada, setCanchaSeleccionada] = useState('')

  const [reservas, setReservas] = useState([])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [horarioSeleccionado, setHorarioSeleccionado] = useState('')

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const [modalReserva, setModalReserva] = useState(false)
  const [reservando, setReservando] = useState(false)

  const [reservaCreada, setReservaCreada] = useState(null)

  const [pago, setPago] = useState('50')

  useEffect(() => {
    cargarCanchas()
  }, [])

  useEffect(() => {
    cargarReservas()
  }, [fechaSeleccionada, canchaSeleccionada])

  async function cargarCanchas() {
    try {
      const { data, error } = await supabase
        .from('canchas')
        .select('*')
        .order('id')

      if (error) throw error

      const lista = data || []

      setCanchas(lista)

      if (lista.length > 0) {
        setCanchaSeleccionada(String(lista[0].id))
      }
    } catch (err) {
      console.error(err)
      setError(
        'No pudimos cargar las canchas. ' +
        (err.message || '')
      )
    }
  }

  async function cargarReservas() {
    if (!canchaSeleccionada) {
      setReservas([])
      setCargando(false)
      return
    }

    setCargando(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .eq('fecha', fechaSeleccionada)
        .eq('cancha_id', Number(canchaSeleccionada))
        .in('estado', [
          'pendiente_pago',
          'confirmada'
        ])

      if (error) throw error

      setReservas(data || [])
    } catch (err) {
      console.error(err)

      setError(
        'No pudimos cargar los horarios disponibles. ' +
        (err.message || '')
      )
    } finally {
      setCargando(false)
    }
  }

  function horarioOcupado(horario) {
    const inicioNuevo = horario
    const finNuevo = agregarMinutos(horario, 60)

    return reservas.some((reserva) => {
      const inicioExistente = String(
        reserva.hora_inicio || ''
      ).slice(0, 5)

      const finExistente = reserva.hora_fin
        ? String(reserva.hora_fin).slice(0, 5)
        : agregarMinutos(inicioExistente, 60)

      return (
        inicioNuevo < finExistente &&
        finNuevo > inicioExistente
      )
    })
  }

  const horariosDisponibles = HORARIOS.filter(
    (horario) => !horarioOcupado(horario)
  )

  function seleccionarHorario(horario) {
    setHorarioSeleccionado(horario)
    setModalReserva(true)
  }

  function cerrarModal() {
    if (reservando) return

    setModalReserva(false)
    setHorarioSeleccionado('')
  }

  async function crearReserva(e) {
    e.preventDefault()

    if (!nombre.trim()) {
      alert('Ingresá tu nombre.')
      return
    }

    if (!telefono.trim()) {
      alert('Ingresá tu teléfono.')
      return
    }

    if (!canchaSeleccionada) {
      alert('Seleccioná una cancha.')
      return
    }

    if (!horarioSeleccionado) {
      alert('Seleccioná un horario.')
      return
    }

    setReservando(true)

    try {
      // Verificamos nuevamente que el horario
      // siga libre antes de crear la reserva.
      const { data: reservasActuales, error: errorConsulta } =
        await supabase
          .from('reservas')
          .select('*')
          .eq('fecha', fechaSeleccionada)
          .eq('cancha_id', Number(canchaSeleccionada))
          .in('estado', [
            'pendiente_pago',
            'confirmada'
          ])

      if (errorConsulta) throw errorConsulta

      const ocupado = (reservasActuales || []).some(
        (reserva) => {
          const inicioExistente = String(
            reserva.hora_inicio || ''
          ).slice(0, 5)

          const finExistente = reserva.hora_fin
            ? String(reserva.hora_fin).slice(0, 5)
            : agregarMinutos(inicioExistente, 60)

          const finNuevo = agregarMinutos(
            horarioSeleccionado,
            60
          )

          return (
            horarioSeleccionado < finExistente &&
            finNuevo > inicioExistente
          )
        }
      )

      if (ocupado) {
        alert(
          'Ese horario acaba de ser reservado por otra persona. Elegí otro.'
        )

        await cargarReservas()

        setModalReserva(false)
        setHorarioSeleccionado('')

        return
      }

      const cancha = canchas.find(
        (c) =>
          Number(c.id) ===
          Number(canchaSeleccionada)
      )

      /*
       * Si tu tabla canchas tiene un precio,
       * lo usamos. Si no lo tiene, queda en 0
       * para que puedas configurarlo después.
       */
      const precioTotal = Number(
        cancha?.precio ||
        cancha?.precio_hora ||
        cancha?.precio_por_hora ||
        0
      )

      const montoPagado =
        pago === '100'
          ? precioTotal
          : precioTotal * 0.5

      const saldoPendiente =
        Math.max(
          precioTotal - montoPagado,
          0
        )

      const { data, error } = await supabase
        .from('reservas')
        .insert({
          cancha_id: Number(canchaSeleccionada),
          cliente_nombre: nombre.trim(),
          cliente_telefono: telefono.trim(),
          fecha: fechaSeleccionada,
          hora_inicio: horarioSeleccionado,
          hora_fin: agregarMinutos(
            horarioSeleccionado,
            60
          ),
          precio_total: precioTotal,
          monto_pagado: montoPagado,
          saldo_pendiente: saldoPendiente,
          estado: 'pendiente_pago',
          estado_pago:
            pago === '100'
              ? 'pago_total'
              : 'pago_50'
        })
        .select()
        .single()

      if (error) throw error

      setReservaCreada({
        ...data,
        cancha_nombre:
          cancha?.nombre ||
          `Cancha ${canchaSeleccionada}`,
        porcentaje_pago: pago
      })

      setModalReserva(false)

      await cargarReservas()

    } catch (err) {
      console.error(err)

      alert(
        'No pudimos realizar la reserva:\n\n' +
        (err.message || 'Error desconocido.')
      )
    } finally {
      setReservando(false)
    }
  }

  function mensajeComprobante() {
    if (!reservaCreada) return ''

    return (
      `Hola, quiero enviar el comprobante de pago de mi reserva en La Quinta Padel.\n\n` +
      `Nombre: ${reservaCreada.cliente_nombre}\n` +
      `Fecha: ${reservaCreada.fecha}\n` +
      `Día: ${obtenerNombreDia(reservaCreada.fecha)}\n` +
      `Horario: ${String(reservaCreada.hora_inicio).slice(0, 5)} - ${String(reservaCreada.hora_fin).slice(0, 5)}\n` +
      `Cancha: ${reservaCreada.cancha_nombre}\n` +
      `Pago elegido: ${reservaCreada.porcentaje_pago}%\n\n` +
      `Adjunto el comprobante de pago.`
    )
  }

  function enviarComprobante() {
    const mensaje = mensajeComprobante()

    const url =
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`

    window.open(url, '_blank')
  }

  function consultarWhatsApp() {
    const mensaje =
      'Hola, quiero hacer una consulta sobre La Quinta Padel.'

    const url =
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`

    window.open(url, '_blank')
  }

  function cambiarFecha(cantidad) {
    setFechaSeleccionada(
      sumarDias(
        fechaSeleccionada,
        cantidad
      )
    )

    setHorarioSeleccionado('')
  }

  return (
    <main className="pagina">

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #07110d;
          color: white;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        .pagina {
          min-height: 100vh;
          padding: 20px 14px 35px;

          background:
            radial-gradient(
              circle at top,
              #17432f 0,
              #07110d 48%,
              #030806 100%
            );
        }

        .contenedor {
          width: 100%;
          max-width: 900px;
          margin: auto;
        }

        .hero {
          text-align: center;
          padding: 20px 10px 25px;
        }

        .logo {
          width: 78px;
          height: 78px;
          margin: 0 auto 14px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 24px;

          background: #d7ff45;
          color: #17210c;

          font-size: 40px;
          box-shadow:
            0 15px 40px rgba(0,0,0,.35);
        }

        .hero h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 950;
        }

        .hero p {
          margin: 8px 0 0;
          color: #a8b9b1;
          font-size: 15px;
        }

        .tarjeta {
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 24px;
          padding: 18px;
          margin-bottom: 18px;
          backdrop-filter: blur(12px);
        }

        .titulo {
          margin: 0 0 14px;
          font-size: 19px;
          font-weight: 900;
        }

        .dias {
          display: grid;
          grid-template-columns:
            repeat(7, 1fr);
          gap: 7px;
        }

        .dia {
          border: 1px solid #29483a;
          background: #0b1b14;
          color: #aebeb7;
          border-radius: 12px;
          padding: 11px 5px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
          text-transform: capitalize;
        }

        .dia.activo {
          background: #d7ff45;
          border-color: #d7ff45;
          color: #17210c;
        }

        .fechaNavegacion {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .flecha {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: rgba(255,255,255,.08);
          color: white;
          font-size: 23px;
          cursor: pointer;
        }

        .fechaTexto {
          flex: 1;
          text-align: center;
        }

        .fechaTexto strong {
          display: block;
          text-transform: capitalize;
          font-size: 15px;
        }

        .fechaTexto small {
          color: #81978d;
          display: block;
          margin-top: 3px;
        }

        .canchaSelect {
          width: 100%;
          padding: 13px;
          border-radius: 13px;
          border: 1px solid #29483a;
          background: #0b1b14;
          color: white;
          outline: none;
        }

        .horarios {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 9px;
        }

        .horario {
          border: 1px solid #416151;
          background: #0b1b14;
          color: #d7ff45;
          border-radius: 13px;
          padding: 14px 5px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 950;
          transition: .15s;
        }

        .horario:hover {
          transform: translateY(-1px);
          border-color: #d7ff45;
        }

        .cargando,
        .sinHorarios {
          text-align: center;
          padding: 35px 10px;
          color: #91a69c;
        }

        .sinHorarios strong {
          display: block;
          color: white;
          margin-bottom: 7px;
        }

        .error {
          padding: 14px;
          border-radius: 14px;
          background: #421d22;
          border: 1px solid #74343c;
          color: #ffb6bd;
          margin-bottom: 15px;
        }

        .modalFondo {
          position: fixed;
          inset: 0;
          z-index: 100;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 15px;

          background: rgba(0,0,0,.72);
        }

        .modal {
          width: 100%;
          max-width: 470px;
          max-height: 92vh;
          overflow-y: auto;

          background: #0b1b14;
          border: 1px solid #416151;
          border-radius: 24px;
          padding: 20px;
        }

        .modalCabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .modalCabecera h2 {
          margin: 0;
          font-size: 21px;
        }

        .cerrar {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 11px;
          background: rgba(255,255,255,.08);
          color: white;
          cursor: pointer;
          font-size: 20px;
        }

        .resumen {
          padding: 14px;
          border-radius: 15px;
          background: rgba(255,255,255,.05);
          margin-bottom: 15px;
        }

        .resumen strong {
          display: block;
          color: #d7ff45;
          font-size: 21px;
          margin-bottom: 5px;
        }

        .campo {
          margin-bottom: 13px;
        }

        .campo label {
          display: block;
          margin-bottom: 6px;
          color: #a9bbb3;
          font-size: 12px;
          font-weight: 800;
        }

        .campo input {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          border: 1px solid #29483a;
          background: #07110d;
          color: white;
          outline: none;
        }

        .pagos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin: 15px 0;
        }

        .pago {
          border: 1px solid #385544;
          background: #07110d;
          color: #aebeb7;
          padding: 14px 8px;
          border-radius: 13px;
          cursor: pointer;
          font-weight: 900;
        }

        .pago.activo {
          border-color: #d7ff45;
          background: rgba(215,255,69,.10);
          color: #d7ff45;
        }

        .botonPrincipal {
          width: 100%;
          border: 0;
          border-radius: 13px;
          padding: 15px;
          background: #d7ff45;
          color: #17210c;
          font-weight: 950;
          cursor: pointer;
        }

        .botonPrincipal:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .comprobante {
          text-align: center;
        }

        .check {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          margin: 0 auto 15px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #d7ff45;
          color: #17210c;
          font-size: 31px;
        }

        .comprobante h2 {
          margin: 0 0 8px;
        }

        .comprobante p {
          color: #a9bbb3;
          font-size: 13px;
          line-height: 1.5;
        }

        .datosComprobante {
          text-align: left;
          background: rgba(255,255,255,.05);
          border-radius: 15px;
          padding: 14px;
          margin: 15px 0;
        }

        .datoComprobante {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .datoComprobante:last-child {
          border-bottom: 0;
        }

        .datoComprobante span {
          color: #81978d;
          font-size: 12px;
        }

        .datoComprobante strong {
          font-size: 12px;
          text-align: right;
        }

        .botonWhatsApp {
          width: 100%;
          border: 0;
          border-radius: 13px;
          padding: 15px;
          background: #25d366;
          color: white;
          font-weight: 950;
          cursor: pointer;
          margin-top: 9px;
        }

        .aviso {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,193,7,.08);
          border: 1px solid rgba(255,193,7,.20);
          color: #ffe08a;
          font-size: 12px;
          line-height: 1.5;
          text-align: left;
        }

        .consultas {
          text-align: center;
          padding: 28px 15px;
        }

        .consultas p {
          margin: 0 0 12px;
          color: #9daf a7;
          color: #9daea7;
          font-size: 13px;
        }

        .consultaWhatsApp {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;

          border: 0;
          border-radius: 50px;
          padding: 12px 20px;

          background: #25d366;
          color: white;

          font-weight: 950;
          cursor: pointer;
        }

        .whatsappIcono {
          font-size: 21px;
        }

        @media(max-width: 650px) {
          .pagina {
            padding: 10px 10px 25px;
          }

          .hero h1 {
            font-size: 29px;
          }

          .dias {
            grid-template-columns:
              repeat(4, 1fr);
          }

          .horarios {
            grid-template-columns:
              repeat(3, 1fr);
          }
        }

        @media(max-width: 390px) {
          .horarios {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="contenedor">

        <section className="hero">
          <div className="logo">
            🎾
          </div>

          <h1>
            La Quinta Padel
          </h1>

          <p>
            Días y horarios disponibles
          </p>
        </section>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <section className="tarjeta">

          <h2 className="titulo">
            📅 Elegí el día
          </h2>

          <div className="dias">
            {DIAS.map((dia, index) => {
              const numeroDia = index + 1

              let diferencia =
                numeroDia -
                obtenerDiaSemana(
                  fechaSeleccionada
                )

              if (diferencia < 0) {
                diferencia += 7
              }

              const fechaDia =
                sumarDias(
                  fechaSeleccionada,
                  diferencia
                )

              return (
                <button
                  key={dia}
                  className={
                    obtenerNombreDia(
                      fechaSeleccionada
                    ) === dia
                      ? 'dia activo'
                      : 'dia'
                  }
                  onClick={() =>
                    setFechaSeleccionada(
                      fechaDia
                    )
                  }
                >
                  {dia}
                </button>
              )
            })}
          </div>

        </section>

        <section className="tarjeta">

          <div className="fechaNavegacion">

            <button
              className="flecha"
              onClick={() =>
                cambiarFecha(-1)
              }
            >
              ‹
            </button>

            <div className="fechaTexto">

              <strong>
                {formatearFecha(
                  fechaSeleccionada
                )}
              </strong>

              <small>
                {fechaSeleccionada}
              </small>

            </div>

            <button
              className="flecha"
              onClick={() =>
                cambiarFecha(1)
              }
            >
              ›
            </button>

          </div>

          <h2 className="titulo">
            🎾 Elegí la cancha
          </h2>

          <select
            className="canchaSelect"
            value={canchaSeleccionada}
            onChange={(e) =>
              setCanchaSeleccionada(
                e.target.value
              )
            }
          >
            {canchas.length === 0 ? (
              <option value="">
                Cargando canchas...
              </option>
            ) : (
              canchas.map((cancha) => (
                <option
                  key={cancha.id}
                  value={cancha.id}
                >
                  {cancha.nombre ||
                    `Cancha ${cancha.id}`}
                </option>
              ))
            )}
          </select>

        </section>

        <section className="tarjeta">

          <h2 className="titulo">
            🕐 Horarios disponibles
          </h2>

          {cargando ? (

            <div className="cargando">
              Buscando horarios disponibles...
            </div>

          ) : horariosDisponibles.length === 0 ? (

            <div className="sinHorarios">

              <strong>
                No hay horarios disponibles
              </strong>

              <span>
                Probá con otro día o cancha.
              </span>

            </div>

          ) : (

            <div className="horarios">

              {horariosDisponibles.map(
                (horario) => (

                  <button
                    key={horario}
                    className="horario"
                    onClick={() =>
                      seleccionarHorario(
                        horario
                      )
                    }
                  >
                    {horario}
                  </button>

                )
              )}

            </div>

          )}

        </section>

        <section className="tarjeta consultas">

          <p>
            ¿Tenés alguna consulta?
          </p>

          <button
            className="consultaWhatsApp"
            onClick={consultarWhatsApp}
          >
            <span className="whatsappIcono">
              💬
            </span>

            Consultanos por WhatsApp
          </button>

        </section>

      </div>

      {modalReserva && (

        <div
          className="modalFondo"
          onClick={cerrarModal}
        >

          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modalCabecera">

              <h2>
                Reservar turno
              </h2>

              <button
                className="cerrar"
                onClick={cerrarModal}
                disabled={reservando}
              >
                ×
              </button>

            </div>

            <div className="resumen">

              <strong>
                {horarioSeleccionado}
              </strong>

              <div>
                {formatearFecha(
                  fechaSeleccionada
                )}
              </div>

              <div>
                {canchas.find(
                  (c) =>
                    Number(c.id) ===
                    Number(canchaSeleccionada)
                )?.nombre ||
                  `Cancha ${canchaSeleccionada}`}
              </div>

            </div>

            <form onSubmit={crearReserva}>

              <div className="campo">

                <label>
                  Nombre
                </label>

                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) =>
                    setNombre(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="campo">

                <label>
                  WhatsApp / teléfono
                </label>

                <input
                  type="tel"
                  placeholder="Ej: 1122408566"
                  value={telefono}
                  onChange={(e) =>
                    setTelefono(
                      e.target.value
                    )
                  }
                />

              </div>

              <h3 className="titulo">
                💰 Elegí el pago
              </h3>

              <div className="pagos">

                <button
                  type="button"
                  className={
                    pago === '50'
                      ? 'pago activo'
                      : 'pago'
                  }
                  onClick={() =>
                    setPago('50')
                  }
                >
                  50%
                </button>

                <button
                  type="button"
                  className={
                    pago === '100'
                      ? 'pago activo'
                      : 'pago'
                  }
                  onClick={() =>
                    setPago('100')
                  }
                >
                  100%
                </button>

              </div>

              <div className="aviso">
                La reserva quedará pendiente
                hasta que verifiquemos el pago.
                Después de reservar podrás enviar
                el comprobante por WhatsApp.
              </div>

              <br />

              <button
                className="botonPrincipal"
                type="submit"
                disabled={reservando}
              >
                {reservando
                  ? 'Reservando...'
                  : 'Confirmar reserva'}
              </button>

            </form>

          </div>

        </div>

      )}

      {reservaCreada && (

        <div className="modalFondo">

          <div className="modal comprobante">

            <div className="check">
              ✓
            </div>

            <h2>
              ¡Reserva recibida!
            </h2>

            <p>
              Tu turno quedó pendiente de
              confirmación mientras verificamos
              el pago.
            </p>

            <div className="datosComprobante">

              <div className="datoComprobante">
                <span>
                  Nombre
                </span>

                <strong>
                  {reservaCreada.cliente_nombre}
                </strong>
              </div>

              <div className="datoComprobante">
                <span>
                  Fecha
                </span>

                <strong>
                  {formatearFecha(
                    reservaCreada.fecha
                  )}
                </strong>
              </div>

              <div className="datoComprobante">
                <span>
                  Horario
                </span>

                <strong>
                  {String(
                    reservaCreada.hora_inicio
                  ).slice(0, 5)}
                  {' - '}
                  {String(
                    reservaCreada.hora_fin
                  ).slice(0, 5)}
                </strong>
              </div>

              <div className="datoComprobante">
                <span>
                  Cancha
                </span>

                <strong>
                  {reservaCreada.cancha_nombre}
                </strong>
              </div>

              <div className="datoComprobante">
                <span>
                  Pago
                </span>

                <strong>
                  {reservaCreada.porcentaje_pago}%
                </strong>
              </div>

              <div className="datoComprobante">
                <span>
                  Total
                </span>

                <strong>
                  {dinero(
                    reservaCreada.precio_total
                  )}
                </strong>
              </div>

              <div className="datoComprobante">
                <span>
                  Pagado
                </span>

                <strong>
                  {dinero(
                    reservaCreada.monto_pagado
                  )}
                </strong>
              </div>

              <div className="datoComprobante">
                <span>
                  Saldo
                </span>

                <strong>
                  {dinero(
                    reservaCreada.saldo_pendiente
                  )}
                </strong>
              </div>

            </div>

            <div className="aviso">
              📲 Tocá el botón de abajo para
              enviar el comprobante de pago por
              WhatsApp a La Quinta Padel.
            </div>

            <button
              className="botonWhatsApp"
              onClick={enviarComprobante}
            >
              💬 Enviar comprobante por WhatsApp
            </button>

            <button
              className="botonPrincipal"
              style={{
                marginTop: '9px'
              }}
              onClick={() => {
                setReservaCreada(null)
                setHorarioSeleccionado('')
                setNombre('')
                setTelefono('')
                setPago('50')
              }}
            >
              Volver a la página
            </button>

          </div>

        </div>

      )}

    </main>
  )
                    }
