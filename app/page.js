'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const WHATSAPP = '5491122408566'

const DIAS = [
  { nombre: 'Lunes', numero: 1 },
  { nombre: 'Martes', numero: 2 },
  { nombre: 'Miércoles', numero: 3 },
  { nombre: 'Jueves', numero: 4 },
  { nombre: 'Viernes', numero: 5 },
  { nombre: 'Sábado', numero: 6 },
  { nombre: 'Domingo', numero: 0 }
]

const DURACIONES = [
  { valor: 1, texto: '1 hora' },
  { valor: 1.5, texto: '1 hora y media' },
  { valor: 2, texto: '2 horas' },
  { valor: 2.5, texto: '2 horas y media' },
  { valor: 3, texto: '3 horas' }
]

function fechaLocalHoy() {
  const ahora = new Date()

  return `${ahora.getFullYear()}-${String(
    ahora.getMonth() + 1
  ).padStart(2, '0')}-${String(
    ahora.getDate()
  ).padStart(2, '0')}`
}

function generarHorarios() {
  const horarios = []

  for (let minutos = 7 * 60; minutos <= 24 * 60 - 30; minutos += 30) {
    const horas = Math.floor(minutos / 60) % 24
    const mins = minutos % 60

    horarios.push(
      `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    )
  }

  return horarios
}

const HORARIOS = generarHorarios()

function horaAMinutos(hora) {
  if (!hora) return 0

  const partes = String(hora).slice(0, 5).split(':')

  return Number(partes[0]) * 60 + Number(partes[1])
}

function minutosAHora(minutos) {
  const normalizado = minutos % (24 * 60)

  const horas = Math.floor(normalizado / 60)
  const mins = normalizado % 60

  return `${String(horas).padStart(2, '0')}:${String(
    mins
  ).padStart(2, '0')}`
}

function calcularHoraFin(horaInicio, duracion) {
  return minutosAHora(
    horaAMinutos(horaInicio) +
      Number(duracion) * 60
  )
}

function dinero(valor) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Number(valor || 0))
}

function formatearFecha(fecha) {
  if (!fecha) return ''

  const [year, month, day] = fecha.split('-')

  const objeto = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  )

  return objeto.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function Home() {

  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])

  const [cargando, setCargando] = useState(true)
  const [cargandoReservas, setCargandoReservas] = useState(false)

  const [error, setError] = useState('')

  const [fecha, setFecha] = useState(fechaLocalHoy())

  const [canchaId, setCanchaId] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [duracion, setDuracion] = useState(1)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const [formaPago, setFormaPago] = useState('50')

  const [enviando, setEnviando] = useState(false)

  const [comprobante, setComprobante] = useState(null)

  function nombreCancha(id) {

    const index = canchas.findIndex(
      c => String(c.id) === String(id)
    )

    return index >= 0 ? `Cancha ${index + 1}` : 'Cancha'
  }

  useEffect(() => {
    cargarCanchas()
  }, [])

  async function cargarCanchas() {

    setCargando(true)
    setError('')

    try {

      const { data, error } = await supabase
        .from('canchas')
        .select('*')
        .order('id')

      if (error) {
        throw error
      }

      setCanchas(data || [])

      if (data && data.length > 0) {
        setCanchaId(String(data[0].id))
      }

    } catch (err) {

      console.error(err)

      setError(
        'No pudimos cargar las canchas. ' +
        err.message
      )

    } finally {

      setCargando(false)

    }
  }

  useEffect(() => {

    if (!fecha) return

    cargarReservasDelDia()

  }, [fecha])

  async function cargarReservasDelDia() {

    setCargandoReservas(true)

    try {

      const { data, error } = await supabase
        .from('reservas')
        .select(
          'id, cancha_id, fecha, hora_inicio, hora_fin, estado'
        )
        .eq('fecha', fecha)
        .eq('estado', 'confirmada')

      if (error) {
        throw error
      }

      setReservas(data || [])

    } catch (err) {

      console.error(err)

      setReservas([])

    } finally {

      setCargandoReservas(false)

    }
  }

  const canchaSeleccionada = useMemo(() => {

    return canchas.find(
      cancha =>
        String(cancha.id) === String(canchaId)
    )

  }, [canchas, canchaId])

  function obtenerPrecioHora() {

    if (!canchaSeleccionada) {
      return 0
    }

    return Number(
      canchaSeleccionada.precio_hora ??
      canchaSeleccionada.precio ??
      canchaSeleccionada.valor_hora ??
      0
    )
  }

  const precioHora = obtenerPrecioHora()

  const precioTotal =
    precioHora * Number(duracion)

  const montoPago =
    precioTotal *
    (formaPago === '50' ? 0.5 : 1)

  const saldoPendiente =
    precioTotal - montoPago

  function horarioDisponible(hora) {

    if (!canchaId) {
      return false
    }

    const inicioNuevo =
      horaAMinutos(hora)

    const finNuevo =
      inicioNuevo +
      Number(duracion) * 60

    if (finNuevo > 25 * 60) {
      return false
    }

    return !reservas.some(reserva => {

      if (
        String(reserva.cancha_id) !==
        String(canchaId)
      ) {
        return false
      }

      const inicioExistente =
        horaAMinutos(
          reserva.hora_inicio
        )

      let finExistente =
        horaAMinutos(
          reserva.hora_fin
        )

      if (
        finExistente <
        inicioExistente
      ) {
        finExistente += 24 * 60
      }

      let inicioComparar =
        inicioNuevo

      let finComparar =
        finNuevo

      if (
        finComparar <
        inicioComparar
      ) {
        finComparar += 24 * 60
      }

      return (
        inicioComparar < finExistente &&
        finComparar > inicioExistente
      )

    })
  }

  const horariosDisponibles = useMemo(() => {

    return HORARIOS.filter(
      hora =>
        horarioDisponible(hora)
    )

  }, [
    reservas,
    canchaId,
    duracion
  ])

  function cambiarCancha(id) {

    setCanchaId(String(id))
    setHoraInicio('')

  }

  function cambiarDuracion(valor) {

    setDuracion(Number(valor))
    setHoraInicio('')

  }

  function cambiarFecha(valor) {

    setFecha(valor)
    setHoraInicio('')

  }

  async function reservar() {

    setError('')

    if (!fecha) {

      setError(
        'Seleccioná una fecha.'
      )

      return
    }

    if (!canchaId) {

      setError(
        'Seleccioná una cancha.'
      )

      return
    }

    if (!horaInicio) {

      setError(
        'Seleccioná un horario.'
      )

      return
    }

    if (!nombre.trim()) {

      setError(
        'Ingresá tu nombre.'
      )

      return
    }

    if (!telefono.trim()) {

      setError(
        'Ingresá tu número de teléfono.'
      )

      return
    }

    if (!horarioDisponible(horaInicio)) {

      setError(
        'Ese horario ya no está disponible. ' +
        'Elegí otro horario.'
      )

      await cargarReservasDelDia()

      return
    }

    const horaFin =
      calcularHoraFin(
        horaInicio,
        duracion
      )

    const confirmar =
      window.confirm(
        'IMPORTANTE:\n\n' +
        'La solicitud quedará PENDIENTE DE PAGO.\n\n' +
        'La cancha NO queda reservada todavía. ' +
        'La reserva solamente será confirmada cuando ' +
        'el administrador reciba y verifique el comprobante de pago.\n\n' +
        '¿Querés enviar la solicitud?'
      )

    if (!confirmar) {
      return
    }

    setEnviando(true)

    try {

      const { data, error } =
        await supabase
          .from('reservas')
          .insert([
            {
              cancha_id: Number(canchaId),
              fecha: fecha,
              hora_inicio: horaInicio,
              hora_fin: horaFin,

              cliente_nombre:
                nombre.trim(),

              cliente_telefono:
                telefono.trim(),

              precio_total:
                precioTotal,

              monto_pagado:
                montoPago,

              saldo_pendiente:
                saldoPendiente,

              estado:
                'pendiente_pago'
            }
          ])
          .select()
          .single()

      if (error) {
        throw error
      }

      setComprobante({
        id: data.id,
        fecha,
        horaInicio,
        horaFin,
        duracion,
        cancha:
          nombreCancha(canchaId),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        precioTotal,
        montoPago,
        saldoPendiente,
        formaPago
      })

      setNombre('')
      setTelefono('')
      setHoraInicio('')

      await cargarReservasDelDia()

    } catch (err) {

      console.error(err)

      setError(
        'No pudimos realizar la reserva: ' +
        err.message
      )

    } finally {

      setEnviando(false)

    }
  }

  function enviarComprobanteWhatsApp() {

    if (!comprobante) {
      return
    }

    const mensaje =
      `Hola Quinta Padel 👋\n\n` +
      `Quiero enviar el comprobante de pago ` +
      `de mi solicitud de reserva.\n\n` +
      `📋 Solicitud: #${comprobante.id}\n` +
      `👤 Cliente: ${comprobante.nombre}\n` +
      `🎾 Cancha: ${comprobante.cancha}\n` +
      `📅 Fecha: ${formatearFecha(comprobante.fecha)}\n` +
      `🕐 Horario: ${comprobante.horaInicio} a ${comprobante.horaFin}\n` +
      `⏱️ Duración: ${comprobante.duracion} hora(s)\n` +
      `💰 Total: ${dinero(comprobante.precioTotal)}\n` +
      `💵 Pago realizado: ${dinero(comprobante.montoPago)}\n\n` +
      `La solicitud queda pendiente hasta que se verifique el comprobante.`

    const url =
      `https://wa.me/${WHATSAPP}` +
      `?text=${encodeURIComponent(mensaje)}`

    window.open(
      url,
      '_blank'
    )
  }

  function consultasWhatsApp() {

    const mensaje =
      'Hola Quinta Padel 👋, quiero hacer una consulta.'

    const url =
      `https://wa.me/${WHATSAPP}` +
      `?text=${encodeURIComponent(mensaje)}`

    window.open(
      url,
      '_blank'
    )
  }

  function cerrarComprobante() {

    setComprobante(null)

  }

  return (

    <main className="pagina">

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #07110d;
          color: white;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .pagina {
          min-height: 100vh;

          background:
            radial-gradient(
              circle at top,
              #16402e 0%,
              #07110d 48%,
              #030806 100%
            );

          padding: 18px 12px 100px;
        }

        .contenedor {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .encabezado {
          text-align: center;
          padding: 25px 10px 20px;
        }

        .logo {
          width: 90px;
          height: 90px;
          margin: 0 auto 14px;

          border-radius: 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              135deg,
              #d7ff45,
              #8fc52a
            );

          color: #13200c;

          font-size: 43px;

          box-shadow:
            0 12px 35px
            rgba(0,0,0,.35);
        }

        .logoImg {
          width: 90px;
          height: 90px;
          margin: 0 auto 14px;

          border-radius: 24px;

          object-fit: cover;

          box-shadow:
            0 12px 35px
            rgba(0,0,0,.35);

          display: block;
        }

        .encabezado h1 {
          margin: 0;

          font-size: 34px;
          font-weight: 1000;

          letter-spacing: -.8px;
        }

        .encabezado p {
          margin: 8px 0 0;

          color: #9eb3a8;

          font-size: 14px;
        }

        .subtitulo {
          display: inline-block;

          margin-top: 13px;

          padding: 7px 12px;

          border-radius: 20px;

          background:
            rgba(215,255,69,.1);

          border:
            1px solid
            rgba(215,255,69,.2);

          color: #d7ff45;

          font-size: 12px;
          font-weight: 900;
        }

        .tarjeta {
          background:
            rgba(255,255,255,.055);

          border:
            1px solid
            rgba(255,255,255,.1);

          border-radius: 23px;

          padding: 19px;

          margin-bottom: 16px;

          backdrop-filter:
            blur(12px);
        }

        .titulo {
          margin: 0 0 15px;

          font-size: 19px;
          font-weight: 900;
        }

        .descripcion {
          margin:
            -7px 0 16px;

          color: #8fa59a;

          font-size: 13px;
          line-height: 1.5;
        }

        .dias {
          display: grid;

          grid-template-columns:
            repeat(7, 1fr);

          gap: 6px;
        }

        .dia {
          border: 1px solid #29483a;

          background: #0b1b14;

          color: #a8bab2;

          border-radius: 11px;

          padding: 11px 4px;

          cursor: pointer;

          font-size: 11px;
          font-weight: 900;
        }

        .dia.activo {
          background: #d7ff45;
          border-color: #d7ff45;

          color: #17210c;
        }

        .campo {
          margin-bottom: 16px;
        }

        .campo:last-child {
          margin-bottom: 0;
        }

        .campo label {
          display: block;

          margin-bottom: 7px;

          color: #a8bbb2;

          font-size: 12px;
          font-weight: 900;
        }

        .input,
        .select {
          width: 100%;

          padding: 13px 14px;

          border:
            1px solid #29483a;

          border-radius: 13px;

          background: #0a1b14;

          color: white;

          outline: none;
        }

        .input:focus,
        .select:focus {
          border-color: #d7ff45;
        }

        .duraciones {
          display: grid;

          grid-template-columns:
            repeat(5, 1fr);

          gap: 7px;
        }

        .duracion {
          padding: 12px 5px;

          border:
            1px solid #29483a;

          border-radius: 12px;

          background: #0b1b14;

          color: #a8bbb2;

          cursor: pointer;

          font-size: 11px;
          font-weight: 900;
        }

        .duracion.activo {
          background: #d7ff45;

          border-color: #d7ff45;

          color: #17210c;
        }

        .horarios {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 8px;
        }

        .horario {
          padding: 13px 5px;

          border:
            1px solid #365b4a;

          border-radius: 12px;

          background: #0b1b14;

          color: white;

          cursor: pointer;

          font-size: 13px;
          font-weight: 900;
        }

        .horario:hover {
          border-color: #d7ff45;
        }

        .horario.activo {
          background: #d7ff45;

          border-color: #d7ff45;

          color: #17210c;
        }

        .sinHorarios {
          padding: 25px 15px;

          text-align: center;

          border-radius: 15px;

          background:
            rgba(255,193,7,.07);

          border:
            1px solid
            rgba(255,193,7,.18);

          color: #e7c978;

          font-size: 13px;

          line-height: 1.5;
        }

        .pagos {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 10px;
        }

        .pago {
          padding: 16px;

          border:
            1px solid #29483a;

          border-radius: 15px;

          background: #0b1b14;

          color: white;

          cursor: pointer;

          text-align: left;
        }

        .pago.activo {
          border-color: #d7ff45;

          background:
            rgba(215,255,69,.08);
        }

        .pago strong {
          display: block;

          font-size: 15px;

          margin-bottom: 5px;
        }

        .pago span {
          color: #91a69c;

          font-size: 11px;
        }

        .resumen {
          padding: 16px;

          border-radius: 17px;

          background:
            rgba(215,255,69,.06);

          border:
            1px solid
            rgba(215,255,69,.18);

          margin-top: 15px;
        }

        .resumenFila {
          display: flex;

          justify-content:
            space-between;

          gap: 10px;

          padding: 7px 0;

          border-bottom:
            1px solid
            rgba(255,255,255,.06);

          font-size: 13px;
        }

        .resumenFila:last-child {
          border-bottom: 0;
        }

        .resumenFila span {
          color: #91a69c;
        }

        .resumenFila strong {
          text-align: right;
        }

        .total {
          font-size: 18px;
          color: #d7ff45;
        }

        .botonReservar {
          width: 100%;

          margin-top: 17px;

          padding: 16px;

          border: 0;

          border-radius: 15px;

          background: #d7ff45;

          color: #17210c;

          font-size: 16px;

          font-weight: 1000;

          cursor: pointer;

          box-shadow:
            0 8px 22px
            rgba(0,0,0,.2);
        }

        .botonReservar:disabled {
          opacity: .5;

          cursor: not-allowed;
        }

        .aviso {
          margin-top: 14px;

          padding: 14px;

          border-radius: 14px;

          background:
            rgba(255,193,7,.08);

          border:
            1px solid
            rgba(255,193,7,.22);

          color: #ffe08a;

          font-size: 12px;

          line-height: 1.55;

          text-align: center;
        }

        .aviso strong {
          display: block;

          margin-bottom: 5px;

          font-size: 13px;
        }

        .error {
          padding: 14px;

          margin-bottom: 15px;

          border-radius: 14px;

          background: #421d22;

          border:
            1px solid #74343c;

          color: #ffb6bd;

          font-size: 13px;

          line-height: 1.5;
        }

        .botonWhatsApp {
          position: fixed;

          right: 18px;
          bottom: 18px;

          width: 58px;
          height: 58px;

          border-radius: 50%;

          border: 0;

          background: #25d366;

          color: white;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 29px;

          cursor: pointer;

          box-shadow:
            0 8px 25px
            rgba(0,0,0,.4);

          z-index: 20;
        }

        .fondoModal {
          position: fixed;

          inset: 0;

          background:
            rgba(0,0,0,.75);

          display: flex;

          align-items: center;
          justify-content: center;

          padding: 15px;

          z-index: 100;
        }

        .modal {
          width: 100%;

          max-width: 480px;

          max-height: 90vh;

          overflow-y: auto;

          background: #0b1b14;

          border:
            1px solid #365b4a;

          border-radius: 23px;

          padding: 20px;

          box-shadow:
            0 25px 70px
            rgba(0,0,0,.5);
        }

        .modalIcono {
          width: 65px;
          height: 65px;

          margin: 0 auto 12px;

          border-radius: 50%;

          display: flex;

          align-items: center;
          justify-content: center;

          background:
            rgba(255,193,7,.12);

          border:
            1px solid
            rgba(255,193,7,.25);

          font-size: 30px;
        }

        .modal h2 {
          margin: 0;

          text-align: center;

          font-size: 22px;
        }

        .modalTexto {
          margin: 10px 0 17px;

          color: #a8bbb2;

          text-align: center;

          font-size: 13px;

          line-height: 1.55;
        }

        .comprobante {
          padding: 15px;

          border-radius: 16px;

          background: #07110d;

          border:
            1px solid #29483a;
        }

        .botonComprobante {
          width: 100%;

          padding: 14px;

          margin-top: 12px;

          border: 0;

          border-radius: 13px;

          font-weight: 1000;

          cursor: pointer;
        }

        .enviar {
          background: #25d366;
          color: white;
        }

        .cerrar {
          background: #1b3026;
          color: #c0d0c9;
        }

        @media(max-width: 650px) {

          .encabezado h1 {
            font-size: 29px;
          }

          .dias {
            grid-template-columns:
              repeat(4, 1fr);
          }

          .duraciones {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .horarios {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .pagos {
            grid-template-columns:
              1fr;
          }

        }

        @media(max-width: 400px) {

          .horarios {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .tarjeta {
            padding: 15px;
          }

        }

      `}</style>

      <div className="contenedor">

        <header className="encabezado">

          <img
            src="/logo.png"
            alt="Logo"
            className="logoImg"
          />

          <h1>
            La Quinta Padel
          </h1>

          <p>
            Reservá tu cancha de manera rápida y sencilla
          </p>

          <span className="subtitulo">
            Días y horarios disponibles
          </span>

        </header>

        {error && (

          <div className="error">
            {error}
          </div>

        )}

        {cargando ? (

          <section className="tarjeta">

            <div
              style={{
                textAlign: 'center',
                padding: '35px',
                color: '#91a69c'
              }}
            >
              Cargando canchas...
            </div>

          </section>

        ) : (

          <>

            <section className="tarjeta">

              <h2 className="titulo">
                📅 Día, cancha y duración
              </h2>

              <div className="dias">

                {DIAS.map(dia => {

                  const objeto = new Date(
                    `${fecha}T12:00:00`
                  )

                  const seleccionado =
                    objeto.getDay() === dia.numero

                  return (

                    <button
                      key={dia.numero}
                      className={
                        `dia ${
                          seleccionado
                            ? 'activo'
                            : ''
                        }`
                      }
                      onClick={() => {

                        const diferencia =
                          dia.numero -
                          objeto.getDay()

                        const nueva =
                          new Date(objeto)

                        nueva.setDate(
                          nueva.getDate() +
                          diferencia
                        )

                        const nuevaFecha =
                          `${nueva.getFullYear()}-${String(
                            nueva.getMonth() + 1
                          ).padStart(2, '0')}-${String(
                            nueva.getDate()
                          ).padStart(2, '0')}`

                        cambiarFecha(
                          nuevaFecha
                        )

                      }}
                    >
                      {dia.nombre}
                    </button>

                  )

                })}

              </div>

              <div
                style={{
                  marginTop: '12px',
                  marginBottom: '18px'
                }}
              >

                <input
                  className="input"
                  type="date"
                  value={fecha}
                  min={fechaLocalHoy()}
                  onChange={e =>
                    cambiarFecha(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="campo">

                <label>
                  Cancha
                </label>

                <select
                  className="select"
                  value={canchaId}
                  onChange={e =>
                    cambiarCancha(
                      e.target.value
                    )
                  }
                >

                  {canchas.map(cancha => (

                    <option
                      key={cancha.id}
                      value={cancha.id}
                    >
                      {nombreCancha(cancha.id)}
                    </option>

                  ))}

                </select>

              </div>

              <div className="campo">

                <label>
                  Duración (mínimo 1 hora)
                </label>

                <div className="duraciones">

                  {DURACIONES.map(opcion => (

                    <button
                      key={opcion.valor}
                      className={
                        `duracion ${
                          Number(duracion) ===
                          Number(opcion.valor)
                            ? 'activo'
                            : ''
                        }`
                      }
                      onClick={() =>
                        cambiarDuracion(
                          opcion.valor
                        )
                      }
                    >
                      {opcion.texto}
                    </button>

                  ))}

                </div>

              </div>

            </section>

            <section className="tarjeta">

              <h2 className="titulo">
                🕐 Horarios disponibles
              </h2>

              <p className="descripcion">
                Mostramos únicamente los horarios
                disponibles para la duración seleccionada.
              </p>

              {cargandoReservas ? (

                <div className="sinHorarios">
                  Consultando disponibilidad...
                </div>

              ) : horariosDisponibles.length === 0 ? (

                <div className="sinHorarios">

                  😔

                  <br /><br />

                  No hay horarios disponibles
                  para esta duración y cancha.

                  <br />

                  Probá con otra duración,
                  otra cancha o otro día.

                </div>

              ) : (

                <div className="horarios">

                  {horariosDisponibles.map(hora => {

                    const inicioSeleccion =
                      horaInicio
                        ? horaAMinutos(horaInicio)
                        : null

                    const finSeleccion =
                      horaInicio
                        ? inicioSeleccion +
                          Number(duracion) * 60
                        : null

                    const dentroDeLaSeleccion =
                      horaInicio &&
                      horaAMinutos(hora) >= inicioSeleccion &&
                      horaAMinutos(hora) < finSeleccion

                    return (

                      <button
                        key={hora}
                        className={
                          `horario ${
                            dentroDeLaSeleccion
                              ? 'activo'
                              : ''
                          }`
                        }
                        onClick={() =>
                          setHoraInicio(hora)
                        }
                      >
                        {hora}
                      </button>

                    )

                  })}

                </div>

              )}

            </section>

            <section className="tarjeta">

              <h2 className="titulo">
                👤 Tus datos y pago
              </h2>

              <div className="campo">

                <label>
                  Nombre y apellido
                </label>

                <input
                  className="input"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={e =>
                    setNombre(e.target.value)
                  }
                />

              </div>

              <div className="campo">

                <label>
                  WhatsApp
                </label>

                <input
                  className="input"
                  type="tel"
                  placeholder="Ej: 1122408566"
                  value={telefono}
                  onChange={e =>
                    setTelefono(e.target.value)
                  }
                />

              </div>

              <div className="campo">

                <label>
                  Forma de pago
                </label>

              </div>

              <div className="pagos">

                <button
                  className={
                    `pago ${
                      formaPago === '50'
                        ? 'activo'
                        : ''
                    }`
                  }
                  onClick={() =>
                    setFormaPago('50')
                  }
                >

                  <strong>
                    💵 Reservar con 50%
                  </strong>

                  <span>
                    Pagás ahora {dinero(
                      precioTotal * 0.5
                    )}
                  </span>

                </button>

                <button
                  className={
                    `pago ${
                      formaPago === '100'
                        ? 'activo'
                        : ''
                    }`
                  }
                  onClick={() =>
                    setFormaPago('100')
                  }
                >

                  <strong>
                    💰 Reservar con 100%
                  </strong>

                  <span>
                    Pagás ahora {dinero(
                      precioTotal
                    )}
                  </span>

                </button>

              </div>

              <div className="resumen">

                <div className="resumenFila">

                  <span>
                    Fecha
                  </span>

                  <strong>
                    {formatearFecha(fecha)}
                  </strong>

                </div>

                <div className="resumenFila">

                  <span>
                    Cancha
                  </span>

                  <strong>
                    {canchaId
                      ? nombreCancha(canchaId)
                      : '-'}
                  </strong>

                </div>

                <div className="resumenFila">

                  <span>
                    Horario
                  </span>

                  <strong>
                    {horaInicio
                      ? `${horaInicio} - ${calcularHoraFin(
                          horaInicio,
                          duracion
                        )}`
                      : 'No seleccionado'}
                  </strong>

                </div>

                <div className="resumenFila">

                  <span>
                    Duración
                  </span>

                  <strong>
                    {duracion} hora(s)
                  </strong>

                </div>

                <div className="resumenFila">

                  <span>
                    Total
                  </span>

                  <strong className="total">
                    {dinero(precioTotal)}
                  </strong>

                </div>

                <div className="resumenFila">

                  <span>
                    Pago seleccionado
                  </span>

                  <strong>
                    {dinero(montoPago)}
                  </strong>

                </div>

                {saldoPendiente > 0 && (

                  <div className="resumenFila">

                    <span>
                      Saldo restante
                    </span>

                    <strong>
                      {dinero(
                        saldoPendiente
                      )}
                    </strong>

                  </div>

                )}

              </div>

              <div className="aviso">

                <strong>
                  ⚠️ IMPORTANTE
                </strong>

                Al enviar la solicitud,
                la cancha queda en estado
                <strong>
                  PENDIENTE
                </strong>

                La cancha **NO queda reservada
                todavía**.

                <br />

                La reserva solamente será confirmada
                cuando recibamos y verifiquemos
                el comprobante de pago.

              </div>

              <button
                className="botonReservar"
                disabled={
                  enviando ||
                  !horaInicio ||
                  !nombre.trim() ||
                  !telefono.trim()
                }
                onClick={reservar}
              >

                {enviando
                  ? 'Enviando solicitud...'
                  : '📅 Solicitar reserva'}

              </button>

            </section>

          </>

        )}

      </div>

      <button
        className="botonWhatsApp"
        onClick={consultasWhatsApp}
        aria-label="Consultas por WhatsApp"
      >
        ☎️
      </button>

      {comprobante && (

        <div className="fondoModal">

          <div className="modal">

            <div className="modalIcono">
              ⚠️
            </div>

            <h2>
              Solicitud recibida
            </h2>

            <p className="modalTexto">

              Tu solicitud quedó registrada
              como <strong>PENDIENTE</strong>.

              <br /><br />

              <strong>
                La cancha todavía NO está reservada.
              </strong>

              <br /><br />

              Enviá el comprobante de pago por
              WhatsApp. Una vez que verifiquemos
              el pago, confirmaremos tu turno.

            </p>

            <div className="comprobante">

              <div className="resumenFila">

                <span>
                  Solicitud
                </span>

                <strong>
                  #{comprobante.id}
                </strong>

              </div>

              <div className="resumenFila">

                <span>
                  Cliente
                </span>

                <strong>
                  {comprobante.nombre}
                </strong>

              </div>

              <div className="resumenFila">

                <span>
                  Cancha
                </span>

                <strong>
                  {comprobante.cancha}
                </strong>

              </div>

              <div className="resumenFila">

                <span>
                  Fecha
                </span>

                <strong>
                  {formatearFecha(
                    comprobante.fecha
                  )}
                </strong>

              </div>

              <div className="resumenFila">

                <span>
                  Horario
                </span>

                <strong>
                  {comprobante.horaInicio}
                  {' - '}
                  {comprobante.horaFin}
                </strong>

              </div>

              <div className="resumenFila">

                <span>
                  Duración
                </span>

                <strong>
                  {comprobante.duracion} hora(s)
                </strong>

              </div>

              <div className="resumenFila">

                <span>
                  Total
                </span>

                <strong>
                  {dinero(
                    comprobante.precioTotal
                  )}
                </strong>

              </div>

              <div className="resumenFila">

                <span>
                  Pago
                </span>

                <strong>
                  {dinero(
                    comprobante.montoPago
                  )}
                </strong>

              </div>

            </div>

            <button
              className="botonComprobante enviar"
              onClick={
                enviarComprobanteWhatsApp
              }
            >
              📲 Enviar comprobante por WhatsApp
            </button>

            <button
              className="botonComprobante cerrar"
              onClick={
                cerrarComprobante
              }
            >
              Cerrar
            </button>

          </div>

        </div>

      )}

    </main>
  )
}

