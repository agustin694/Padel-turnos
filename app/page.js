'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminAgenda() {

  const [reservas, setReservas] = useState([])
  const [canchas, setCanchas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [fechaSeleccionada, setFechaSeleccionada] =
    useState(fechaHoy())

  // =====================================================
  // FECHA DE HOY
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
  // CARGAR AGENDA
  // =====================================================

  useEffect(() => {
    cargarAgenda()
  }, [fechaSeleccionada])

  async function cargarAgenda() {

    setCargando(true)
    setError('')

    try {

      const [
        { data: dataReservas, error: errorReservas },
        { data: dataCanchas, error: errorCanchas }
      ] = await Promise.all([

        supabase
          .from('reservas')
          .select('*')
          .eq('fecha', fechaSeleccionada)
          .eq('estado', 'pendiente_pago')
          .order('hora_inicio', {
            ascending: true
          }),

        supabase
          .from('canchas')
          .select('*')
          .order('id')
      ])

      if (errorReservas) {
        throw new Error(
          `Error cargando reservas: ${errorReservas.message}`
        )
      }

      if (errorCanchas) {
        throw new Error(
          `Error cargando canchas: ${errorCanchas.message}`
        )
      }

      setReservas(dataReservas || [])
      setCanchas(dataCanchas || [])

    } catch (err) {

      console.error(err)

      setError(
        err.message ||
        'No se pudo cargar la agenda.'
      )

    } finally {

      setCargando(false)

    }
  }

  // =====================================================
  // NOMBRE DE CANCHA
  // =====================================================

  function nombreCancha(canchaId) {

    const cancha = canchas.find(
      c =>
        Number(c.id) ===
        Number(canchaId)
    )

    return cancha?.nombre ||
      `Cancha ${canchaId}`
  }

  // =====================================================
  // FORMATO FECHA
  // =====================================================

  function formatearFecha(fecha) {

    const [year, month, day] =
      fecha.split('-')

    const fechaObj =
      new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
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
    ).format(Number(valor || 0))
  }

  // =====================================================
  // CONFIRMAR RESERVA
  // =====================================================

  async function confirmarReserva(id) {

    const confirmar =
      window.confirm(
        '¿Querés confirmar esta reserva?'
      )

    if (!confirmar) {
      return
    }

    try {

      const { error } =
        await supabase
          .from('reservas')
          .update({
            estado: 'confirmada'
          })
          .eq('id', id)

      if (error) {
        throw error
      }

      setReservas(
        reservas.filter(
          reserva =>
            reserva.id !== id
        )
      )

      alert(
        'Reserva confirmada correctamente.'
      )

    } catch (err) {

      console.error(err)

      alert(
        'No se pudo confirmar la reserva.\n\n' +
        err.message
      )

    }
  }

  // =====================================================
  // RECHAZAR RESERVA
  // =====================================================

  async function rechazarReserva(id) {

    const confirmar =
      window.confirm(
        '¿Querés rechazar esta reserva?'
      )

    if (!confirmar) {
      return
    }

    try {

      const { error } =
        await supabase
          .from('reservas')
          .update({
            estado: 'cancelada'
          })
          .eq('id', id)

      if (error) {
        throw error
      }

      setReservas(
        reservas.filter(
          reserva =>
            reserva.id !== id
        )
      )

      alert(
        'Reserva rechazada.'
      )

    } catch (err) {

      console.error(err)

      alert(
        'No se pudo rechazar la reserva.\n\n' +
        err.message
      )

    }
  }

  // =====================================================
  // WHATSAPP
  // =====================================================

  function abrirWhatsApp(reserva) {

    const telefono =
      String(
        reserva.cliente_telefono || ''
      )
        .replace(/\D/g, '')

    if (!telefono) {

      alert(
        'Esta reserva no tiene teléfono.'
      )

      return
    }

    const mensaje =
      `Hola ${reserva.cliente_nombre || ''}, ` +
      `te escribimos desde Quinta Padel. ` +
      `Tenemos tu reserva del ${reserva.fecha} ` +
      `a las ${String(
        reserva.hora_inicio
      ).slice(0, 5)}. ` +
      `¿Podemos confirmar el turno?`

    const url =
      `https://wa.me/${telefono}` +
      `?text=${encodeURIComponent(mensaje)}`

    window.open(
      url,
      '_blank'
    )
  }

  // =====================================================
  // CAMBIAR FECHA
  // =====================================================

  function cambiarFecha(cantidad) {

    const fecha =
      new Date(
        `${fechaSeleccionada}T12:00:00`
      )

    fecha.setDate(
      fecha.getDate() + cantidad
    )

    const year =
      fecha.getFullYear()

    const month =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0')

    const day =
      String(
        fecha.getDate()
      ).padStart(2, '0')

    setFechaSeleccionada(
      `${year}-${month}-${day}`
    )
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

        body {
          margin: 0;
          background: #07110d;
          font-family: Arial, Helvetica, sans-serif;
          color: white;
        }

        button,
        input {
          font: inherit;
        }

        .pagina {
          min-height: 100vh;

          background:
            radial-gradient(
              circle at top,
              #16402e 0,
              #07110d 50%,
              #030806 100%
            );

          padding: 20px;
        }

        .contenedor {
          max-width: 900px;
          margin: auto;
        }

        .cabecera {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .cabecera h1 {
          margin: 0;
          font-size: 28px;
        }

        .cabecera p {
          margin: 6px 0 0;
          color: #8fa59a;
          font-size: 13px;
        }

        .botonActualizar {
          border: 1px solid #3b614f;
          background: #0c2117;
          color: white;
          padding: 11px 15px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 800;
        }

        .tarjeta {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 22px;
          padding: 20px;
          margin-bottom: 18px;
          backdrop-filter: blur(10px);
        }

        .selectorFecha {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .flecha {
          width: 45px;
          height: 45px;
          border: 0;
          border-radius: 13px;
          background: rgba(255,255,255,.09);
          color: white;
          font-size: 25px;
          cursor: pointer;
        }

        .fechaCentro {
          flex: 1;
          text-align: center;
        }

        .fechaCentro strong {
          display: block;
          text-transform: capitalize;
          font-size: 17px;
        }

        .fechaCentro small {
          display: block;
          color: #81978d;
          margin-top: 4px;
        }

        .inputFecha {
          width: 100%;
          margin-top: 12px;
          padding: 12px;
          border: 1px solid #29483a;
          border-radius: 12px;
          background: #0b1b14;
          color: white;
        }

        .tituloAgenda {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .tituloAgenda h2 {
          margin: 0;
          font-size: 19px;
        }

        .contador {
          background: #d7ff45;
          color: #17210c;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 900;
        }

        .reserva {
          background: #0b1b14;
          border: 1px solid #3d5f4f;
          border-radius: 18px;
          padding: 17px;
          margin-bottom: 12px;
        }

        .reserva:last-child {
          margin-bottom: 0;
        }

        .filaPrincipal {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
        }

        .hora {
          font-size: 25px;
          font-weight: 900;
          color: #d7ff45;
        }

        .cancha {
          color: #a9bbb3;
          font-size: 13px;
          margin-top: 4px;
        }

        .pendiente {
          background: rgba(255,193,7,.1);
          border: 1px solid rgba(255,193,7,.25);
          color: #ffe08a;
          padding: 7px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 900;
        }

        .cliente {
          margin-top: 15px;
          padding-top: 14px;
          border-top: 1px solid #29483a;
        }

        .clienteNombre {
          font-size: 17px;
          font-weight: 900;
        }

        .telefono {
          color: #9eb1a8;
          font-size: 13px;
          margin-top: 5px;
        }

        .datosPago {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .dato {
          padding: 10px;
          border-radius: 11px;
          background: rgba(255,255,255,.04);
        }

        .dato small {
          display: block;
          color: #82978d;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .dato strong {
          font-size: 13px;
        }

        .acciones {
          display: grid;
          grid-template-columns:
            1fr 1fr 1fr;
          gap: 8px;
          margin-top: 15px;
        }

        .accion {
          border: 0;
          padding: 12px 8px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .confirmar {
          background: #d7ff45;
          color: #17210c;
        }

        .whatsapp {
          background: #25d366;
          color: white;
        }

        .rechazar {
          background: #35191d;
          color: #ffabb4;
          border: 1px solid #633039;
        }

        .sinReservas {
          text-align: center;
          padding: 45px 15px;
          color: #8fa49a;
        }

        .sinReservas .icono {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .cargando {
          text-align: center;
          padding: 40px;
          color: #91a69c;
        }

        .error {
          padding: 15px;
          border-radius: 14px;
          background: #421d22;
          border: 1px solid #74343c;
          color: #ffb6bd;
          margin-bottom: 15px;
        }

        @media(max-width: 600px) {

          .pagina {
            padding: 12px;
          }

          .cabecera {
            align-items: flex-start;
          }

          .cabecera h1 {
            font-size: 23px;
          }

          .filaPrincipal {
            flex-direction: column;
          }

          .pendiente {
            align-self: flex-start;
          }

          .datosPago {
            grid-template-columns: 1fr;
          }

          .acciones {
            grid-template-columns: 1fr;
          }

        }

      `}</style>

      <div className="contenedor">

        <div className="cabecera">

          <div>

            <h1>
              🎾 Agenda
            </h1>

            <p>
              Reservas pendientes de confirmación
            </p>

          </div>

          <button
            className="botonActualizar"
            onClick={cargarAgenda}
          >
            🔄 Actualizar
          </button>

        </div>

        {error && (

          <div className="error">

            <strong>
              No pudimos cargar la agenda.
            </strong>

            <br /><br />

            {error}

          </div>

        )}

        <section className="tarjeta">

          <div className="selectorFecha">

            <button
              className="flecha"
              onClick={() =>
                cambiarFecha(-1)
              }
            >
              ‹
            </button>

            <div className="fechaCentro">

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

          <input
            className="inputFecha"
            type="date"
            value={fechaSeleccionada}
            onChange={(e) =>
              setFechaSeleccionada(
                e.target.value
              )
            }
          />

        </section>

        <section className="tarjeta">

          <div className="tituloAgenda">

            <h2>
              🟡 Por confirmar
            </h2>

            <span className="contador">
              {reservas.length}
            </span>

          </div>

          {cargando ? (

            <div className="cargando">
              Cargando reservas...
            </div>

          ) : reservas.length === 0 ? (

            <div className="sinReservas">

              <div className="icono">
                ✅
              </div>

              <strong>
                No hay reservas pendientes
              </strong>

              <br />

              <span>
                En esta fecha no hay reservas
                esperando confirmación.
              </span>

            </div>

          ) : (

            reservas.map((reserva) => (

              <div
                className="reserva"
                key={reserva.id}
              >

                <div className="filaPrincipal">

                  <div>

                    <div className="hora">
                      {String(
                        reserva.hora_inicio
                      ).slice(0, 5)}

                      {' - '}

                      {reserva.hora_fin
                        ? String(
                            reserva.hora_fin
                          ).slice(0, 5)
                        : ''
                      }
                    </div>

                    <div className="cancha">

                      🎾{' '}

                      {nombreCancha(
                        reserva.cancha_id
                      )}

                    </div>

                  </div>

                  <div className="pendiente">
                    🟡 PENDIENTE
                  </div>

                </div>

                <div className="cliente">

                  <div className="clienteNombre">

                    👤{' '}

                    {reserva.cliente_nombre ||
                      'Sin nombre'}

                  </div>

                  <div className="telefono">

                    📱{' '}

                    {reserva.cliente_telefono ||
                      'Sin teléfono'}

                  </div>

                </div>

                <div className="datosPago">

                  <div className="dato">

                    <small>
                      TOTAL
                    </small>

                    <strong>
                      {pesos(
                        reserva.precio_total
                      )}
                    </strong>

                  </div>

                  <div className="dato">

                    <small>
                      PAGADO
                    </small>

                    <strong>
                      {pesos(
                        reserva.monto_pagado
                      )}
                    </strong>

                  </div>

                  <div className="dato">

                    <small>
                      SALDO
                    </small>

                    <strong>
                      {pesos(
                        reserva.saldo_pendiente
                      )}
                    </strong>

                  </div>

                </div>

                <div className="acciones">

                  <button
                    className="accion confirmar"
                    onClick={() =>
                      confirmarReserva(
                        reserva.id
                      )
                    }
                  >
                    ✅ Confirmar
                  </button>

                  <button
                    className="accion whatsapp"
                    onClick={() =>
                      abrirWhatsApp(
                        reserva
                      )
                    }
                  >
                    📲 WhatsApp
                  </button>

                  <button
                    className="accion rechazar"
                    onClick={() =>
                      rechazarReserva(
                        reserva.id
                      )
                    }
                  >
                    ❌ Rechazar
                  </button>

                </div>

              </div>

            ))

          )}

        </section>

      </div>

    </main>
  )
                      }
