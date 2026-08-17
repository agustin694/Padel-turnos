'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const HORARIOS = []

// Horarios cada 30 minutos desde 07:00 hasta 00:30
for (let hora = 7; hora <= 23; hora++) {
  HORARIOS.push(`${String(hora).padStart(2, '0')}:00`)
  HORARIOS.push(`${String(hora).padStart(2, '0')}:30`)
}

HORARIOS.push('00:00')
HORARIOS.push('00:30')

const DURACIONES = [
  { minutos: 60, texto: '1 hora' },
  { minutos: 90, texto: '1 hora y media' },
  { minutos: 120, texto: '2 horas' },
  { minutos: 150, texto: '2 horas y media' },
  { minutos: 180, texto: '3 horas' }
]

const WHATSAPP = '5491122408566'

export default function Home() {

  const [canchas, setCanchas] = useState([])
  const [reservas, setReservas] = useState([])

  const [diaSeleccionado, setDiaSeleccionado] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [canchaSeleccionada, setCanchaSeleccionada] = useState('')

  const [duracion, setDuracion] = useState(60)
  const [horaSeleccionada, setHoraSeleccionada] = useState('')

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const [formaPago, setFormaPago] = useState('')

  const [cargando, setCargando] = useState(true)
  const [reservando, setReservando] = useState(false)

  const [error, setError] = useState('')
  const [exito, setExito] = useState(null)

  // =====================================================
  // FECHA LOCAL
  // =====================================================

  function fechaHoy() {

    const ahora = new Date()

    return `${ahora.getFullYear()}-${String(
      ahora.getMonth() + 1
    ).padStart(2, '0')}-${String(
      ahora.getDate()
    ).padStart(2, '0')}`
  }

  // =====================================================
  // FECHA SEGÚN DÍA ELEGIDO
  // =====================================================

  function obtenerFechaProximoDia(numeroDia) {

    const hoy = new Date()

    hoy.setHours(12, 0, 0, 0)

    const diaActual = hoy.getDay()

    let diferencia =
      (numeroDia - diaActual + 7) % 7

    const fecha = new Date(hoy)

    fecha.setDate(
      hoy.getDate() + diferencia
    )

    const year = fecha.getFullYear()

    const month = String(
      fecha.getMonth() + 1
    ).padStart(2, '0')

    const day = String(
      fecha.getDate()
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  // =====================================================
  // DÍAS
  // =====================================================

  const dias = [
    { numero: 1, nombre: 'Lunes' },
    { numero: 2, nombre: 'Martes' },
    { numero: 3, nombre: 'Miércoles' },
    { numero: 4, nombre: 'Jueves' },
    { numero: 5, nombre: 'Viernes' },
    { numero: 6, nombre: 'Sábado' },
    { numero: 0, nombre: 'Domingo' }
  ]

  // =====================================================
  // CARGAR CANCHAS
  // =====================================================

  useEffect(() => {
    cargarCanchas()
  }, [])

  async function cargarCanchas() {

    setCargando(true)
    setError('')

    const { data, error } =
      await supabase
        .from('canchas')
        .select('*')
        .order('id')

    if (error) {

      console.error(error)

      setError(
        'No pudimos cargar las canchas. ' +
        error.message
      )

      setCargando(false)

      return
    }

    setCanchas(data || [])

    if (data?.length > 0) {
      setCanchaSeleccionada(
        String(data[0].id)
      )
    }

    setCargando(false)
  }

  // =====================================================
  // CARGAR RESERVAS
  // =====================================================

  useEffect(() => {

    if (!fechaSeleccionada) {
      return
    }

    cargarReservas()

  }, [fechaSeleccionada])

  async function cargarReservas() {

    const { data, error } =
      await supabase
        .from('reservas')
        .select('*')
        .eq('fecha', fechaSeleccionada)

    if (error) {

      console.error(error)

      setError(
        'No pudimos consultar los horarios. ' +
        error.message
      )

      return
    }

    setReservas(data || [])
  }

  // =====================================================
  // CAMBIO DE DÍA
  // =====================================================

  function seleccionarDia(numero) {

    const fecha =
      obtenerFechaProximoDia(numero)

    setDiaSeleccionado(numero)
    setFechaSeleccionada(fecha)
    setHoraSeleccionada('')
    setExito(null)
    setError('')
  }

  // =====================================================
  // CONVERTIR HORA A MINUTOS
  // =====================================================

  function horaAMinutos(hora) {

    const [h, m] =
      String(hora)
        .slice(0, 5)
        .split(':')
        .map(Number)

    return h * 60 + m
  }

  // =====================================================
  // MINUTOS A HORA
  // =====================================================

  function minutosAHora(minutos) {

    const minutosDia =
      minutos % (24 * 60)

    const h =
      Math.floor(minutosDia / 60)

    const m =
      minutosDia % 60

    return `${String(h).padStart(2, '0')}:${String(
      m
    ).padStart(2, '0')}`
  }

  // =====================================================
  // DURACIÓN DE UNA RESERVA
  // =====================================================

  function obtenerFinReserva(reserva) {

    if (!reserva.hora_inicio) {
      return null
    }

    if (reserva.hora_fin) {
      return horaAMinutos(
        reserva.hora_fin
      )
    }

    return (
      horaAMinutos(
        reserva.hora_inicio
      ) + 60
    )
  }

  // =====================================================
  // VER SI DOS TURNOS SE SUPERPONEN
  // =====================================================

  function seSuperponen(
    inicio1,
    fin1,
    inicio2,
    fin2
  ) {

    return (
      inicio1 < fin2 &&
      fin1 > inicio2
    )
  }

  // =====================================================
  // HORARIOS DISPONIBLES
  // =====================================================

  const horariosDisponibles = useMemo(() => {

    if (
      !fechaSeleccionada ||
      !canchaSeleccionada
    ) {
      return []
    }

    const reservasCancha =
      reservas.filter(
        reserva =>
          Number(reserva.cancha_id) ===
          Number(canchaSeleccionada) &&
          reserva.estado !== 'cancelada'
      )

    return HORARIOS.filter(hora => {

      const inicio =
        horaAMinutos(hora)

      const fin =
        inicio + duracion

      // No permitimos pasar de la 01:00
      if (fin > 60 && inicio < 1440) {

        if (fin > 1440) {
          return false
        }
      }

      // Como el horario termina a la 01:00,
      // permitimos que 00:00 y 00:30 sean usados
      // solamente si la duración entra en el día.
      if (
        inicio >= 24 * 60
      ) {
        return false
      }

      const ocupado =
        reservasCancha.some(
          reserva => {

            const reservaInicio =
              horaAMinutos(
                reserva.hora_inicio
              )

            const reservaFin =
              obtenerFinReserva(
                reserva
              )

            if (
              reservaFin === null
            ) {
              return false
            }

            return seSuperponen(
              inicio,
              fin,
              reservaInicio,
              reservaFin
            )
          }
        )

      return !ocupado
    })

  }, [
    reservas,
    canchaSeleccionada,
    duracion,
    fechaSeleccionada
  ])

  // =====================================================
  // PRECIO
  // =====================================================

  function obtenerPrecioHora(cancha) {

    if (!cancha) {
      return 0
    }

    return Number(
      cancha.precio_hora ??
      cancha.precio ??
      cancha.valor_hora ??
      0
    )
  }

  const canchaActual =
    canchas.find(
      cancha =>
        Number(cancha.id) ===
        Number(canchaSeleccionada)
    )

  const precioHora =
    obtenerPrecioHora(canchaActual)

  const precioTotal =
    precioHora *
    (duracion / 60)

  const monto50 =
    precioTotal * 0.5

  // =====================================================
  // FORMATO DINERO
  // =====================================================

  function pesos(valor) {

    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
      }
    ).format(
      Number(valor || 0)
    )
  }

  // =====================================================
  // RESERVAR
  // =====================================================

  async function reservar() {

    setError('')
    setExito(null)

    if (!fechaSeleccionada) {

      setError(
        'Primero seleccioná un día.'
      )

      return
    }

    if (!canchaSeleccionada) {

      setError(
        'Seleccioná una cancha.'
      )

      return
    }

    if (!horaSeleccionada) {

      setError(
        'Seleccioná un horario disponible.'
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
        'Ingresá tu número de WhatsApp.'
      )

      return
    }

    if (!formaPago) {

      setError(
        'Seleccioná cómo querés reservar.'
      )

      return
    }

    // Si eligió WhatsApp no generamos reserva
    if (
      formaPago === 'whatsapp'
    ) {

      consultarWhatsApp()

      return
    }

    setReservando(true)

    try {

      // =================================================
      // VERIFICACIÓN FINAL
      // =================================================

      const { data: reservasActuales, error: errorVerificacion } =
        await supabase
          .from('reservas')
          .select('*')
          .eq('fecha', fechaSeleccionada)
          .eq(
            'cancha_id',
            Number(canchaSeleccionada)
          )

      if (errorVerificacion) {
        throw errorVerificacion
      }

      const inicio =
        horaAMinutos(
          horaSeleccionada
        )

      const fin =
        inicio + duracion

      const ocupado =
        (reservasActuales || [])
          .filter(
            reserva =>
              reserva.estado !==
              'cancelada'
          )
          .some(reserva => {

            const reservaInicio =
              horaAMinutos(
                reserva.hora_inicio
              )

            const reservaFin =
              obtenerFinReserva(
                reserva
              )

            return seSuperponen(
              inicio,
              fin,
              reservaInicio,
              reservaFin
            )
          })

      if (ocupado) {

        setError(
          'Ese horario acaba de ser reservado. Elegí otro horario.'
        )

        await cargarReservas()

        setHoraSeleccionada('')

        setReservando(false)

        return
      }

      // =================================================
      // DATOS DE PAGO
      // =================================================

      const montoPagado =
        formaPago === '50'
          ? monto50
          : precioTotal

      const saldoPendiente =
        Math.max(
          0,
          precioTotal -
          montoPagado
        )

      // =================================================
      // INSERTAR RESERVA
      // =================================================

      const datosReserva = {

        cancha_id:
          Number(canchaSeleccionada),

        cliente_nombre:
          nombre.trim(),

        cliente_telefono:
          telefono.trim(),

        fecha:
          fechaSeleccionada,

        hora_inicio:
          horaSeleccionada,

        hora_fin:
          minutosAHora(fin),

        estado:
          'pendiente_pago',

        precio_total:
          precioTotal,

        monto_pagado:
          montoPagado,

        saldo_pendiente:
          saldoPendiente
      }

      const {
        data,
        error
      } = await supabase
        .from('reservas')
        .insert(
          [datosReserva]
        )
        .select()
        .single()

      if (error) {
        throw error
      }

      // =================================================
      // MOSTRAR COMPROBANTE
      // =================================================

      setExito({
        reserva: data,
        cancha:
          canchaActual?.nombre ||
          `Cancha ${canchaSeleccionada}`,
        duracionTexto:
          DURACIONES.find(
            item =>
              item.minutos === duracion
          )?.texto || '',
        formaPago,
        montoPagado,
        saldoPendiente
      })

      // Actualizamos horarios
      await cargarReservas()

      setHoraSeleccionada('')

    } catch (err) {

      console.error(err)

      setError(
        'No pudimos realizar la reserva: ' +
        err.message
      )

    } finally {

      setReservando(false)
    }
  }

  // =====================================================
  // WHATSAPP
  // =====================================================

  function abrirWhatsApp() {

    const mensaje =
      `Hola Quinta Padel 👋\n\n` +
      `Quiero consultar por un turno.\n\n` +
      `Nombre: ${nombre || 'Sin especificar'}\n` +
      `Día: ${fechaSeleccionada || 'Sin especificar'}\n` +
      `Horario: ${horaSeleccionada || 'Sin especificar'}\n` +
      `Duración: ${
        DURACIONES.find(
          item =>
            item.minutos === duracion
        )?.texto || 'Sin especificar'
      }`

    const url =
      `https://wa.me/${WHATSAPP}` +
      `?text=${encodeURIComponent(mensaje)}`

    window.open(
      url,
      '_blank'
    )
  }

  function consultarWhatsApp() {
    abrirWhatsApp()
  }

  // =====================================================
  // ENVIAR COMPROBANTE POR WHATSAPP
  // =====================================================

  function enviarComprobanteWhatsApp() {

    if (!exito) {
      return
    }

    const r =
      exito.reserva

    const mensaje =
      `Hola Quinta Padel 👋\n\n` +
      `Les envío el comprobante de mi reserva.\n\n` +
      `👤 Cliente: ${
        r.cliente_nombre
      }\n` +
      `📅 Fecha: ${
        r.fecha
      }\n` +
      `🎾 Cancha: ${
        exito.cancha
      }\n` +
      `🕐 Horario: ${
        String(
          r.hora_inicio
        ).slice(0, 5)
      } - ${
        String(
          r.hora_fin
        ).slice(0, 5)
      }\n` +
      `⏱ Duración: ${
        exito.duracionTexto
      }\n` +
      `💰 Total: ${
        pesos(
          r.precio_total
        )
      }\n` +
      `💳 Pagado: ${
        pesos(
          exito.montoPagado
        )
      }\n` +
      `📌 Estado: Pendiente de verificación`

    const url =
      `https://wa.me/${WHATSAPP}` +
      `?text=${encodeURIComponent(mensaje)}`

    window.open(
      url,
      '_blank'
    )
  }

  // =====================================================
  // NUEVA RESERVA
  // =====================================================

  function nuevaReserva() {

    setExito(null)
    setError('')
    setHoraSeleccionada('')
    setFormaPago('')
    setNombre('')
    setTelefono('')
  }

  // =====================================================
  // PANTALLA
  // =====================================================

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
        }

        body {
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          color: white;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .pagina {
          min-height: 100vh;
          padding: 20px 14px 100px;

          background:
            radial-gradient(
              circle at top,
              #194a34 0%,
              #07110d 48%,
              #030806 100%
            );
        }

        .contenedor {
          width: 100%;
          max-width: 850px;
          margin: auto;
        }

        .logo {
          text-align: center;
          padding: 20px 0 25px;
        }

        .logoIcono {
          font-size: 48px;
          margin-bottom: 8px;
        }

        .logo h1 {
          margin: 0;
          font-size: 34px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .logo p {
          margin: 8px 0 0;
          color: #a5b9ae;
          font-size: 14px;
        }

        .tarjeta {
          background:
            rgba(255,255,255,.055);

          border:
            1px solid
            rgba(255,255,255,.10);

          border-radius: 22px;
          padding: 20px;
          margin-bottom: 16px;

          backdrop-filter:
            blur(12px);
        }

        .titulo {
          margin: 0 0 15px;
          font-size: 20px;
          font-weight: 900;
        }

        .subtitulo {
          color: #91a69b;
          font-size: 13px;
          margin-top: -8px;
          margin-bottom: 16px;
        }

        .dias {
          display: grid;
          grid-template-columns:
            repeat(7, 1fr);
          gap: 7px;
        }

        .dia {
          border: 1px solid #315442;
          background: #0b1b14;
          color: #c8d4cf;
          padding: 12px 5px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
        }

        .dia.activo {
          background: #d7ff45;
          color: #17210c;
          border-color: #d7ff45;
        }

        .fecha {
          text-align: center;
          margin-top: 13px;
          color: #8fa49a;
          font-size: 13px;
        }

        .canchas {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(130px, 1fr)
            );
          gap: 9px;
        }

        .canchaBtn {
          background: #0b1b14;
          border: 1px solid #315442;
          color: white;
          padding: 14px 10px;
          border-radius: 13px;
          cursor: pointer;
          font-weight: 900;
        }

        .canchaBtn.activo {
          background: #d7ff45;
          color: #17210c;
          border-color: #d7ff45;
        }

        .duraciones {
          display: grid;
          grid-template-columns:
            repeat(5, 1fr);
          gap: 7px;
        }

        .duracion {
          background: #0b1b14;
          border: 1px solid #315442;
          color: white;
          padding: 12px 6px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
        }

        .duracion.activo {
          background: #d7ff45;
          color: #17210c;
          border-color: #d7ff45;
        }

        .horarios {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 8px;
        }

        .hora {
          background: #0b1b14;
          border: 1px solid #315442;
          color: white;
          padding: 13px 7px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 900;
        }

        .hora.activo {
          background: #d7ff45;
          color: #17210c;
          border-color: #d7ff45;
        }

        .sinHorarios {
          text-align: center;
          padding: 25px 10px;
          color: #92a69c;
          background: rgba(255,255,255,.03);
          border-radius: 14px;
        }

        .campo {
          margin-bottom: 13px;
        }

        .campo label {
          display: block;
          margin-bottom: 7px;
          font-size: 12px;
          color: #9caf a4;
          color: #9cafa4;
          font-weight: 800;
        }

        .campo input {
          width: 100%;
          padding: 14px;
          background: #0b1b14;
          border: 1px solid #315442;
          border-radius: 12px;
          color: white;
          outline: none;
        }

        .campo input:focus {
          border-color: #d7ff45;
        }

        .pagos {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 9px;
        }

        .pago {
          text-align: left;
          background: #0b1b14;
          border: 1px solid #315442;
          color: white;
          padding: 15px;
          border-radius: 14px;
          cursor: pointer;
        }

        .pago.activo {
          border-color: #d7ff45;
          background: rgba(
            215,
            255,
            69,
            .10
          );
        }

        .pago strong {
          display: block;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .pago span {
          color: #8fa49a;
          font-size: 11px;
        }

        .resumen {
          background: rgba(
            215,
            255,
            69,
            .08
          );

          border:
            1px solid
            rgba(
              215,
              255,
              69,
              .25
            );

          border-radius: 16px;
          padding: 15px;
          margin-top: 15px;
        }

        .resumenFila {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 6px 0;
          color: #b5c4bd;
          font-size: 13px;
        }

        .resumenFila strong {
          color: white;
        }

        .resumenTotal {
          border-top: 1px solid #385343;
          margin-top: 8px;
          padding-top: 12px;
          font-size: 17px;
        }

        .botonReservar {
          width: 100%;
          margin-top: 16px;
          border: 0;
          background: #d7ff45;
          color: #17210c;
          padding: 16px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .botonReservar:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .error {
          background: #421d22;
          border: 1px solid #74343c;
          color: #ffb6bd;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 15px;
          font-size: 13px;
        }

        .comprobante {
          background: #0b1b14;
          border: 1px solid #5d805f;
          border-radius: 20px;
          padding: 20px;
          text-align: center;
        }

        .comprobanteIcono {
          font-size: 45px;
          margin-bottom: 8px;
        }

        .comprobante h2 {
          margin: 0;
          color: #d7ff45;
        }

        .comprobante p {
          color: #9caf a4;
          color: #9cafa4;
          font-size: 13px;
        }

        .comprobanteDatos {
          text-align: left;
          margin-top: 18px;
          border-top: 1px solid #315442;
          padding-top: 12px;
        }

        .comprobanteFila {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 7px 0;
          font-size: 13px;
        }

        .comprobanteFila span {
          color: #8fa49a;
        }

        .botonWhatsapp {
          width: 100%;
          border: 0;
          background: #25d366;
          color: white;
          padding: 15px;
          border-radius: 13px;
          margin-top: 17px;
          font-weight: 900;
          cursor: pointer;
        }

        .botonNueva {
          width: 100%;
          border: 1px solid #315442;
          background: #0b1b14;
          color: white;
          padding: 13px;
          border-radius: 13px;
          margin-top: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .whatsappConsulta {
          position: fixed;
          right: 18px;
          bottom: 18px;

          width: 58px;
          height: 58px;

          border-radius: 50%;
          border: 0;

          background: #25d366;
          color: white;

          font-size: 28px;

          box-shadow:
            0 8px 25px
            rgba(0,0,0,.35);

          cursor: pointer;
          z-index: 20;
        }

        .cargando {
          text-align: center;
          padding: 40px;
          color: #91a69c;
        }

        @media(max-width: 650px) {

          .pagina {
            padding:
              12px
              10px
              90px;
          }

          .logo h1 {
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
            grid-template-columns: 1fr;
          }

          .tarjeta {
            padding: 15px;
          }
        }

      `}</style>

      <div className="contenedor">

        {/* =================================================
            LOGO
        ================================================= */}

        <header className="logo">

          <div className="logoIcono">
            🎾
          </div>

          <h1>
            La Quinta Padel
          </h1>

          <p>
            Reservá tu cancha de manera rápida y sencilla
          </p>

        </header>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (

          <div className="error">
            {error}
          </div>

        )}

        {/* =================================================
            COMPROBANTE
        ================================================= */}

        {exito ? (

          <section className="tarjeta">

            <div className="comprobante">

              <div className="comprobanteIcono">
                ✅
              </div>

              <h2>
                Reserva recibida
              </h2>

              <p>
                Tu reserva quedó registrada como
                <strong> pendiente de pago/verificación</strong>.
              </p>

              <div className="comprobanteDatos">

                <div className="comprobanteFila">
                  <span>
                    Cliente
                  </span>

                  <strong>
                    {exito.reserva.cliente_nombre}
                  </strong>
                </div>

                <div className="comprobanteFila">
                  <span>
                    Fecha
                  </span>

                  <strong>
                    {exito.reserva.fecha}
                  </strong>
                </div>

                <div className="comprobanteFila">
                  <span>
                    Cancha
                  </span>

                  <strong>
                    {exito.cancha}
                  </strong>
                </div>

                <div className="comprobanteFila">
                  <span>
                    Horario
                  </span>

                  <strong>
                    {String(
                      exito.reserva.hora_inicio
                    ).slice(0, 5)}
                    {' - '}
                    {String(
                      exito.reserva.hora_fin
                    ).slice(0, 5)}
                  </strong>
                </div>

                <div className="comprobanteFila">
                  <span>
                    Duración
                  </span>

                  <strong>
                    {exito.duracionTexto}
                  </strong>
                </div>

                <div className="comprobanteFila">
                  <span>
                    Total
                  </span>

                  <strong>
                    {pesos(
                      exito.reserva.precio_total
                    )}
                  </strong>
                </div>

                <div className="comprobanteFila">
                  <span>
                    Pagado / a pagar
                  </span>

                  <strong>
                    {pesos(
                      exito.montoPagado
                    )}
                  </strong>
                </div>

                <div className="comprobanteFila">
                  <span>
                    Saldo
                  </span>

                  <strong>
                    {pesos(
                      exito.saldoPendiente
                    )}
                  </strong>
                </div>

              </div>

              <button
                className="botonWhatsapp"
                onClick={
                  enviarComprobanteWhatsApp
                }
              >
                📲 Enviar comprobante por WhatsApp
              </button>

              <button
                className="botonNueva"
                onClick={nuevaReserva}
              >
                Hacer otra reserva
              </button>

            </div>

          </section>

        ) : (

          <>

            {/* =================================================
                DÍAS
            ================================================= */}

            <section className="tarjeta">

              <h2 className="titulo">
                📅 Elegí el día
              </h2>

              <p className="subtitulo">
                Seleccioná el día en el que querés jugar.
              </p>

              <div className="dias">

                {dias.map(dia => (

                  <button
                    key={dia.numero}
                    className={
                      'dia ' +
                      (
                        diaSeleccionado ===
                        dia.numero
                          ? 'activo'
                          : ''
                      )
                    }
                    onClick={() =>
                      seleccionarDia(
                        dia.numero
                      )
                    }
                  >
                    {dia.nombre}
                  </button>

                ))}

              </div>

              {fechaSeleccionada && (

                <div className="fecha">
                  📅 {fechaSeleccionada}
                </div>

              )}

            </section>

            {/* =================================================
                CANCHA
            ================================================= */}

            <section className="tarjeta">

              <h2 className="titulo">
                🎾 Elegí la cancha
              </h2>

              {cargando ? (

                <div className="cargando">
                  Cargando canchas...
                </div>

              ) : (

                <div className="canchas">

                  {canchas.map(cancha => (

                    <button
                      key={cancha.id}
                      className={
                        'canchaBtn ' +
                        (
                          Number(
                            canchaSeleccionada
                          ) ===
                          Number(cancha.id)
                            ? 'activo'
                            : ''
                        )
                      }
                      onClick={() => {

                        setCanchaSeleccionada(
                          String(
                            cancha.id
                          )
                        )

                        setHoraSeleccionada('')
                      }}
                    >
                      🎾{' '}
                      {cancha.nombre ||
                        `Cancha ${cancha.id}`}
                    </button>

                  ))}

                </div>

              )}

            </section>

            {/* =================================================
                DURACIÓN
            ================================================= */}

            <section className="tarjeta">

              <h2 className="titulo">
                ⏱ ¿Cuántas horas querés reservar?
              </h2>

              <div className="duraciones">

                {DURACIONES.map(item => (

                  <button
                    key={item.minutos}
                    className={
                      'duracion ' +
                      (
                        duracion ===
                        item.minutos
                          ? 'activo'
                          : ''
                      )
                    }
                    onClick={() => {

                      setDuracion(
                        item.minutos
                      )

                      setHoraSeleccionada('')
                    }}
                  >
                    {item.texto}
                  </button>

                ))}

              </div>

            </section>

            {/* =================================================
                HORARIOS
            ================================================= */}

            <section className="tarjeta">

              <h2 className="titulo">
                🕐 Horarios disponibles
              </h2>

              <p className="subtitulo">
                Solo mostramos horarios donde entra
                toda la duración seleccionada.
              </p>

              {!fechaSeleccionada ? (

                <div className="sinHorarios">
                  Primero elegí un día.
                </div>

              ) : horariosDisponibles.length === 0 ? (

                <div className="sinHorarios">
                  😕 No hay horarios disponibles
                  para esa duración.
                </div>

              ) : (

                <div className="horarios">

                  {horariosDisponibles.map(
                    hora => (

                      <button
                        key={hora}
                        className={
                          'hora ' +
                          (
                            horaSeleccionada ===
                            hora
                              ? 'activo'
                              : ''
                          )
                        }
                        onClick={() =>
                          setHoraSeleccionada(
                            hora
                          )
                        }
                      >
                        {hora}
                      </button>

                    )
                  )}

                </div>

              )}

            </section>

            {/* =================================================
                DATOS CLIENTE
            ================================================= */}

            <section className="tarjeta">

              <h2 className="titulo">
                👤 Tus datos
              </h2>

              <div className="campo">

                <label>
                  Nombre
                </label>

                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={e =>
                    setNombre(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="campo">

                <label>
                  WhatsApp
                </label>

                <input
                  type="tel"
                  placeholder="Tu número de WhatsApp"
                  value={telefono}
                  onChange={e =>
                    setTelefono(
                      e.target.value
                    )
                  }
                />

              </div>

            </section>

            {/* =================================================
                PAGO
            ================================================= */}

            <section className="tarjeta">

              <h2 className="titulo">
                💳 ¿Cómo querés reservar?
              </h2>

              <div className="pagos">

                <button
                  className={
                    'pago ' +
                    (
                      formaPago === '50'
                        ? 'activo'
                        : ''
                    )
                  }
                  onClick={() =>
                    setFormaPago('50')
                  }
                >
                  <strong>
                    🟢 Reservar con 50%
                  </strong>

                  <span>
                    Pagás la mitad
                  </span>
                </button>

                <button
                  className={
                    'pago ' +
                    (
                      formaPago === '100'
                        ? 'activo'
                        : ''
                    )
                  }
                  onClick={() =>
                    setFormaPago('100')
                  }
                >
                  <strong>
                    🔵 Reservar con 100%
                  </strong>

                  <span>
                    Pagás el total
                  </span>
                </button>

                <button
                  className={
                    'pago ' +
                    (
                      formaPago ===
                      'whatsapp'
                        ? 'activo'
                        : ''
                    )
                  }
                  onClick={() =>
                    setFormaPago(
                      'whatsapp'
                    )
                  }
                >
                  <strong>
                    📲 Consultar por WhatsApp
                  </strong>

                  <span>
                    Hablá directamente con nosotros
                  </span>
                </button>

              </div>

              {formaPago !== 'whatsapp' &&
                formaPago && (

                <div className="resumen">

                  <div className="resumenFila">

                    <span>
                      Duración
                    </span>

                    <strong>
                      {
                        DURACIONES.find(
                          item =>
                            item.minutos ===
                            duracion
                        )?.texto
                      }
                    </strong>

                  </div>

                  <div className="resumenFila">

                    <span>
                      Horario
                    </span>

                    <strong>
                      {horaSeleccionada ||
                        'Sin seleccionar'}
                    </strong>

                  </div>

                  <div className="resumenFila">

                    <span>
                      Total
                    </span>

                    <strong>
                      {pesos(
                        precioTotal
                      )}
                    </strong>

                  </div>

                  <div className="resumenFila resumenTotal">

                    <span>
                      {formaPago === '50'
                        ? 'A pagar 50%'
                        : 'A pagar 100%'}
                    </span>

                    <strong>
                      {pesos(
                        formaPago === '50'
                          ? monto50
                          : precioTotal
                      )}
                    </strong>

                  </div>

                </div>

              )}

              <button
                className="botonReservar"
                disabled={
                  reservando ||
                  !diaSeleccionado ||
                  !horaSeleccionada ||
                  !formaPago
                }
                onClick={reservar}
              >

                {reservando
                  ? 'Registrando reserva...'
                  : formaPago === 'whatsapp'
                    ? '📲 Consultar por WhatsApp'
                    : '🎾 Reservar turno'
                }

              </button>

            </section>

          </>

        )}

      </div>

      {/* =====================================================
          WHATSAPP FIJO
      ===================================================== */}

      <button
        className="whatsappConsulta"
        onClick={abrirWhatsApp}
        aria-label="Consultar por WhatsApp"
      >
        ☎️
      </button>

    </main>
  )
          }
