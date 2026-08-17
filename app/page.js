'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {

  // =====================================================
  // ESTADOS
  // =====================================================

  const [canchas, setCanchas] = useState([])
  const [canchaSeleccionada, setCanchaSeleccionada] = useState(null)

  const [diaSeleccionado, setDiaSeleccionado] =
    useState(diaActual())

  const [fecha, setFecha] =
    useState(fechaParaDia(diaActual()))

  const [horarios, setHorarios] = useState([])
  const [horarioSeleccionado, setHorarioSeleccionado] =
    useState(null)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const [tipoPago, setTipoPago] =
    useState('50')

  const [cargandoCanchas, setCargandoCanchas] =
    useState(true)

  const [cargandoHorarios, setCargandoHorarios] =
    useState(false)

  const [reservando, setReservando] =
    useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [comprobante, setComprobante] =
    useState(null)


  // =====================================================
  // DÍAS
  // =====================================================

  const dias = [
    {
      nombre: 'Lunes',
      corto: 'Lun',
      numero: 1
    },
    {
      nombre: 'Martes',
      corto: 'Mar',
      numero: 2
    },
    {
      nombre: 'Miércoles',
      corto: 'Mié',
      numero: 3
    },
    {
      nombre: 'Jueves',
      corto: 'Jue',
      numero: 4
    },
    {
      nombre: 'Viernes',
      corto: 'Vie',
      numero: 5
    },
    {
      nombre: 'Sábado',
      corto: 'Sáb',
      numero: 6
    },
    {
      nombre: 'Domingo',
      corto: 'Dom',
      numero: 0
    }
  ]


  // =====================================================
  // DÍA ACTUAL
  // =====================================================

  function diaActual() {

    const ahora = new Date()

    return ahora.getDay()
  }


  // =====================================================
  // FECHA PARA UN DÍA
  // =====================================================

  function fechaParaDia(numeroDia) {

    const hoy = new Date()

    const diaHoy = hoy.getDay()

    let diferencia =
      numeroDia - diaHoy

    if (diferencia < 0) {
      diferencia += 7
    }

    const fecha = new Date(hoy)

    fecha.setDate(
      hoy.getDate() + diferencia
    )

    return `${fecha.getFullYear()}-${String(
      fecha.getMonth() + 1
    ).padStart(2, '0')}-${String(
      fecha.getDate()
    ).padStart(2, '0')}`
  }


  // =====================================================
  // CAMBIAR DÍA
  // =====================================================

  function seleccionarDia(numeroDia) {

    setDiaSeleccionado(numeroDia)

    setFecha(
      fechaParaDia(numeroDia)
    )

    setHorarioSeleccionado(null)

    setError('')
    setMensaje('')
  }


  // =====================================================
  // CARGAR CANCHAS
  // =====================================================

  useEffect(() => {
    cargarCanchas()
  }, [])


  async function cargarCanchas() {

    setCargandoCanchas(true)
    setError('')

    const { data, error } =
      await supabase
        .from('canchas')
        .select('*')
        .order('id')

    if (error) {

      console.error(error)

      setError(
        'No pudimos cargar las canchas: ' +
        error.message
      )

      setCargandoCanchas(false)

      return
    }

    setCanchas(data || [])

    if (data && data.length > 0) {

      setCanchaSeleccionada(
        data[0]
      )
    }

    setCargandoCanchas(false)
  }


  // =====================================================
  // CARGAR HORARIOS
  // =====================================================

  useEffect(() => {

    if (!canchaSeleccionada) {
      return
    }

    cargarHorarios()

  }, [
    canchaSeleccionada,
    fecha
  ])


  async function cargarHorarios() {

    setCargandoHorarios(true)
    setHorarioSeleccionado(null)
    setError('')

    try {

      // -----------------------------------------------
      // RESERVAS EXISTENTES
      // -----------------------------------------------

      const {
        data: reservas,
        error: errorReservas
      } = await supabase
        .from('reservas')
        .select(
          'id, hora_inicio, hora_fin, estado'
        )
        .eq(
          'cancha_id',
          canchaSeleccionada.id
        )
        .eq(
          'fecha',
          fecha
        )
        .neq(
          'estado',
          'cancelada'
        )

      if (errorReservas) {
        throw errorReservas
      }


      // -----------------------------------------------
      // HORARIOS
      // -----------------------------------------------

      const horariosGenerados =
        generarHorarios()


      // -----------------------------------------------
      // QUITAR OCUPADOS
      // -----------------------------------------------

      const disponibles =
        horariosGenerados.filter(
          horario => {

            const ocupado =
              (reservas || []).some(
                reserva => {

                  return horariosSeSuperponen(
                    horario.inicio,
                    horario.fin,
                    reserva.hora_inicio,
                    reserva.hora_fin
                  )
                }
              )

            return !ocupado
          }
        )


      setHorarios(
        disponibles
      )

    } catch (err) {

      console.error(err)

      setError(
        'No pudimos cargar los horarios: ' +
        (err.message || '')
      )

      setHorarios([])

    } finally {

      setCargandoHorarios(false)
    }
  }


  // =====================================================
  // GENERAR HORARIOS
  // =====================================================

  function generarHorarios() {

    const resultado = []

    /*
      HORARIO DE FUNCIONAMIENTO

      08:00 a 23:00

      Turnos de 1 hora.

      Después podemos hacer que esto
      salga directamente de la base
      de datos para cada día.
    */

    const inicio = 8 * 60
    const fin = 23 * 60
    const duracion = 60

    for (
      let minutos = inicio;
      minutos < fin;
      minutos += duracion
    ) {

      const siguiente =
        minutos + duracion

      if (siguiente > fin) {
        break
      }

      resultado.push({

        inicio:
          minutosAHora(minutos),

        fin:
          minutosAHora(siguiente)

      })
    }

    return resultado
  }


  // =====================================================
  // MINUTOS A HORA
  // =====================================================

  function minutosAHora(minutos) {

    const horas =
      Math.floor(minutos / 60)

    const minutosRestantes =
      minutos % 60

    return `${String(
      horas
    ).padStart(2, '0')}:${String(
      minutosRestantes
    ).padStart(2, '0')}:00`
  }


  // =====================================================
  // HORA A MINUTOS
  // =====================================================

  function horaAMinutos(hora) {

    const partes =
      String(hora).split(':')

    return (
      Number(partes[0]) * 60 +
      Number(partes[1])
    )
  }


  // =====================================================
  // SUPERPOSICIÓN DE HORARIOS
  // =====================================================

  function horariosSeSuperponen(
    inicio1,
    fin1,
    inicio2,
    fin2
  ) {

    const a =
      horaAMinutos(inicio1)

    const b =
      horaAMinutos(fin1)

    const c =
      horaAMinutos(inicio2)

    const d =
      horaAMinutos(fin2)

    return (
      a < d &&
      b > c
    )
  }


  // =====================================================
  // PRECIO
  // =====================================================

  function obtenerPrecio() {

    if (!canchaSeleccionada) {
      return 0
    }

    /*
      Intentamos utilizar el precio de la cancha
      si existe alguna de estas columnas.
    */

    const posibles = [
      canchaSeleccionada.precio,
      canchaSeleccionada.precio_hora,
      canchaSeleccionada.precio_por_hora,
      canchaSeleccionada.valor
    ]

    const encontrado =
      posibles.find(
        valor =>
          valor !== null &&
          valor !== undefined &&
          valor !== ''
      )

    return Number(
      encontrado || 0
    )
  }


  // =====================================================
  // FORMATO PESOS
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
  // MONTO A PAGAR
  // =====================================================

  function montoPago() {

    const total =
      obtenerPrecio()

    if (tipoPago === '100') {
      return total
    }

    return total / 2
  }


  // =====================================================
  // SALDO
  // =====================================================

  function saldoPendiente() {

    const total =
      obtenerPrecio()

    return Math.max(
      total - montoPago(),
      0
    )
  }


  // =====================================================
  // RESERVAR
  // =====================================================

  async function reservar() {

    setError('')
    setMensaje('')

    if (!canchaSeleccionada) {

      setError(
        'Seleccioná una cancha.'
      )

      return
    }

    if (!horarioSeleccionado) {

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
        'Ingresá tu teléfono o WhatsApp.'
      )

      return
    }


    setReservando(true)

    try {

      // -----------------------------------------------
      // VERIFICACIÓN FINAL
      // -----------------------------------------------

      const {
        data: reservasActuales,
        error: errorVerificacion
      } = await supabase
        .from('reservas')
        .select(
          'id, hora_inicio, hora_fin, estado'
        )
        .eq(
          'cancha_id',
          canchaSeleccionada.id
        )
        .eq(
          'fecha',
          fecha
        )
        .neq(
          'estado',
          'cancelada'
        )


      if (errorVerificacion) {
        throw errorVerificacion
      }


      const ocupado =
        (reservasActuales || []).some(
          reserva =>
            horariosSeSuperponen(
              horarioSeleccionado.inicio,
              horarioSeleccionado.fin,
              reserva.hora_inicio,
              reserva.hora_fin
            )
        )


      if (ocupado) {

        setError(
          'Ese horario acaba de ser reservado. ' +
          'Elegí otro horario.'
        )

        await cargarHorarios()

        return
      }


      // -----------------------------------------------
      // DATOS DE PAGO
      // -----------------------------------------------

      const total =
        obtenerPrecio()

      const pagado =
        montoPago()

      const saldo =
        saldoPendiente()


      const estadoPago =
        tipoPago === '100'
          ? 'pago_completo'
          : 'seña_50'


      // -----------------------------------------------
      // CREAR RESERVA
      // -----------------------------------------------

      const datosReserva = {

        cancha_id:
          canchaSeleccionada.id,

        fecha:
          fecha,

        hora_inicio:
          horarioSeleccionado.inicio,

        hora_fin:
          horarioSeleccionado.fin,

        cliente_nombre:
          nombre.trim(),

        cliente_telefono:
          telefono.trim(),

        precio_total:
          total,

        monto_pagado:
          pagado,

        saldo_pendiente:
          saldo,

        estado:
          'pendiente_pago',

        estado_pago:
          estadoPago
      }


      const {
        data,
        error: errorReserva
      } = await supabase
        .from('reservas')
        .insert(
          datosReserva
        )
        .select()
        .single()


      if (errorReserva) {
        throw errorReserva
      }


      // -----------------------------------------------
      // COMPROBANTE
      // -----------------------------------------------

      setComprobante({

        id:
          data?.id,

        cancha:
          canchaSeleccionada.nombre ||
          `Cancha ${canchaSeleccionada.id}`,

        fecha:
          fecha,

        horario:
          `${horarioSeleccionado.inicio.slice(0, 5)} - ` +
          `${horarioSeleccionado.fin.slice(0, 5)}`,

        nombre:
          nombre.trim(),

        telefono:
          telefono.trim(),

        total:
          total,

        pagado:
          pagado,

        saldo:
          saldo,

        tipoPago:
          tipoPago === '100'
            ? 'Pago completo'
            : 'Seña del 50%'
      })


      setMensaje(
        '¡Reserva realizada correctamente!'
      )


      setNombre('')
      setTelefono('')

      setHorarioSeleccionado(null)

      await cargarHorarios()

    } catch (err) {

      console.error(err)

      setError(
        'No pudimos realizar la reserva: ' +
        (err.message || '')
      )

    } finally {

      setReservando(false)
    }
  }


  // =====================================================
  // FORMATO FECHA
  // =====================================================

  function fechaBonita(valor) {

    const partes =
      valor.split('-')

    const fechaObj =
      new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
      )

    return fechaObj.toLocaleDateString(
      'es-AR',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    )
  }


  // =====================================================
  // IMPRIMIR COMPROBANTE
  // =====================================================

  function imprimirComprobante() {

    window.print()
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

        button {
          cursor: pointer;
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

          padding: 25px 14px 60px;
        }

        .contenedor {
          width: 100%;
          max-width: 760px;
          margin: auto;
        }

        .encabezado {
          text-align: center;
          margin-bottom: 28px;
        }

        .pelota {
          font-size: 48px;
          margin-bottom: 5px;
        }

        .encabezado h1 {
          margin: 0;
          font-size: 36px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .encabezado p {
          margin: 7px 0 0;
          color: #9eb1a8;
          font-size: 14px;
        }

        .tarjeta {
          background:
            rgba(255,255,255,.06);

          border:
            1px solid rgba(255,255,255,.1);

          border-radius: 22px;

          padding: 20px;

          margin-bottom: 18px;

          backdrop-filter:
            blur(10px);
        }

        .titulo {
          font-size: 19px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .dias {
          display: grid;

          grid-template-columns:
            repeat(7, 1fr);

          gap: 6px;
        }

        .dia {
          border: 1px solid #355b48;

          background: #0b1b14;

          color: white;

          border-radius: 12px;

          padding: 12px 4px;

          font-size: 12px;

          font-weight: 900;
        }

        .diaActivo {
          background: #d7ff45;
          color: #17210c;
          border-color: #d7ff45;
        }

        .fechaActual {
          text-align: center;

          margin-top: 14px;

          color: #a9bbb3;

          font-size: 13px;

          text-transform: capitalize;
        }

        .canchas {
          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 10px;
        }

        .cancha {
          border:
            1px solid #355b48;

          background: #0b1b14;

          color: white;

          border-radius: 14px;

          padding: 16px 10px;

          font-weight: 900;
        }

        .canchaActivo {
          background: #d7ff45;
          color: #17210c;
          border-color: #d7ff45;
        }

        .horarios {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 10px;
        }

        .horario {
          border:
            1px solid #355b48;

          background: #0b1b14;

          color: white;

          border-radius: 13px;

          padding: 14px 5px;

          font-weight: 900;

          font-size: 14px;
        }

        .horarioActivo {
          background: #d7ff45;
          color: #17210c;
          border-color: #d7ff45;
        }

        .sinHorarios,
        .cargando {
          text-align: center;
          padding: 35px 10px;
          color: #91a69c;
        }

        .campo {
          margin-bottom: 14px;
        }

        .campo label {
          display: block;

          margin-bottom: 7px;

          color: #a9bbb3;

          font-size: 13px;

          font-weight: 700;
        }

        .campo input {
          width: 100%;

          padding: 14px;

          border:
            1px solid #29483a;

          border-radius: 13px;

          background: #0b1b14;

          color: white;

          outline: none;
        }

        .campo input:focus {
          border-color: #d7ff45;
        }

        .pagos {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 10px;

          margin-top: 5px;

          margin-bottom: 18px;
        }

        .pago {
          border:
            1px solid #355b48;

          background: #0b1b14;

          color: white;

          border-radius: 14px;

          padding: 16px;

          text-align: left;
        }

        .pagoActivo {
          border-color: #d7ff45;

          background:
            rgba(215,255,69,.09);
        }

        .pagoTitulo {
          font-weight: 900;
          margin-bottom: 5px;
        }

        .pagoDescripcion {
          color: #94a89f;
          font-size: 12px;
        }

        .pagoActivo .pagoDescripcion {
          color: #c9dda5;
        }

        .resumenPago {
          display: grid;

          gap: 8px;

          margin-bottom: 16px;

          padding: 14px;

          border-radius: 14px;

          background:
            rgba(255,255,255,.04);
        }

        .filaPago {
          display: flex;

          justify-content: space-between;

          gap: 10px;

          font-size: 13px;

          color: #a9bbb3;
        }

        .filaPago strong {
          color: white;
        }

        .filaPago.total strong {
          color: #d7ff45;
          font-size: 17px;
        }

        .botonReservar {
          width: 100%;

          border: 0;

          border-radius: 14px;

          padding: 16px;

          background: #d7ff45;

          color: #17210c;

          font-size: 16px;

          font-weight: 900;
        }

        .botonReservar:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .error {
          padding: 15px;

          border-radius: 14px;

          background: #421d22;

          border:
            1px solid #74343c;

          color: #ffb6bd;

          margin-bottom: 18px;
        }

        .mensaje {
          padding: 15px;

          border-radius: 14px;

          background:
            rgba(60,180,100,.12);

          border:
            1px solid rgba(100,220,130,.3);

          color: #b9f5c7;

          margin-bottom: 18px;

          text-align: center;

          font-weight: 700;
        }

        /* ================================================
           COMPROBANTE
        ================================================ */

        .comprobante {
          background: white;

          color: #17210c;

          border-radius: 20px;

          padding: 25px;

          margin-top: 20px;

          box-shadow:
            0 15px 40px
            rgba(0,0,0,.3);
        }

        .comprobanteTitulo {
          text-align: center;

          border-bottom:
            1px solid #ddd;

          padding-bottom: 15px;

          margin-bottom: 18px;
        }

        .comprobanteTitulo .check {
          font-size: 40px;
        }

        .comprobanteTitulo h2 {
          margin: 5px 0;

          font-size: 24px;
        }

        .comprobanteTitulo p {
          margin: 0;

          color: #666;

          font-size: 13px;
        }

        .comprobanteDatos {
          display: grid;

          gap: 10px;
        }

        .datoComprobante {
          display: flex;

          justify-content: space-between;

          gap: 10px;

          padding-bottom: 9px;

          border-bottom:
            1px solid #eee;

          font-size: 14px;
        }

        .datoComprobante span {
          color: #666;
        }

        .datoComprobante strong {
          text-align: right;
        }

        .pagoComprobante {
          margin-top: 16px;

          padding: 14px;

          border-radius: 12px;

          background: #f2f6ed;
        }

        .pagoComprobante strong {
          display: block;

          margin-bottom: 5px;
        }

        .botonImprimir {
          width: 100%;

          border: 0;

          border-radius: 12px;

          padding: 14px;

          margin-top: 18px;

          background: #17210c;

          color: white;

          font-weight: 900;
        }

        @media(max-width: 600px) {

          .dias {
            grid-template-columns:
              repeat(4, 1fr);
          }

          .horarios {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .pagos {
            grid-template-columns: 1fr;
          }

          .encabezado h1 {
            font-size: 30px;
          }
        }

        @media print {

          body {
            background: white !important;
          }

          .pagina {
            background: white !important;
            padding: 0 !important;
          }

          .noImprimir {
            display: none !important;
          }

          .comprobante {
            box-shadow: none;
            margin: 0;
          }

        }

      `}</style>


      <div className="contenedor">


        {/* =================================================
            ENCABEZADO
        ================================================= */}

        <header className="encabezado">

          <div className="pelota">
            🎾
          </div>

          <h1>
            LA QUINTA PADEL
          </h1>

          <p>
            Días y horarios disponibles
          </p>

        </header>


        {/* =================================================
            MENSAJE / ERROR
        ================================================= */}

        {error && (

          <div className="error">
            {error}
          </div>

        )}

        {mensaje && !comprobante && (

          <div className="mensaje">
            {mensaje}
          </div>

        )}


        {/* =================================================
            DÍAS
        ================================================= */}

        <section className="tarjeta noImprimir">

          <div className="titulo">
            📅 Elegí el día
          </div>

          <div className="dias">

            {dias.map(dia => (

              <button
                key={dia.numero}
                className={
                  'dia ' +
                  (
                    diaSeleccionado ===
                    dia.numero
                      ? 'diaActivo'
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

          <div className="fechaActual">

            {fechaBonita(fecha)}

          </div>

        </section>


        {/* =================================================
            CANCHAS
        ================================================= */}

        <section className="tarjeta noImprimir">

          <div className="titulo">
            🎾 Elegí la cancha
          </div>

          {cargandoCanchas ? (

            <div className="cargando">
              Cargando canchas...
            </div>

          ) : canchas.length === 0 ? (

            <div className="sinHorarios">
              No hay canchas disponibles.
            </div>

          ) : (

            <div className="canchas">

              {canchas.map(cancha => (

                <button
                  key={cancha.id}
                  className={
                    'cancha ' +
                    (
                      Number(
                        canchaSeleccionada?.id
                      ) ===
                      Number(cancha.id)
                        ? 'canchaActivo'
                        : ''
                    )
                  }
                  onClick={() =>
                    setCanchaSeleccionada(
                      cancha
                    )
                  }
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
            HORARIOS
        ================================================= */}

        <section className="tarjeta noImprimir">

          <div className="titulo">
            🕐 Horarios disponibles
          </div>

          {cargandoHorarios ? (

            <div className="cargando">
              Buscando horarios disponibles...
            </div>

          ) : horarios.length === 0 ? (

            <div className="sinHorarios">

              😕
              <br /><br />

              No hay horarios disponibles
              para este día.

            </div>

          ) : (

            <div className="horarios">

              {horarios.map(horario => {

                const activo =
                  horarioSeleccionado?.inicio ===
                  horario.inicio

                return (

                  <button
                    key={horario.inicio}
                    className={
                      'horario ' +
                      (
                        activo
                          ? 'horarioActivo'
                          : ''
                      )
                    }
                    onClick={() =>
                      setHorarioSeleccionado(
                        horario
                      )
                    }
                  >

                    {horario.inicio.slice(0, 5)}
                    {' - '}
                    {horario.fin.slice(0, 5)}

                  </button>

                )
              })}

            </div>

          )}

        </section>


        {/* =================================================
            DATOS Y PAGO
        ================================================= */}

        {horarioSeleccionado && (

          <section className="tarjeta noImprimir">

            <div className="titulo">
              👤 Datos de la reserva
            </div>


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
                Teléfono / WhatsApp
              </label>

              <input
                type="tel"
                placeholder="Tu teléfono"
                value={telefono}
                onChange={e =>
                  setTelefono(
                    e.target.value
                  )
                }
              />

            </div>


            <div className="titulo">
              💳 Forma de pago
            </div>


            <div className="pagos">

              <button
                className={
                  'pago ' +
                  (
                    tipoPago === '100'
                      ? 'pagoActivo'
                      : ''
                  )
                }
                onClick={() =>
                  setTipoPago('100')
                }
              >

                <div className="pagoTitulo">
                  💰 Pago completo
                </div>

                <div className="pagoDescripcion">
                  Pagás el 100% del turno
                </div>

              </button>


              <button
                className={
                  'pago ' +
                  (
                    tipoPago === '50'
                      ? 'pagoActivo'
                      : ''
                  )
                }
                onClick={() =>
                  setTipoPago('50')
                }
              >

                <div className="pagoTitulo">
                  💵 Seña del 50%
                </div>

                <div className="pagoDescripcion">
                  Pagás la mitad y queda
                  el 50% pendiente
                </div>

              </button>

            </div>


            {/* RESUMEN */}

            <div className="resumenPago">

              <div className="filaPago">

                <span>
                  Cancha
                </span>

                <strong>
                  {canchaSeleccionada?.nombre ||
                    `Cancha ${canchaSeleccionada?.id}`}
                </strong>

              </div>


              <div className="filaPago">

                <span>
                  Fecha
                </span>

                <strong>
                  {fechaBonita(fecha)}
                </strong>

              </div>


              <div className="filaPago">

                <span>
                  Horario
                </span>

                <strong>
                  {horarioSeleccionado.inicio.slice(0, 5)}
                  {' - '}
                  {horarioSeleccionado.fin.slice(0, 5)}
                </strong>

              </div>


              <div className="filaPago total">

                <span>
                  Total
                </span>

                <strong>
                  {pesos(
                    obtenerPrecio()
                  )}
                </strong>

              </div>


              <div className="filaPago">

                <span>
                  A pagar
                </span>

                <strong>
                  {pesos(
                    montoPago()
                  )}
                </strong>

              </div>


              <div className="filaPago">

                <span>
                  Saldo pendiente
                </span>

                <strong>
                  {pesos(
                    saldoPendiente()
                  )}
                </strong>

              </div>

            </div>


            <button
              className="botonReservar"
              disabled={reservando}
              onClick={reservar}
            >

              {reservando
                ? 'Procesando reserva...'
                : '🎾 Confirmar reserva'}

            </button>

          </section>

        )}


        {/* =================================================
            COMPROBANTE
        ================================================= */}

        {comprobante && (

          <section className="comprobante">

            <div className="comprobanteTitulo">

              <div className="check">
                ✅
              </div>

              <h2>
                Reserva recibida
              </h2>

              <p>
                Comprobante de reserva
              </p>

            </div>


            <div className="comprobanteDatos">

              {comprobante.id && (

                <div className="datoComprobante">

                  <span>
                    Reserva Nº
                  </span>

                  <strong>
                    {comprobante.id}
                  </strong>

                </div>

              )}


              <div className="datoComprobante">

                <span>
                  Cliente
                </span>

                <strong>
                  {comprobante.nombre}
                </strong>

              </div>


              <div className="datoComprobante">

                <span>
                  Teléfono
                </span>

                <strong>
                  {comprobante.telefono}
                </strong>

              </div>


              <div className="datoComprobante">

                <span>
                  Cancha
                </span>

                <strong>
                  {comprobante.cancha}
                </strong>

              </div>


              <div className="datoComprobante">

                <span>
                  Fecha
                </span>

                <strong>
                  {fechaBonita(
                    comprobante.fecha
                  )}
                </strong>

              </div>


              <div className="datoComprobante">

                <span>
                  Horario
                </span>

                <strong>
                  {comprobante.horario}
                </strong>

              </div>


              <div className="datoComprobante">

                <span>
                  Total
                </span>

                <strong>
                  {pesos(
                    comprobante.total
                  )}
                </strong>

              </div>

            </div>


            <div className="pagoComprobante">

              <strong>
                {comprobante.tipoPago}
              </strong>

              <div>
                Pagado / a pagar:{' '}

                <strong>
                  {pesos(
                    comprobante.pagado
                  )}
                </strong>
              </div>

              <div>
                Saldo pendiente:{' '}

                <strong>
                  {pesos(
                    comprobante.saldo
                  )}
                </strong>
              </div>

            </div>


            <button
              className="botonImprimir"
              onClick={
                imprimirComprobante
              }
            >
              🖨️ Imprimir comprobante
            </button>

          </section>

        )}

      </div>

    </main>
  )
}
