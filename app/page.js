'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const NOMBRE_CLUB = 'Quinta Padel'
const NUMERO_WHATSAPP = '5491112345678'

// =====================================================
// MERCADO PAGO
// =====================================================
// Acá más adelante vamos a poner tu link de pago.
// NO pongas Access Token ni ninguna clave acá.
const LINK_MERCADO_PAGO =
'PEGAR_AQUI_TU_LINK_DE_MERCADO_PAGO'

// =====================================================
// PRECIOS
// =====================================================

// 1 hora y 30 minutos = $50.000
const PRECIO_90_MINUTOS = 50000

// La seña siempre será el 50%
const PORCENTAJE_SENA = 0.50

const HORA_APERTURA = 7 * 60
const HORA_CIERRE = 26 * 60

function fechaLocal() {

const ahora = new Date()

return ${ahora.getFullYear()}-${String(   ahora.getMonth() + 1   ).padStart(2, '0')}-${String(   ahora.getDate()   ).padStart(2, '0')}
}

function convertirMinutos(hora) {

const [h, m] =
hora.slice(0, 5)
.split(':')
.map(Number)

let minutos = h * 60 + m

if (h < 7) {
minutos += 24 * 60
}

return minutos
}

function minutosAHora(minutos) {

const h =
Math.floor(minutos / 60) % 24

const m =
minutos % 60

return ${String(h).padStart(2, '0')}:${String(   m   ).padStart(2, '0')}
}

function sumarMinutos(hora, minutos) {

return minutosAHora(
convertirMinutos(hora) + minutos
)
}

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
month: 'long'
}
)
}

function generarHorarios() {

const horarios = []

for (
let minutos = HORA_APERTURA;
minutos <= HORA_CIERRE - 60;
minutos += 30
) {

horarios.push(  
  minutosAHora(minutos)  
)

}

return horarios
}

const HORARIOS =
generarHorarios()

// =====================================================
// PRECIO
// =====================================================

// Calculamos proporcionalmente:
// 90 minutos = $50.000
function calcularPrecio(duracionMinutos) {

const precio =
(PRECIO_90_MINUTOS / 90) *
duracionMinutos

return Math.round(precio)
}

function formatearPesos(valor) {

return new Intl.NumberFormat(
'es-AR',
{
style: 'currency',
currency: 'ARS',
maximumFractionDigits: 0
}
).format(valor)
}

function calcularPago(
duracionMinutos,
tipoPago
) {

const total =
calcularPrecio(duracionMinutos)

if (tipoPago === 'completo') {

return {  
  total,  
  pagado: total,  
  saldo: 0  
}

}

const sena =
Math.round(
total * PORCENTAJE_SENA
)

return {
total,
pagado: sena,
saldo: total - sena
}
}

export default function Home() {

const [canchas, setCanchas] =
useState([])

const [reservas, setReservas] =
useState([])

const [turnosFijos, setTurnosFijos] =
useState([])

const [cargando, setCargando] =
useState(true)

const [errorCarga, setErrorCarga] =
useState('')

const [
fechaSeleccionada,
setFechaSeleccionada
] = useState(fechaLocal())

const [
canchaSeleccionada,
setCanchaSeleccionada
] = useState(null)

const [
horaSeleccionada,
setHoraSeleccionada
] = useState(null)

const [duracion, setDuracion] =
useState(90)

const [
modalReserva,
setModalReserva
] = useState(false)

const [
nombreCliente,
setNombreCliente
] = useState('')

const [
telefonoCliente,
setTelefonoCliente
] = useState('')

const [
tipoPago,
setTipoPago
] = useState('sena')

const [
reservaCreada,
setReservaCreada
] = useState(null)

const [guardando, setGuardando] =
useState(false)

// =====================================================
// CARGAR DATOS
// =====================================================

useEffect(() => {

cargarDatos()

}, [fechaSeleccionada])

async function cargarDatos() {

setCargando(true)  
setErrorCarga('')  

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
      .select('*')  
      .eq(  
        'fecha',  
        fechaSeleccionada  
      ),  

    supabase  
      .from('turnos_fijos')  
      .select('*')  
      .eq(  
        'estado',  
        'activo'  
      )  

  ])  

  if (errorCanchas) {  

    throw new Error(  
      `No se pudieron cargar las canchas: ${errorCanchas.message}`  
    )  

  }  

  if (errorReservas) {  

    throw new Error(  
      `No se pudieron cargar las reservas: ${errorReservas.message}`  
    )  

  }  

  if (errorFijos) {  

    throw new Error(  
      `No se pudieron cargar los turnos fijos: ${errorFijos.message}`  
    )  

  }  

  setCanchas(  
    dataCanchas || []  
  )  

  setReservas(  
    dataReservas || []  
  )  

  setTurnosFijos(  
    dataFijos || []  
  )  

  if (  
    !canchaSeleccionada &&  
    dataCanchas &&  
    dataCanchas.length > 0  
  ) {  

    setCanchaSeleccionada(  
      dataCanchas[0].id  
    )  

  }  

} catch (error) {  

  console.error(error)  

  setErrorCarga(  
    error.message ||  
    'No se pudieron cargar los horarios.'  
  )  

} finally {  

  setCargando(false)  

}

}

// =====================================================
// RESERVAS
// =====================================================

function hayReserva(
canchaId,
hora
) {

const inicio =  
  convertirMinutos(hora)  

const fin =  
  inicio + 30  

return reservas.some((r) => {  

  if (  
    Number(r.cancha_id) !==  
    Number(canchaId)  
  ) {  

    return false  

  }  

  // Una reserva pendiente también  
  // bloquea temporalmente el horario.  
  const inicioReserva =  
    convertirMinutos(  
      r.hora_inicio  
    )  

  const finReserva =  
    r.hora_fin  
      ? convertirMinutos(  
          r.hora_fin  
        )  
      : inicioReserva + 90  

  return (  
    inicio < finReserva &&  
    fin > inicioReserva  
  )  

})

}

function hayTurnoFijo(
canchaId,
hora
) {

const fechaObj =  
  new Date(  
    `${fechaSeleccionada}T12:00:00`  
  )  

const diaSemana =  
  fechaObj.getDay()  

const inicio =  
  convertirMinutos(hora)  

const fin =  
  inicio + 30  

return turnosFijos.some((t) => {  

  if (  
    Number(t.cancha_id) !==  
    Number(canchaId)  
  ) {  

    return false  

  }  

  if (  
    fechaSeleccionada <  
    t.fecha_desde  
  ) {  

    return false  

  }  

  if (  
    fechaSeleccionada >  
    t.fecha_hasta  
  ) {  

    return false  

  }  

  if (  
    !Array.isArray(  
      t.dias_semana  
    )  
  ) {  

    return false  

  }  

  if (  
    !t.dias_semana.includes(  
      diaSemana  
    )  
  ) {  

    return false  

  }  

  const inicioFijo =  
    convertirMinutos(  
      t.hora_inicio  
    )  

  const finFijo =  
    t.hora_fin  
      ? convertirMinutos(  
          t.hora_fin  
        )  
      : inicioFijo + 60  

  return (  
    inicio < finFijo &&  
    fin > inicioFijo  
  )  

})

}

function estaDisponible(
canchaId,
horaInicio,
duracionMinutos
) {

const inicio =  
  convertirMinutos(  
    horaInicio  
  )  

const fin =  
  inicio +  
  duracionMinutos  

if (  
  fin > HORA_CIERRE  
) {  

  return false  

}  

for (  
  let minuto = inicio;  
  minuto < fin;  
  minuto += 30  
) {  

  const hora =  
    minutosAHora(  
      minuto  
    )  

  if (  
    hayReserva(  
      canchaId,  
      hora  
    )  
  ) {  

    return false  

  }  

  if (  
    hayTurnoFijo(  
      canchaId,  
      hora  
    )  
  ) {  

    return false  

  }  

}  

return true

}

function obtenerHorariosDisponibles(
canchaId
) {

const hoy =  
  fechaLocal()  

return HORARIOS.filter(  
  (hora) => {  

    if (  
      fechaSeleccionada <  
      hoy  
    ) {  

      return false  

    }  

    if (  
      fechaSeleccionada ===  
      hoy  
    ) {  

      const ahora =  
        new Date()  

      const minutosActuales =  
        ahora.getHours() * 60 +  
        ahora.getMinutes()  

      const minutosHorario =  
        convertirMinutos(hora)  

      if (  
        minutosHorario <=  
        minutosActuales  
      ) {  

        return false  

      }  

    }  

    return estaDisponible(  
      canchaId,  
      hora,  
      60  
    )  

  }  
)

}

const horariosDisponibles =
useMemo(() => {

if (!canchaSeleccionada) {  

    return []  

  }  

  return obtenerHorariosDisponibles(  
    canchaSeleccionada  
  )  

}, [  
  canchaSeleccionada,  
  reservas,  
  turnosFijos,  
  fechaSeleccionada  
])

const duracionesDisponibles =
useMemo(() => {

if (!horaSeleccionada) {  

    return []  

  }  

  const opciones = []  

  for (  
    let minutos = 60;  
    minutos <= 300;  
    minutos += 30  
  ) {  

    if (  
      estaDisponible(  
        canchaSeleccionada,  
        horaSeleccionada,  
        minutos  
      )  
    ) {  

      opciones.push(  
        minutos  
      )  

    }  

  }  

  return opciones  

}, [  
  horaSeleccionada,  
  canchaSeleccionada,  
  reservas,  
  turnosFijos  
])

useEffect(() => {

if (  
  duracionesDisponibles.length >  
  0 &&  
  !duracionesDisponibles.includes(  
    duracion  
  )  
) {  

  // Preferimos 90 minutos  
  // cuando esté disponible.  
  if (  
    duracionesDisponibles.includes(  
      90  
    )  
  ) {  

    setDuracion(90)  

  } else {  

    setDuracion(  
      duracionesDisponibles[0]  
    )  

  }  

}

}, [
duracionesDisponibles,
duracion
])

// =====================================================
// ABRIR RESERVA
// =====================================================

function abrirReserva(hora) {

setHoraSeleccionada(hora)  

if (  
  duracionesDisponibles.includes(  
    90  
  )  
) {  

  setDuracion(90)  

} else {  

  setDuracion(60)  

}  

setTipoPago('sena')  

setModalReserva(true)

}

// =====================================================
// CREAR RESERVA PENDIENTE
// =====================================================

async function crearReserva() {

if (  
  !nombreCliente.trim()  
) {  

  alert(  
    'Ingresá tu nombre.'  
  )  

  return  

}  

if (  
  !telefonoCliente.trim()  
) {  

  alert(  
    'Ingresá tu teléfono.'  
  )  

  return  

}  

if (!canchaSeleccionada) {  

  alert(  
    'Seleccioná una cancha.'  
  )  

  return  

}  

if (!horaSeleccionada) {  

  alert(  
    'Seleccioná un horario.'  
  )  

  return  

}  

if (  
  !estaDisponible(  
    canchaSeleccionada,  
    horaSeleccionada,  
    duracion  
  )  
) {  

  alert(  
    'Ese horario ya no está disponible.'  
  )  

  setModalReserva(false)  

  await cargarDatos()  

  return  

}  

const pago =  
  calcularPago(  
    duracion,  
    tipoPago  
  )  

setGuardando(true)  

try {  

  const horaFin =  
    sumarMinutos(  
      horaSeleccionada,  
      duracion  
    )  

  const { data, error } =  
    await supabase  
      .from('reservas')  
      .insert([  
        {  

          cancha_id:  
            canchaSeleccionada,  

          fecha:  
            fechaSeleccionada,  

          hora_inicio:  
            horaSeleccionada,  

          hora_fin:  
            horaFin,  

          cliente_nombre:  
            nombreCliente.trim(),  

          cliente_telefono:  
            telefonoCliente.trim(),  

          estado:  
            'pendiente_pago',  

          pago_confirmado:  
            false,  

          tipo:  
            'normal',  

          precio_total:  
            pago.total,  

          monto_pagado:  
            pago.pagado,  

          saldo_pendiente:  
            pago.saldo,  

          tipo_pago:  
            tipoPago  

        }  
      ])  
      .select()  
      .single()  

  if (error) {  

    throw new Error(  
      error.message  
    )  

  }  

  setReservaCreada({  
    id: data?.id,  
    cancha: canchas.find(  
      (c) =>  
        Number(c.id) ===  
        Number(  
          canchaSeleccionada  
        )  
    )?.nombre ||  
      'Cancha',  
    fecha:  
      fechaSeleccionada,  
    hora:  
      horaSeleccionada,  
    horaFin,  
    duracion,  
    nombre:  
      nombreCliente.trim(),  
    telefono:  
      telefonoCliente.trim(),  
    tipoPago,  
    total:  
      pago.total,  
    pagado:  
      pago.pagado,  
    saldo:  
      pago.saldo  
  })  

  setModalReserva(false)  

  await cargarDatos()  

} catch (error) {  

  console.error(error)  

  alert(  
    'No pudimos crear la reserva.\n\n' +  
    error.message  
  )  

} finally {  

  setGuardando(false)  

}

}

// =====================================================
// MERCADO PAGO
// =====================================================

function pagarMercadoPago() {

if (  
  LINK_MERCADO_PAGO ===  
  'PEGAR_AQUI_TU_LINK_DE_MERCADO_PAGO'  
) {  

  alert(  
    'Todavía falta configurar el link de Mercado Pago.\n\n' +  
    'La reserva ya quedó registrada como pendiente de pago.'  
  )  

  return  
}  

window.open(  
  LINK_MERCADO_PAGO,  
  '_blank'  
)

}

// =====================================================
// WHATSAPP
// =====================================================

function enviarComprobanteWhatsApp() {

if (!reservaCreada) {  
  return  
}  

const cancha =  
  canchas.find(  
    (c) =>  
      Number(c.id) ===  
      Number(  
        canchaSeleccionada  
      )  
  )  

let mensaje =  
  `Hola, hice una reserva en ${NOMBRE_CLUB}.`  

mensaje +=  
  `\n\n🎾 Cancha: ${  
    cancha?.nombre ||  
    reservaCreada.cancha  
  }`  

mensaje +=  
  `\n📅 Fecha: ${  
    reservaCreada.fecha  
  }`  

mensaje +=  
  `\n🕐 Horario: ${  
    reservaCreada.hora  
  } a ${  
    reservaCreada.horaFin  
  }`  

mensaje +=  
  `\n⏱️ Duración: ${  
    formatearDuracion(  
      reservaCreada.duracion  
    )  
  }`  

mensaje +=  
  `\n👤 Nombre: ${  
    reservaCreada.nombre  
  }`  

mensaje +=  
  `\n📱 WhatsApp: ${  
    reservaCreada.telefono  
  }`  

mensaje +=  
  `\n\n💰 Total: ${  
    formatearPesos(  
      reservaCreada.total  
    )  
  }`  

mensaje +=  
  `\n💳 Pago realizado: ${  
    formatearPesos(  
      reservaCreada.pagado  
    )  
  }`  

mensaje +=  
  `\n💵 Saldo pendiente: ${  
    formatearPesos(  
      reservaCreada.saldo  
    )  
  }`  

mensaje +=  
  `\n\n${  
    reservaCreada.tipoPago ===  
    'sena'  
      ? '🟡 Pagué la seña del 50%.'  
      : '🟢 Pagué el total.'  
  }`  

mensaje +=  
  `\n\n📎 Adjunto el comprobante de Mercado Pago.`  

const url =  
  `https://wa.me/${NUMERO_WHATSAPP}` +  
  `?text=${encodeURIComponent(  
    mensaje  
  )}`  

window.open(  
  url,  
  '_blank'  
)

}

function consultarHorario(hora) {

const cancha =  
  canchas.find(  
    (c) =>  
      Number(c.id) ===  
      Number(  
        canchaSeleccionada  
      )  
  )  

let mensaje =  
  `Hola, quería consultar por una reserva en ${NOMBRE_CLUB}.`  

if (cancha?.nombre) {  

  mensaje +=  
    `\nCancha: ${  
      cancha.nombre  
    }`  

}  

mensaje +=  
  `\nFecha: ${  
    fechaSeleccionada  
  }`  

if (hora) {  

  mensaje +=  
    `\nHorario: ${hora}`  

}  

const url =  
  `https://wa.me/${NUMERO_WHATSAPP}` +  
  `?text=${encodeURIComponent(  
    mensaje  
  )}`  

window.open(  
  url,  
  '_blank'  
)

}

function cambiarFecha(cantidad) {

const fecha =  
  new Date(  
    `${fechaSeleccionada}T12:00:00`  
  )  

fecha.setDate(  
  fecha.getDate() +  
  cantidad  
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

function formatearDuracion(
minutos
) {

const horas =  
  Math.floor(  
    minutos / 60  
  )  

const resto =  
  minutos % 60  

if (resto === 0) {  

  return `${horas} hora${  
    horas > 1  
      ? 's'  
      : ''  
  }`  

}  

return `${horas} h ${resto} min`

}

const pagoActual =
calcularPago(
duracion,
tipoPago
)

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
    input,  
    select {  
      font: inherit;  
    }  

    .pagina {  
      min-height: 100vh;  

      background:  
        radial-gradient(  
          circle at top,  
          #16402e 0,  
          #07110d 48%,  
          #030806 100%  
        );  

      padding-bottom: 60px;  
    }  

    .contenedor {  
      max-width: 720px;  
      width: 100%;  
      margin: auto;  
      padding: 18px;  
    }  

    .hero {  
      text-align: center;  
      padding: 22px 10px;  
    }  

    .logo {  
      width: 76px;  
      height: 76px;  
      margin: auto;  
      margin-bottom: 12px;  

      border-radius: 22px;  

      display: flex;  
      align-items: center;  
      justify-content: center;  

      background:  
        linear-gradient(  
          135deg,  
          #d7ff45,  
          #73c83d  
        );  

      font-size: 38px;  

      box-shadow:  
        0 15px 40px  
        rgba(0,0,0,.35);  
    }  

    .hero h1 {  
      margin: 0;  
      font-size: 30px;  
      letter-spacing: 1px;  
    }  

    .hero p {  
      margin: 8px 0 0;  
      color: #aebfb7;  
      font-size: 14px;  
    }  

    .tarjeta {  
      background:  
        rgba(255,255,255,.07);  

      border:  
        1px solid  
        rgba(255,255,255,.1);  

      border-radius: 22px;  

      padding: 18px;  
      margin-bottom: 16px;  

      backdrop-filter: blur(10px);  
    }  

    .titulo {  
      font-size: 15px;  
      font-weight: 800;  
      margin-bottom: 13px;  
    }  

    .selectorFecha {  
      display: flex;  
      align-items: center;  
      gap: 10px;  
    }  

    .flecha {  
      width: 44px;  
      height: 44px;  

      border: 0;  
      border-radius: 14px;  

      background:  
        rgba(255,255,255,.1);  

      color: white;  

      font-size: 24px;  

      cursor: pointer;  
    }  

    .fechaCentro {  
      flex: 1;  
      text-align: center;  
    }  

    .fechaCentro strong {  
      display: block;  
      text-transform: capitalize;  
      font-size: 16px;  
    }  

    .fechaCentro small {  
      color: #81978d;  
    }  

    .inputFecha {  
      width: 100%;  

      margin-top: 12px;  

      padding: 11px;  

      border:  
        1px solid #29483a;  

      border-radius: 12px;  

      background: #0b1b14;  

      color: white;  
    }  

    .tabs {  
      display: grid;  

      grid-template-columns:  
        repeat(2, 1fr);  

      gap: 10px;  
    }  

    .tab {  
      padding: 14px;  

      border:  
        1px solid #315447;  

      border-radius: 14px;  

      background: #0b1b14;  

      color: #afc1b8;  

      font-weight: 800;  

      cursor: pointer;  
    }  

    .tab.activa {  
      background: #d7ff45;  

      color: #142009;  

      border-color: #d7ff45;  
    }  

    .canchaHeader {  
      display: flex;  

      justify-content:  
        space-between;  

      align-items: center;  

      margin-bottom: 16px;  
    }  

    .canchaHeader h2 {  
      margin: 0;  
      font-size: 20px;  
    }  

    .canchaHeader span {  
      color: #82978d;  
      font-size: 12px;  
    }  

    .horarios {  
      display: flex;  
      flex-direction: column;  
      gap: 10px;  
    }  

    .horario {  
      width: 100%;  

      display: flex;  

      align-items: center;  

      justify-content:  
        space-between;  

      gap: 10px;  

      padding: 12px;  

      border:  
        1px solid #2b6642;  

      border-radius: 16px;  

      background:  
        linear-gradient(  
          90deg,  
          #0c2d1c,  
          #103a23  
        );  
    }  

    .hora {  
      min-width: 65px;  

      font-size: 18px;  

      font-weight: 900;  

      color: #c9ff8b;  
    }  

    .disponible {  
      color: #9ce66a;  

      font-size: 11px;  

      font-weight: 800;  
    }  

    .acciones {  
      display: flex;  
      gap: 7px;  
    }  

    .btnReservar {  
      border: 0;  

      background: #d7ff45;  

      color: #17210c;  

      padding: 10px 11px;  

      border-radius: 11px;  

      font-size: 11px;  

      font-weight: 900;  

      cursor: pointer;  
    }  

    .btnConsultar {  
      border:  
        1px solid #35624c;  

      background:  
        rgba(255,255,255,.05);  

      color: #d0ded7;  

      padding: 10px 11px;  

      border-radius: 11px;  

      font-size: 11px;  

      font-weight: 800;  

      cursor: pointer;  
    }  

    .sinHorarios {  
      padding: 25px 10px;  

      text-align: center;  

      color: #9aaca3;  

      font-size: 14px;  
    }  

    .whatsappGeneral {  
      width: 100%;  

      border: 0;  

      padding: 15px;  

      margin-top: 18px;  

      border-radius: 15px;  

      background: #25d366;  

      color: white;  

      font-weight: 900;  

      cursor: pointer;  
    }  

    .error {  
      padding: 15px;  

      margin-bottom: 16px;  

      border-radius: 14px;  

      background: #421d22;  

      border:  
        1px solid #74343c;  

      color: #ffb6bd;  

      font-size: 13px;  
    }  

    .modalFondo {  
      position: fixed;  

      inset: 0;  

      z-index: 100;  

      background:  
        rgba(0,0,0,.75);  

      display: flex;  

      align-items: flex-end;  

      justify-content: center;  

      padding: 12px;  

      overflow-y: auto;  
    }  

    .modal {  
      width: 100%;  

      max-width: 560px;  

      background: #0d1f17;  

      border:  
        1px solid #355a49;  

      border-radius: 24px;  

      padding: 22px;  

      margin-top: 20px;  
    }  

    .modal h2 {  
      margin: 0 0 5px;  
    }  

    .detalle {  
      color: #9fb2a9;  

      font-size: 13px;  

      line-height: 1.7;  

      margin-bottom: 18px;  
    }  

    .campo {  
      margin-bottom: 12px;  
    }  

    .campo label {  
      display: block;  

      margin-bottom: 6px;  

      color: #b9c9c2;  

      font-size: 12px;  

      font-weight: 800;  
    }  

    .campo input,  
    .campo select {  
      width: 100%;  

      padding: 13px;  

      border:  
        1px solid #355649;  

      border-radius: 12px;  

      background: #07120d;  

      color: white;  

      outline: none;  
    }  

    .opcionesPago {  
      display: grid;  

      grid-template-columns:  
        1fr 1fr;  

      gap: 10px;  

      margin-top: 8px;  
    }  

    .opcionPago {  
      padding: 14px;  

      border:  
        1px solid #355649;  

      border-radius: 14px;  

      background: #07120d;  

      color: #b9c9c2;  

      cursor: pointer;  

      text-align: left;  
    }  

    .opcionPago.activa {  
      border-color: #d7ff45;  

      background:  
        rgba(215,255,69,.09);  

      color: white;  
    }  

    .opcionPago strong {  
      display: block;  

      font-size: 14px;  

      margin-bottom: 5px;  
    }  

    .opcionPago span {  
      display: block;  

      font-size: 12px;  

      color: #9fb2a9;  
    }  

    .resumenPago {  
      margin-top: 16px;  

      padding: 16px;  

      border-radius: 16px;  

      background:  
        rgba(255,255,255,.04);  

      border:  
        1px solid #29483a;  
    }  

    .filaPago {  
      display: flex;  

      justify-content:  
        space-between;  

      gap: 10px;  

      padding: 6px 0;  

      font-size: 13px;  

      color: #b7c8c0;  
    }  

    .filaPago.total {  
      margin-top: 6px;  

      padding-top: 12px;  

      border-top:  
        1px solid #29483a;  

      color: white;  

      font-weight: 900;  

      font-size: 16px;  
    }  

    .filaPago.saldo {  
      color: #d7ff45;  

      font-weight: 800;  
    }  

    .notaPago {  
      padding: 12px;  

      margin-top: 12px;  

      border-radius: 12px;  

      background:  
        rgba(215,255,69,.06);  

      border:  
        1px solid  
        rgba(215,255,69,.13);  

      color: #c4d3cc;  

      font-size: 11px;  

      line-height: 1.5;  
    }  

    .botones {  
      display: grid;  

      grid-template-columns:  
        1fr 1fr;  

      gap: 10px;  

      margin-top: 18px;  
    }  

    .btnCancelar {  
      padding: 13px;  

      border:  
        1px solid #3b574a;  

      border-radius: 13px;  

      background: transparent;  

      color: #c2d0ca;  

      font-weight: 800;  

      cursor: pointer;  
    }  

    .btnConfirmar {  
      padding: 13px;  

      border: 0;  

      border-radius: 13px;  

      background: #d7ff45;  

      color: #14200b;  

      font-weight: 900;  

      cursor: pointer;  
    }  

    .btnConfirmar:disabled {  
      opacity: .5;  

      cursor: wait;  
    }  

    .pantallaExito {  
      text-align: center;  

      padding: 10px 0;  
    }  

    .iconoExito {  
      width: 70px;  
      height: 70px;  

      margin: 0 auto 14px;  

      border-radius: 50%;  

      display: flex;  

      align-items: center;  

      justify-content: center;  

      background:  
        rgba(215,255,69,.12);  

      border:  
        1px solid  
        rgba(215,255,69,.25);  

      font-size: 34px;  
    }  

    .pantallaExito h2 {  
      margin-bottom: 8px;  
    }  

    .estadoPendiente {  
      margin: 14px 0;  

      padding: 13px;  

      border-radius: 13px;  

      background:  
        rgba(255,193,7,.08);  

      border:  
        1px solid  
        rgba(255,193,7,.2);  

      color: #ffe08a;  

      font-size: 12px;  

      line-height: 1.5;  
    }  

    .resumenExito {  
      text-align: left;  

      padding: 15px;  

      margin-top: 15px;  

      border-radius: 15px;  

      background:  
        rgba(255,255,255,.04);  

      border:  
        1px solid #29483a;  

      line-height: 1.8;  

      font-size: 13px;  
    }  

    .btnMercadoPago {  
      width: 100%;  

      margin-top: 15px;  

      padding: 14px;  

      border: 0;  

      border-radius: 14px;  

      background: #009ee3;  

      color: white;  

      font-weight: 900;  

      cursor: pointer;  
    }  

    .btnWhatsApp {  
      width: 100%;  

      margin-top: 10px;  

      padding: 14px;  

      border: 0;  

      border-radius: 14px;  

      background: #25d366;  

      color: white;  

      font-weight: 900;  

      cursor: pointer;  
    }  

    .btnCerrar {  
      width: 100%;  

      margin-top: 10px;  

      padding: 13px;  

      border:  
        1px solid #3b574a;  

      border-radius: 13px;  

      background: transparent;  

      color: #c2d0ca;  

      font-weight: 800;  

      cursor: pointer;  
    }  

    .cargando {  
      text-align: center;  

      padding: 30px;  

      color: #9cafa6;  
    }  

    @media(max-width: 520px) {  

      .horario {  
        flex-wrap: wrap;  
      }  

      .hora {  
        min-width: 55px;  
      }  

      .acciones {  
        width: 100%;  
      }  

      .btnReservar,  
      .btnConsultar {  
        flex: 1;  
      }  

      .opcionesPago {  
        grid-template-columns:  
          1fr;  
      }  

    }  

  `}</style>  

  <div className="contenedor">  

    <header className="hero">  

      <div className="logo">  
        🎾  
      </div>  

      <h1>  
        {NOMBRE_CLUB}  
      </h1>  

      <p>  
        Reservá tu cancha fácil y rápido  
      </p>  

    </header>  

    {errorCarga && (  

      <div className="error">  

        <strong>  
          No pudimos cargar los horarios.  
        </strong>  

        <br /><br />  

        {errorCarga}  

        <br /><br />  

        <button  
          onClick={cargarDatos}  
          style={{  
            padding: '9px 13px',  
            border: 0,  
            borderRadius: 9,  
            cursor: 'pointer'  
          }}  
        >  
          Intentar nuevamente  
        </button>  

      </div>  

    )}  

    {/* =================================================  
        FECHA  
    ================================================= */}  

    <section className="tarjeta">  

      <div className="titulo">  
        📅 Elegí el día  
      </div>  

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
        min={fechaLocal()}  
        onChange={(e) =>  
          setFechaSeleccionada(  
            e.target.value  
          )  
        }  
      />  

    </section>  

    {/* =================================================  
        CANCHAS  
    ================================================= */}  

    <section className="tarjeta">  

      <div className="titulo">  
        🎾 Elegí la cancha  
      </div>  

      <div className="tabs">  

        {canchas.map(  
          (cancha, index) => (  

            <button  
              key={cancha.id}  

              className={  
                `tab ${  
                  Number(  
                    canchaSeleccionada  
                  ) ===  
                  Number(cancha.id)  
                    ? 'activa'  
                    : ''  
                }`  
              }  

              onClick={() =>  
                setCanchaSeleccionada(  
                  cancha.id  
                )  
              }  
            >  

              {cancha.nombre ||  
                `Cancha ${index + 1}`}  

            </button>  

          )  
        )}  

      </div>  

    </section>  

    {/* =================================================  
        HORARIOS  
    ================================================= */}  

    <section className="tarjeta">  

      {cargando ? (  

        <div className="cargando">  
          Cargando horarios...  
        </div>  

      ) : (  

        <>  

          <div className="canchaHeader">  

            <h2>  
              {  
                canchas.find(  
                  (c) =>  
                    Number(c.id) ===  
                    Number(  
                      canchaSeleccionada  
                    )  
                )?.nombre  
              }  
            </h2>  

            <span>  
              Horarios disponibles  
            </span>  

          </div>  

          {horariosDisponibles.length === 0 ? (  

            <div className="sinHorarios">  

              😕 No hay horarios disponibles  
              para este día.  

              <br /><br />  

              Podés consultar por WhatsApp  
              por si necesitás otro horario.  

            </div>  

          ) : (  

            <div className="horarios">  

              {horariosDisponibles.map(  
                (hora) => (  

                  <div  
                    className="horario"  
                    key={hora}  
                  >  

                    <div>  

                      <div className="hora">  
                        {hora}  
                      </div>  

                      <div className="disponible">  
                        🟢 Disponible  
                      </div>  

                    </div>  

                    <div className="acciones">  

                      <button  
                        className="btnReservar"  
                        onClick={() =>  
                          abrirReserva(  
                            hora  
                          )  
                        }  
                      >  
                        🎾 Reservar  
                      </button>  

                      <button  
                        className="btnConsultar"  
                        onClick={() =>  
                          consultarHorario(  
                            hora  
                          )  
                        }  
                      >  
                        💬 Consultar  
                      </button>  

                    </div>  

                  </div>  

                )  
              )}  

            </div>  

          )}  

          <button  
            className="whatsappGeneral"  
            onClick={() =>  
              consultarHorario('')  
            }  
          >  
            💬 Consultar por WhatsApp  
          </button>  

        </>  

      )}  

    </section>  

  </div>  

  {/* ===================================================  
      MODAL DE RESERVA  
  =================================================== */}  

  {modalReserva && (  

    <div  
      className="modalFondo"  

      onClick={(e) => {  

        if (  
          e.target ===  
          e.currentTarget  
        ) {  

          setModalReserva(false)  

        }  

      }}  
    >  

      <div className="modal">  

        <h2>  
          🎾 Reservar cancha  
        </h2>  

        <div className="detalle">  

          <strong>  
            {  
              canchas.find(  
                (c) =>  
                  Number(c.id) ===  
                  Number(  
                    canchaSeleccionada  
                  )  
              )?.nombre  
            }  
          </strong>  

          <br />  

          {formatearFecha(  
            fechaSeleccionada  
          )}  

          <br />  

          Inicio:  
          {' '}  

          <strong>  
            {horaSeleccionada}  
          </strong>  

        </div>  

        {/* DURACIÓN */}  

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

            {duracionesDisponibles.map(  
              (minutos) => (  

                <option  
                  key={minutos}  
                  value={minutos}  
                >  

                  {formatearDuracion(  
                    minutos  
                  )}  

                </option>  

              )  
            )}  

          </select>  

        </div>  

        {/* NOMBRE */}  

        <div className="campo">  

          <label>  
            Nombre  
          </label>  

          <input  
            type="text"  
            placeholder="Tu nombre"  
            value={nombreCliente}  
            onChange={(e) =>  
              setNombreCliente(  
                e.target.value  
              )  
            }  
          />  

        </div>  

        {/* TELEFONO */}  

        <div className="campo">  

          <label>  
            WhatsApp / Teléfono  
          </label>  

          <input  
            type="tel"  
            placeholder="Ej: 11 1234 5678"  
            value={telefonoCliente}  
            onChange={(e) =>  
              setTelefonoCliente(  
                e.target.value  
              )  
            }  
          />  

        </div>  

        {/* FORMA DE PAGO */}  

        <div className="campo">  

          <label>  
            ¿Cómo querés pagar?  
          </label>  

          <div className="opcionesPago">  

            <button  
              type="button"  
              className={  
                `opcionPago ${  
                  tipoPago === 'sena'  
                    ? 'activa'  
                    : ''  
                }`  
              }  
              onClick={() =>  
                setTipoPago('sena')  
              }  
            >  

              <strong>  
                🟡 Pagar seña  
              </strong>  

              <span>  
                50% ahora  
              </span>  

            </button>  

            <button  
              type="button"  
              className={  
                `opcionPago ${  
                  tipoPago === 'completo'  
                    ? 'activa'  
                    : ''  
                }`  
              }  
              onClick={() =>  
                setTipoPago(  
                  'completo'  
                )  
              }  
            >  

              <strong>  
                🟢 Pagar completo  
              </strong>  

              <span>  
                100% ahora  
              </span>  

            </button>  

          </div>  

        </div>  

        {/* RESUMEN */}  

        <div className="resumenPago">  

          <div className="filaPago">  

            <span>  
              Duración  
            </span>  

            <strong>  
              {formatearDuracion(  
                duracion  
              )}  
            </strong>  

          </div>  

          <div className="filaPago total">  

            <span>  
              Total  
            </span>  

            <strong>  
              {formatearPesos(  
                pagoActual.total  
              )}  
            </strong>  

          </div>  

          <div className="filaPago">  

            <span>  
              Pagás ahora  
            </span>  

            <strong>  
              {formatearPesos(  
                pagoActual.pagado  
              )}  
            </strong>  

          </div>  

          <div className="filaPago saldo">  

            <span>  
              Saldo pendiente  
            </span>  

            <strong>  
              {formatearPesos(  
                pagoActual.saldo  
              )}  
            </strong>  

          </div>  

        </div>  

        <div className="notaPago">  

          💳 Después de crear la reserva  
          podrás realizar el pago por  
          Mercado Pago y enviar el  
          comprobante por WhatsApp.  

          <br /><br />  

          ⚠️ La reserva queda pendiente  
          hasta que el pago sea verificado  
          por el club.  

        </div>  

        <div className="botones">  

          <button  
            className="btnCancelar"  
            onClick={() =>  
              setModalReserva(false)  
            }  
          >  
            Cancelar  
          </button>  

          <button  
            className="btnConfirmar"  
            disabled={guardando}  
            onClick={  
              crearReserva  
            }  
          >  

            {guardando  
              ? 'Procesando...'  
              : 'Continuar'}  

          </button>  

        </div>  

      </div>  

    </div>  

  )}  

  {/* ===================================================  
      RESERVA CREADA  
  =================================================== */}  

  {reservaCreada && (  

    <div className="modalFondo">  

      <div className="modal">  

        <div className="pantallaExito">  

          <div className="iconoExito">  
            ✓  
          </div>  

          <h2>  
            Reserva registrada  
          </h2>  

          <p  
            style={{  
              color: '#9fb2a9',  
              fontSize: '13px'  
            }}  
          >  
            Ahora realizá el pago y  
            enviá el comprobante.  
          </p>  

          <div className="estadoPendiente">  

            🟡 <strong>  
              Pendiente de pago  
            </strong>  

            <br />  

            El turno se confirmará  
            cuando el club verifique  
            el pago.  

          </div>  

          <div className="resumenExito">  

            🎾 <strong>  
              {reservaCreada.cancha}  
            </strong>  

            <br />  

            📅 {  
              formatearFecha(  
                reservaCreada.fecha  
              )  
            }  

            <br />  

            🕐 {  
              reservaCreada.hora  
            } - {  
              reservaCreada.horaFin  
            }  

            <br />  

            ⏱️ {  
              formatearDuracion(  
                reservaCreada.duracion  
              )  
            }  

            <br />  

            👤 {  
              reservaCreada.nombre  
            }  

            <br /><br />  

            💰 Total:  
            {' '}  
            <strong>  
              {formatearPesos(  
                reservaCreada.total  
              )}  
            </strong>  

            <br />  

            💳 Pagás:  
            {' '}  
            <strong>  
              {formatearPesos(  
                reservaCreada.pagado  
              )}  
            </strong>  

            <br />  

            💵 Saldo:  
            {' '}  
            <strong>  
              {formatearPesos(  
                reservaCreada.saldo  
              )}  
            </strong>  

          </div>  

          <button  
            className="btnMercadoPago"  
            onClick={  
              pagarMercadoPago  
            }  
          >  
            💳 Pagar con Mercado Pago  
          </button>  

          <button  
            className="btnWhatsApp"  
            onClick={  
              enviarComprobanteWhatsApp  
            }  
          >  
            📲 Enviar comprobante por WhatsApp  
          </button>  

          <button  
            className="btnCerrar"  
            onClick={() => {  

              setReservaCreada(  
                null  
              )  

              setNombreCliente('')  
              setTelefonoCliente('')  
              setHoraSeleccionada(  
                null  
              )  

            }}  
          >  
            Cerrar  
          </button>  

        </div>  

      </div>  

    </div>  

  )}  

</main>

)
            }
