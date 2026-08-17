'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const DIAS = [
{ numero: 1, nombre: 'Lunes' },
{ numero: 2, nombre: 'Martes' },
{ numero: 3, nombre: 'Miércoles' },
{ numero: 4, nombre: 'Jueves' },
{ numero: 5, nombre: 'Viernes' },
{ numero: 6, nombre: 'Sábado' },
{ numero: 0, nombre: 'Domingo' }
]

const DIAS_SHORT = [
{ numero: 1, nombre: 'Lun' },
{ numero: 2, nombre: 'Mar' },
{ numero: 3, nombre: 'Mié' },
{ numero: 4, nombre: 'Jue' },
{ numero: 5, nombre: 'Vie' },
{ numero: 6, nombre: 'Sáb' },
{ numero: 0, nombre: 'Dom' }
]

const DURACIONES = [60, 90, 120, 150, 180]

const HORARIOS = []

for (let minutos = 7 * 60; minutos <= 25 * 60; minutos += 30) {
const h = Math.floor(minutos / 60) % 24
const m = minutos % 60

HORARIOS.push(
${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}
)
}

function hoyLocal() {
const ahora = new Date()

return ${ahora.getFullYear()}-${String(   ahora.getMonth() + 1   ).padStart(2, '0')}-${String(   ahora.getDate()   ).padStart(2, '0')}
}

/*
WHATSAPP ARGENTINA
*/

function telefonoWhatsAppArgentina(telefono) {

if (!telefono) return null

let numero = telefono.replace(/\D/g, '')

if (numero.startsWith('549')) {
return numero
}

if (numero.startsWith('54')) {

numero = numero.slice(2)  

if (numero.startsWith('0')) {  
  numero = numero.slice(1)  
}  

if (!numero.startsWith('9')) {  
  numero = '9' + numero  
}  

return '54' + numero

}

if (numero.startsWith('0')) {
numero = numero.slice(1)
}

return '549' + numero
}

function minutosDesdeHora(hora) {

const [h, m] =
hora.slice(0, 5).split(':').map(Number)

let minutos = h * 60 + m

if (h < 7) {
minutos += 24 * 60
}

return minutos
}

function horaDesdeMinutos(minutos) {

const h =
Math.floor(minutos / 60) % 24

const m = minutos % 60

return ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}
}

function sumarMinutos(hora, minutos) {

return horaDesdeMinutos(
minutosDesdeHora(hora) + minutos
)
}

function sumarDias(fecha, dias) {

const d =
new Date(${fecha}T12:00:00)

d.setDate(d.getDate() + dias)

const y = d.getFullYear()

const m =
String(d.getMonth() + 1).padStart(2, '0')

const day =
String(d.getDate()).padStart(2, '0')

return ${y}-${m}-${day}
}

function labelDuracion(minutos) {

const horas =
Math.floor(minutos / 60)

const extra =
minutos % 60 === 30

return ${horas} hora${horas > 1 ? 's' : ''}${   extra ? ' y 30 minutos' : ''   }
}

export default function AdminPage() {

const router = useRouter()

const [canchas, setCanchas] = useState([])
const [reservas, setReservas] = useState([])
const [turnosFijos, setTurnosFijos] = useState([])

const [cargando, setCargando] = useState(true)
const [guardando, setGuardando] = useState(false)

const [fechaAgenda, setFechaAgenda] =
useState(hoyLocal())

const [canchaId, setCanchaId] =
useState('')

const [canchaAgendaFiltro, setCanchaAgendaFiltro] =
useState('todas')

const [canchaFijosFiltro, setCanchaFijosFiltro] =
useState('')

const [diaFijosFiltro, setDiaFijosFiltro] =
useState(1)

const [
canchaCasualesConfirmadosFiltro,
setCanchaCasualesConfirmadosFiltro
] = useState('')

const [
diaCasualesFiltro,
setDiaCasualesFiltro
] = useState(1)

const [
mostrarCasualesConfirmados,
setMostrarCasualesConfirmados
] = useState(true)

const [tipoTurno, setTipoTurno] =
useState('casual')

const [clienteNombre, setClienteNombre] =
useState('')

const [clienteTelefono, setClienteTelefono] =
useState('')

// TURNO CASUAL

const [fechaCasual, setFechaCasual] =
useState(hoyLocal())

const [horaCasual, setHoraCasual] =
useState('')

const [duracionCasual, setDuracionCasual] =
useState(60)

// TURNO FIJO

const [diasSeleccionados, setDiasSeleccionados] =
useState([])

const [horaFijo, setHoraFijo] =
useState('18:00')

const [duracionFijo, setDuracionFijo] =
useState(60)

const [mostrarFijosActivos, setMostrarFijosActivos] =
useState(true)

useEffect(() => {
cargarDatos()
}, [fechaAgenda])

function nombreCancha(canchaIdBuscado) {

const index =  
  canchas.findIndex(  
    c =>  
      Number(c.id) ===  
      Number(canchaIdBuscado)  
  )  

return index >= 0  
  ? `Cancha ${index + 1}`  
  : 'Cancha'

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

  if (errorCanchas) throw errorCanchas  
  if (errorReservas) throw errorReservas  
  if (errorFijos) throw errorFijos  

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

  if (  
    !canchaFijosFiltro &&  
    dataCanchas &&  
    dataCanchas.length > 0  
  ) {  
    setCanchaFijosFiltro(  
      String(dataCanchas[0].id)  
    )  
  }  

  if (  
    !canchaCasualesConfirmadosFiltro &&  
    dataCanchas &&  
    dataCanchas.length > 0  
  ) {  
    setCanchaCasualesConfirmadosFiltro(  
      String(dataCanchas[0].id)  
    )  
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

function cambiarDiaNavegacion(numeroDia) {

const actual =  
  new Date(`${fechaAgenda}T12:00:00`)  

const diaActual =  
  actual.getDay()  

const diff =  
  numeroDia - diaActual  

actual.setDate(  
  actual.getDate() + diff  
)  

setFechaAgenda(  
  `${actual.getFullYear()}-${String(  
    actual.getMonth() + 1  
  ).padStart(2, '0')}-${String(  
    actual.getDate()  
  ).padStart(2, '0')}`  
)

}

function turnoFijoCoincideConFecha(
turno,
fecha
) {

const fechaObj =  
  new Date(`${fecha}T12:00:00`)  

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

return sumarMinutos(  
  turno.hora_inicio,  
  duracionTurno  
)

}

function esFijoEnHora(
canchaIdBuscado,
hora,
fecha
) {

const inicioSlot =  
  minutosDesdeHora(hora)  

const finSlot =  
  inicioSlot + 30  

return turnosFijos.some(t => {  

  if (  
    Number(t.cancha_id) !==  
    Number(canchaIdBuscado)  
  ) {  
    return false  
  }  

  if (  
    !turnoFijoCoincideConFecha(  
      t,  
      fecha  
    )  
  ) {  
    return false  
  }  

  const inicioFijo =  
    minutosDesdeHora(  
      t.hora_inicio  
    )  

  const duracion =  
    t.duracion_minutos || 60  

  const finFijo =  
    inicioFijo + duracion  

  return (  
    inicioSlot < finFijo &&  
    finSlot > inicioFijo  
  )  
})

}

function esCasualEnHora(
canchaIdBuscado,
hora,
fecha
) {

const inicioSlot =  
  minutosDesdeHora(hora)  

const finSlot =  
  inicioSlot + 30  

return reservasNormales.some(r => {  

  if (  
    Number(r.cancha_id) !==  
    Number(canchaIdBuscado)  
  ) {  
    return false  
  }  

  if (r.fecha !== fecha) {  
    return false  
  }  

  const inicioReserva =  
    minutosDesdeHora(  
      r.hora_inicio  
    )  

  const finReserva =  
    r.hora_fin  
      ? minutosDesdeHora(r.hora_fin)  
      : inicioReserva + 90  

  return (  
    inicioSlot < finReserva &&  
    finSlot > inicioReserva  
  )  
})

}

/*
VERIFICA SI UN TURNO CHOCA
CON OTRO CASUAL O FIJO
*/

function haySolapamiento(
canchaSel,
fechaSel,
horaInicioSel,
duracionSel
) {

const inicioNuevo =  
  minutosDesdeHora(horaInicioSel)  

const finNuevo =  
  inicioNuevo + duracionSel  

// CASUALES  

const chocaCasual =  
  reservasNormales.some(r => {  

    if (  
      Number(r.cancha_id) !==  
      Number(canchaSel)  
    ) {  
      return false  
    }  

    if (r.fecha !== fechaSel) {  
      return false  
    }  

    const inicioR =  
      minutosDesdeHora(  
        r.hora_inicio  
      )  

    const finR =  
      r.hora_fin  
        ? minutosDesdeHora(r.hora_fin)  
        : inicioR + 90  

    return (  
      inicioNuevo < finR &&  
      finNuevo > inicioR  
    )  
  })  

if (chocaCasual) {  
  return true  
}  

// FIJOS  

const chocaFijo =  
  turnosFijos.some(t => {  

    if (  
      Number(t.cancha_id) !==  
      Number(canchaSel)  
    ) {  
      return false  
    }  

    if (  
      !turnoFijoCoincideConFecha(  
        t,  
        fechaSel  
      )  
    ) {  
      return false  
    }  

    const inicioF =  
      minutosDesdeHora(  
        t.hora_inicio  
      )  

    const finF =  
      inicioF +  
      (t.duracion_minutos || 60)  

    return (  
      inicioNuevo < finF &&  
      finNuevo > inicioF  
    )  
  })  

return chocaFijo

}

/*
HORARIOS DISPONIBLES
*/

function horariosDisponiblesParaCrear(
fechaSel,
duracionSel
) {

if (!canchaId || !fechaSel) {  
  return []  
}  

return HORARIOS.filter(hora => {  

  return !haySolapamiento(  
    canchaId,  
    fechaSel,  
    hora,  
    duracionSel  
  )  
})

}

/*
CREAR TURNO CASUAL
*/

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
  alert(  
    'Seleccioná un horario disponible.'  
  )  
  return  
}  

/*  
  SEGUNDA VERIFICACIÓN ANTES DE GUARDAR  
*/  

if (  
  haySolapamiento(  
    canchaId,  
    fechaCasual,  
    horaCasual,  
    duracionCasual  
  )  
) {  

  alert(  
    '⚠️ Ese horario ya está ocupado por un turno casual o fijo.'  
  )  

  setHoraCasual('')  

  return  
}  

setGuardando(true)  

try {  

  const horaFin =  
    sumarMinutos(  
      horaCasual,  
      duracionCasual  
    )  

  const { error } =  
    await supabase  
      .from('reservas')  
      .insert([  
        {  
          cancha_id: canchaId,  
          fecha: fechaCasual,  
          hora_inicio: horaCasual,  
          hora_fin: horaFin,  
          cliente_nombre:  
            clienteNombre.trim(),  
          cliente_telefono:  
            clienteTelefono.trim() || null,  
          estado: 'pendiente',  
          pago_confirmado: false,  
          tipo: 'normal'  
        }  
      ])  

  if (error) throw error  

  alert(  
    '✅ Turno casual creado correctamente.'  
  )  

  setClienteNombre('')  
  setClienteTelefono('')  
  setHoraCasual('')  

  await cargarDatos()  

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

/*
CREAR TURNO FIJO
*/

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

if (diasSeleccionados.length === 0) {  
  alert(  
    'Seleccioná al menos un día de la semana.'  
  )  
  return  
}  

/*  
  VERIFICAR CONTRA LOS TURNOS FIJOS  
*/  

const hayFijoOcupado =  
  diasSeleccionados.some(dia => {  

    return turnosFijos.some(t => {  

      if (  
        Number(t.cancha_id) !==  
        Number(canchaId)  
      ) {  
        return false  
      }  

      if (  
        !Array.isArray(t.dias_semana) ||  
        !t.dias_semana.includes(dia)  
      ) {  
        return false  
      }  

      const inicioNuevo =  
        minutosDesdeHora(horaFijo)  

      const finNuevo =  
        inicioNuevo + duracionFijo  

      const inicioFijo =  
        minutosDesdeHora(  
          t.hora_inicio  
        )  

      const finFijo =  
        inicioFijo +  
        (t.duracion_minutos || 60)  

      return (  
        inicioNuevo < finFijo &&  
        finNuevo > inicioFijo  
      )  
    })  
  })  

if (hayFijoOcupado) {  

  alert(  
    '⚠️ Uno de los días y horarios seleccionados ya está ocupado por otro turno fijo.'  
  )  

  return  
}  

/*  
  VERIFICAR CASUALES FUTUROS  
  QUE PUEDAN CHOCAR CON EL NUEVO FIJO  
*/  

const { data: reservasFuturas, error: errorReservas } =  
  await supabase  
    .from('reservas')  
    .select('*')  
    .eq('cancha_id', canchaId)  
    .gte('fecha', hoyLocal())  

if (errorReservas) {  
  alert(  
    'No se pudieron verificar los turnos existentes:\n\n' +  
    errorReservas.message  
  )  
  return  
}  

const hayCasualOcupado =  
  (reservasFuturas || []).some(r => {  

    if (r.estado === 'bloqueado') {  
      return false  
    }  

    const fecha =  
      new Date(  
        `${r.fecha}T12:00:00`  
      )  

    const dia =  
      fecha.getDay()  

    if (  
      !diasSeleccionados.includes(dia)  
    ) {  
      return false  
    }  

    const inicioNuevo =  
      minutosDesdeHora(horaFijo)  

    const finNuevo =  
      inicioNuevo + duracionFijo  

    const inicioR =  
      minutosDesdeHora(  
        r.hora_inicio  
      )  

    const finR =  
      r.hora_fin  
        ? minutosDesdeHora(r.hora_fin)  
        : inicioR + 90  

    return (  
      inicioNuevo < finR &&  
      finNuevo > inicioR  
    )  
  })  

if (hayCasualOcupado) {  

  alert(  
    '⚠️ Ya existe un turno casual en uno de los días seleccionados y ese horario. No se puede crear el turno fijo.'  
  )  

  return  
}  

setGuardando(true)  

try {  

  const { error } =  
    await supabase  
      .from('turnos_fijos')  
      .insert([  
        {  
          cancha_id: canchaId,  
          cliente_nombre:  
            clienteNombre.trim(),  
          cliente_telefono:  
            clienteTelefono.trim() || null,  
          fecha_desde: hoyLocal(),  
          fecha_hasta: '2099-12-31',  
          dias_semana:  
            diasSeleccionados,  
          hora_inicio: horaFijo,  
          duracion_minutos:  
            duracionFijo,  
          estado: 'activo'  
        }  
      ])  

  if (error) throw error  

  alert(  
    '✅ Turno fijo creado correctamente.'  
  )  

  setClienteNombre('')  
  setClienteTelefono('')  
  setDiasSeleccionados([])  

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

/*
PASAR CASUAL A FIJO
*/

async function pasarCasualAFijo(reserva) {

const confirmar =  
  confirm(  
    `¿Querés convertir el turno de ${reserva.cliente_nombre || 'este cliente'} en turno fijo?\n\n` +  
    `Cancha: ${nombreCancha(reserva.cancha_id)}\n` +  
    `Horario: ${reserva.hora_inicio} - ${reserva.hora_fin || ''}\n\n` +  
    `Se mantendrá el mismo día de la semana y horario.`  
  )  

if (!confirmar) return  

const fecha =  
  new Date(  
    `${reserva.fecha}T12:00:00`  
  )  

const dia =  
  fecha.getDay()  

const duracion =  
  reserva.hora_fin  
    ? minutosDesdeHora(  
        reserva.hora_fin  
      ) -  
      minutosDesdeHora(  
        reserva.hora_inicio  
      )  
    : 90  

/*  
  VERIFICAR SI YA EXISTE UN FIJO  
*/  

const existeFijo =  
  turnosFijos.some(t => {  

    if (  
      Number(t.cancha_id) !==  
      Number(reserva.cancha_id)  
    ) {  
      return false  
    }  

    if (  
      !Array.isArray(t.dias_semana) ||  
      !t.dias_semana.includes(dia)  
    ) {  
      return false  
    }  

    const inicioNuevo =  
      minutosDesdeHora(  
        reserva.hora_inicio  
      )  

    const finNuevo =  
      inicioNuevo + duracion  

    const inicioFijo =  
      minutosDesdeHora(  
        t.hora_inicio  
      )  

    const finFijo =  
      inicioFijo +  
      (t.duracion_minutos || 60)  

    return (  
      inicioNuevo < finFijo &&  
      finNuevo > inicioFijo  
    )  
  })  

if (existeFijo) {  

  alert(  
    '⚠️ Ya existe un turno fijo que ocupa ese horario.'  
  )  

  return  
}  

setGuardando(true)  

try {  

  /*  
    CREAR FIJO  
  */  

  const { error: errorFijo } =  
    await supabase  
      .from('turnos_fijos')  
      .insert([  
        {  
          cancha_id:  
            reserva.cancha_id,  

          cliente_nombre:  
            reserva.cliente_nombre,  

          cliente_telefono:  
            reserva.cliente_telefono || null,  

          fecha_desde:  
            reserva.fecha,  

          fecha_hasta:  
            '2099-12-31',  

          dias_semana:  
            [dia],  

          hora_inicio:  
            reserva.hora_inicio,  

          duracion_minutos:  
            duracion,  

          estado:  
            'activo'  
        }  
      ])  

  if (errorFijo) {  
    throw errorFijo  
  }  

  /*  
    ELIMINAR EL CASUAL  
    PARA QUE NO QUEDE DUPLICADO  
  */  

  const { error: errorEliminar } =  
    await supabase  
      .from('reservas')  
      .delete()  
      .eq('id', reserva.id)  

  if (errorEliminar) {  
    throw errorEliminar  
  }  

  alert(  
    '✅ El turno casual ahora es un turno fijo.'  
  )  

  await cargarDatos()  

} catch (error) {  

  console.error(error)  

  alert(  
    'No se pudo convertir el turno en fijo:\n\n' +  
    error.message  
  )  

} finally {  

  setGuardando(false)  

}

}

/*
ELIMINAR TURNO FIJO
*/

async function eliminarTurnoFijo(id) {

const confirmar =  
  confirm(  
    '¿Querés eliminar este turno fijo completo?'  
  )  

if (!confirmar) return  

const { error } =  
  await supabase  
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

alert(  
  'Turno fijo eliminado.'  
)  

await cargarDatos()

}

/*
LIBERAR CASUAL
*/

async function cancelarReserva(id) {

const confirmar =  
  confirm(  
    '¿Seguro que querés liberar este turno?'  
  )  

if (!confirmar) return  

const { error } =  
  await supabase  
    .from('reservas')  
    .delete()  
    .eq('id', id)  

if (error) {  

  alert(  
    'No se pudo liberar:\n\n' +  
    error.message  
  )  

  return  
}  

await cargarDatos()

}

/*
CAMBIAR PAGO
*/

async function cambiarPago(
id,
estadoActual
) {

const nuevoPago =  
  !estadoActual  

const { error } =  
  await supabase  
    .from('reservas')  
    .update({  
      pago_confirmado:  
        nuevoPago,  

      estado:  
        nuevoPago  
          ? 'confirmado'  
          : 'pendiente'  
    })  
    .eq('id', id)  

if (error) {  

  console.error(error)  

  alert(  
    'No se pudo actualizar el pago:\n\n' +  
    error.message  
  )  

  return  
}  

await cargarDatos()

}

const reservasNormales =
reservas.filter(
r =>
r.estado !== 'bloqueado'
)

const reservasPendientesGlobal =
reservasNormales.filter(
r =>
r.estado === 'pendiente'
)

const reservasConfirmadasGlobal =
reservasNormales.filter(
r =>
r.estado === 'confirmado'
)

const horariosDisponiblesCasual =
useMemo(
() =>
horariosDisponiblesParaCrear(
fechaCasual,
duracionCasual
),
[
canchaId,
fechaCasual,
duracionCasual,
reservas,
turnosFijos
]
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

    .reservaConfirmada {  
      background: #1b1028;  
      border-left: 4px solid #8b5cf6;  
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

    .btnFijo {  
      background: #eab308;  
      color: #211700;  
      border: 0;  
      border-radius: 8px;  
      padding: 8px 10px;  
      font-size: 11px;  
      font-weight: bold;  
      cursor: pointer;  
    }  

    .btnWsp {  
      display: inline-flex;  
      align-items: center;  
      gap: 4px;  
      background: #25d366;  
      color: #07110d;  
      border: 0;  
      border-radius: 6px;  
      padding: 5px 8px;  
      font-size: 11px;  
      font-weight: bold;  
      cursor: pointer;  
      text-decoration: none;  
      margin-left: 6px;  
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

    .grupoCancha {  
      margin-bottom: 18px;  
    }  

    .grupoCancha h3 {  
      margin: 0 0 10px;  
    }  

    .botonesDiasCasuales {  
      display: grid;  
      grid-template-columns: repeat(7, 1fr);  
      gap: 4px;  
    }  

    .botonDiaCasual {  
      padding: 8px 2px;  
      font-size: 11px;  
      border-radius: 8px;  
      border: 1px solid #355546;  
      background: #07110d;  
      color: #a9bbb2;  
      cursor: pointer;  
      font-weight: bold;  
    }  

    .botonDiaCasual.activo {  
      background: #c084fc;  
      color: #180b25;  
      border-color: #c084fc;  
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

      .botonesDiasCasuales {  
        grid-template-columns: repeat(4, 1fr);  
      }  

    }  

  `}</style>  


  <div className="contenedor">  

    {/* TITULO */}  

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


    {/* NAVEGADOR */}  

    <section className="tarjeta">  

      <label>  
        Navegación semanal rápida  
      </label>  

      <div  
        style={{  
          display: 'grid',  
          gridTemplateColumns:  
            'repeat(7, 1fr)',  
          gap: '4px'  
        }}  
      >  

        {DIAS_SHORT.map(d => (  

          <button  
            key={d.numero}  
            type="button"  
            onClick={() =>  
              cambiarDiaNavegacion(  
                d.numero  
              )  
            }  
            style={{  
              background: '#183126',  
              color: 'white',  
              border:  
                '1px solid #355546',  
              padding: '8px 2px',  
              borderRadius: '6px',  
              cursor: 'pointer',  
              fontSize: '11px',  
              fontWeight: 'bold'  
            }}  
          >  
            {d.nombre}  
          </button>  

        ))}  

      </div>  

    </section>  


    {/* VISTA RAPIDA */}  

    <section className="tarjeta">  

      <h2>  
        👁️ Vista rápida de horarios  
        {' '}  
        ({fechaAgenda})  
      </h2>  

      {canchas.map(cancha => (  

        <div  
          key={cancha.id}  
          style={{  
            marginTop: '14px'  
          }}  
        >  

          <h3  
            style={{  
              fontSize: '14px',  
              margin:  
                '0 0 6px 0',  
              color: '#d7ff45'  
            }}  
          >  
            🎾 {nombreCancha(cancha.id)}  
          </h3>  

          <div  
            style={{  
              display: 'grid',  
              gridTemplateColumns:  
                'repeat(6, 1fr)',  
              gap: '4px'  
            }}  
          >  

            {HORARIOS.map(h => {  

              const fijo =  
                esFijoEnHora(  
                  cancha.id,  
                  h,  
                  fechaAgenda  
                )  

              const casual =  
                esCasualEnHora(  
                  cancha.id,  
                  h,  
                  fechaAgenda  
                )  

              const colorBg =  
                fijo  
                  ? '#3b82f6'  
                  : casual  
                    ? '#8b5cf6'  
                    : '#22c55e'  

              return (  

                <div  
                  key={h}  
                  style={{  
                    background:  
                      colorBg,  
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

      <div  
        style={{  
          display: 'flex',  
          gap: '15px',  
          justifyContent: 'center',  
          marginTop: '15px',  
          fontSize: '11px'  
        }}  
      >  

        <span>  
          🟦 Fijo  
        </span>  

        <span>  
          🟣 Casual  
        </span>  

        <span>  
          🟩 Libre  
        </span>  

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
          className={`tabTipo ${  
            tipoTurno === 'casual'  
              ? 'activo'  
              : ''  
          }`}  
          onClick={() =>  
            setTipoTurno('casual')  
          }  
        >  
          🟢 Turno casual  
        </button>  

        <button  
          type="button"  
          className={`tabTipo ${  
            tipoTurno === 'fijo'  
              ? 'activo'  
              : ''  
          }`}  
          onClick={() =>  
            setTipoTurno('fijo')  
          }  
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
            onChange={e =>  
              setCanchaId(  
                e.target.value  
              )  
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
              onChange={e =>  
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
              onChange={e =>  
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
                  onChange={e =>  
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
                  onChange={e =>  
                    setHoraCasual(  
                      e.target.value  
                    )  
                  }  
                >  

                  <option value="">  
                    Elegir horario disponible  
                  </option>  

                  {horariosDisponiblesCasual.map(  
                    hora => (  

                      <option  
                        key={hora}  
                        value={hora}  
                      >  
                        {hora}  
                      </option>  

                    )  
                  )}  

                </select>  

              </div>  

            </div>  

            <div className="campo">  

              <label>  
                Duración  
              </label>  

              <select  
                value={duracionCasual}  
                onChange={e =>  
                  setDuracionCasual(  
                    Number(  
                      e.target.value  
                    )  
                  )  
                }  
              >  

                {DURACIONES.map(  
                  minutos => (  

                    <option  
                      key={minutos}  
                      value={minutos}  
                    >  
                      {labelDuracion(  
                        minutos  
                      )}  
                    </option>  

                  )  
                )}  

              </select>  

            </div>  

          </>  

        ) : (  

          <>  

            <div className="campo">  

              <label>  
                Días de la semana  
              </label>  

              <div className="dias">  

                {DIAS_SHORT.map(  
                  dia => (  

                    <button  
                      type="button"  
                      key={dia.numero}  
                      className={`dia ${  
                        diasSeleccionados.includes(  
                          dia.numero  
                        )  
                          ? 'activo'  
                          : ''  
                      }`}  
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

                  )  
                )}  

              </div>  

            </div>  


            <div className="fila">  

              <div className="campo">  

                <label>  
                  Hora de inicio  
                </label>  

                <select  
                  value={horaFijo}  
                  onChange={e =>  
                    setHoraFijo(  
                      e.target.value  
                    )  
                  }  
                >  

                  {HORARIOS.map(  
                    hora => (  

                      <option  
                        key={hora}  
                        value={hora}  
                      >  
                        {hora}  
                      </option>  

                    )  
                  )}  

                </select>  

              </div>  


              <div className="campo">  

                <label>  
                  Duración  
                </label>  

                <select  
                  value={duracionFijo}  
                  onChange={e =>  
                    setDuracionFijo(  
                      Number(  
                        e.target.value  
                      )  
                    )  
                  }  
                >  

                  {DURACIONES.map(  
                    minutos => (  

                      <option  
                        key={minutos}  
                        value={minutos}  
                      >  
                        {labelDuracion(  
                          minutos  
                        )}  
                      </option>  

                    )  
                  )}  

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


    {/* AGENDA */}  

    <section className="tarjeta">  

      <h2>  
        📅 Agenda (Pendientes de pago)  
      </h2>  

      <div className="agendaHeader">  

        <button  
          onClick={() =>  
            setFechaAgenda(  
              sumarDias(  
                fechaAgenda,  
                -1  
              )  
            )  
          }  
        >  
          ‹  
        </button>  

        <div className="fecha">  
          {fechaAgenda}  
        </div>  

        <button  
          onClick={() =>  
            setFechaAgenda(  
              sumarDias(  
                fechaAgenda,  
                1  
              )  
            )  
          }  
        >  
          ›  
        </button>  

      </div>  


      <div  
        className="campo"  
        style={{  
          marginBottom: '15px'  
        }}  
      >  

        <label>  
          Filtrar por Cancha en Agenda  
        </label>  

        <select  
          value={canchaAgendaFiltro}  
          onChange={e =>  
            setCanchaAgendaFiltro(  
              e.target.value  
            )  
          }  
        >  

          <option value="todas">  
            Todas las canchas  
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


      {cargando ? (  

        <div className="vacio">  
          Cargando...  
        </div>  

      ) : (  

        canchas  
          .filter(  
            c =>  
              canchaAgendaFiltro ===  
                'todas' ||  
              Number(  
                canchaAgendaFiltro  
              ) === Number(c.id)  
          )  
          .map(cancha => {  

            const reservasPendientes =  
              reservasPendientesGlobal.filter(  
                r =>  
                  Number(  
                    r.cancha_id  
                  ) === Number(  
                    cancha.id  
                  )  
              )  

            return (  

              <div  
                className="agendaCancha"  
                key={cancha.id}  
              >  

                <h3>  
                  🎾 {nombreCancha(  
                    cancha.id  
                  )}  
                </h3>  


                {reservasPendientes.map(  
                  reserva => (  

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

                      </div>  

                      {reserva.cliente_telefono && (  

                        <div  
                          className="info"  
                          style={{  
                            display: 'flex',  
                            alignItems: 'center',  
                            flexWrap: 'wrap',  
                            gap: '4px'  
                          }}  
                        >  

                          📞{' '}  
                          {reserva.cliente_telefono}  

                          <a  
                            href={`https://wa.me/${telefonoWhatsAppArgentina(  
                              reserva.cliente_telefono  
                            )}`}  
                            target="_blank"  
                            rel="noopener noreferrer"  
                            className="btnWsp"  
                          >  
                            💬 WhatsApp  
                          </a>  

                        </div>  

                      )}  


                      <div className="acciones">  

                        <button  
                          className="btnPago pendiente"  
                          onClick={() =>  
                            cambiarPago(  
                              reserva.id,  
                              reserva.pago_confirmado  
                            )  
                          }  
                        >  
                          ⚡ Confirmar pago  
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

                  )  
                )}  


                {reservasPendientes.length ===  
                  0 && (  

                  <div className="vacio">  
                    No hay turnos pendientes  
                    de pago en esta cancha  
                    para este día.  
                  </div>  

                )}  

              </div>  

            )  
          })  

      )}  

    </section>  


    {/* TURNOS CASUALES */}  

    <section className="tarjeta">  

      <button  
        className="toggle"  
        onClick={() =>  
          setMostrarCasualesConfirmados(  
            !mostrarCasualesConfirmados  
          )  
        }  
        style={{  
          color: '#c084fc',  
          fontSize: '17px'  
        }}  
      >  

        🟣 Turnos casuales (  
        {reservasConfirmadasGlobal.length}  
        )  

        {mostrarCasualesConfirmados  
          ? ' ▲'  
          : ' ▼'}  

      </button>  


      {mostrarCasualesConfirmados && (  

        <>  

          <div  
            className="campo"  
            style={{  
              marginTop: '10px'  
            }}  
          >  

            <label>  
              Seleccionar cancha  
            </label>  

            <select  
              value={  
                canchaCasualesConfirmadosFiltro  
              }  
              onChange={e =>  
                setCanchaCasualesConfirmadosFiltro(  
                  e.target.value  
                )  
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


          <div className="campo">  

            <label>  
              Día de la semana  
            </label>  

            <div className="botonesDiasCasuales">  

              {DIAS.map(dia => (  

                <button  
                  key={dia.numero}  
                  type="button"  
                  className={`botonDiaCasual ${  
                    diaCasualesFiltro ===  
                    dia.numero  
                      ? 'activo'  
                      : ''  
                  }`}  
                  onClick={() =>  
                    setDiaCasualesFiltro(  
                      dia.numero  
                    )  
                  }  
                >  
                  {dia.nombre}  
                </button>  

              ))}  

            </div>  

          </div>  


          {(() => {  

            const casualesFiltrados =  
              reservasConfirmadasGlobal  
                .filter(reserva => {  

                  if (  
                    Number(  
                      reserva.cancha_id  
                    ) !== Number(  
                      canchaCasualesConfirmadosFiltro  
                    )  
                  ) {  
                    return false  
                  }  

                  if (  
                    reserva.estado !==  
                    'confirmado'  
                  ) {  
                    return false  
                  }  

                  if (!reserva.fecha) {  
                    return false  
                  }  

                  const fecha =  
                    new Date(  
                      `${reserva.fecha}T12:00:00`  
                    )  

                  return (  
                    fecha.getDay() ===  
                    diaCasualesFiltro  
                  )  

                })  
                .sort(  
                  (a, b) =>  
                    a.hora_inicio.localeCompare(  
                      b.hora_inicio  
                    )  
                )  

            const diaNombre =  
              DIAS.find(  
                d =>  
                  d.numero ===  
                  diaCasualesFiltro  
              )?.nombre || ''  


            return (  

              <div  
                className="grupoCancha"  
                style={{  
                  marginTop: '15px'  
                }}  
              >  

                <h3>  

                  📅{' '}  
                  {nombreCancha(  
                    canchaCasualesConfirmadosFiltro  
                  )}  

                  {' — '}  

                  {diaNombre}  

                  {' ('}  
                  {casualesFiltrados.length}  
                  {')'}  

                </h3>  


                {casualesFiltrados.length ===  
                  0 && (  

                  <div className="vacio">  

                    No hay turnos casuales  
                    confirmados para este día.  

                  </div>  

                )}  


                {casualesFiltrados.map(  
                  reserva => (  

                    <div  
                      className="reservaConfirmada"  
                      key={reserva.id}  
                    >  

                      <strong>  

                        🟣 {reserva.hora_inicio}  

                        {reserva.hora_fin  
                          ? ` - ${reserva.hora_fin}`  
                          : ''}  

                      </strong>  


                      <div  
                        className="info"  
                        style={{  
                          display: 'flex',  
                          alignItems:  
                            'center',  
                          flexWrap:  
                            'wrap',  
                          gap: '4px'  
                        }}  
                      >  

                        👤{' '}  

                        <strong>  
                          Cliente:  
                        </strong>{' '}  

                        {reserva.cliente_nombre ||  
                          'Sin nombre'}  


                        {reserva.cliente_telefono ? (  

                          <>  

                            <span>  
                              · 📞{' '}  
                              {  
                                reserva.cliente_telefono  
                              }  
                            </span>  

                            <a  
                              href={`https://wa.me/${telefonoWhatsAppArgentina(  
                                reserva.cliente_telefono  
                              )}`}  
                              target="_blank"  
                              rel="noopener noreferrer"  
                              className="btnWsp"  
                            >  
                              💬 WhatsApp  
                            </a>  

                          </>  

                        ) : (  

                          <span>  
                            · 📞 Sin teléfono  
                          </span>  

                        )}  

                      </div>  


                      <div  
                        className="info"  
                        style={{  
                          color: '#c084fc',  
                          fontWeight: 'bold'  
                        }}  
                      >  
                        🟣 Turno casual confirmado  
                      </div>  


                      <div className="acciones">  

                        <button  
                          className="btnPago pagado"  
                          onClick={() =>  
                            cambiarPago(  
                              reserva.id,  
                              reserva.pago_confirmado  
                            )  
                          }  
                        >  
                          🔄 Pasar a pendiente  
                        </button>  


                        {/* NUEVO: PASAR A FIJO */}  

                        <button  
                          className="btnFijo"  
                          disabled={guardando}  
                          onClick={() =>  
                            pasarCasualAFijo(  
                              reserva  
                            )  
                          }  
                        >  
                          🟡 Poner fijo  
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

                  )  
                )}  

              </div>  

            )  

          })()}  

        </>  

      )}  

    </section>  


    {/* TURNOS FIJOS */}  

    <section className="tarjeta">  

      <button  
        className="toggle"  
        onClick={() =>  
          setMostrarFijosActivos(  
            !mostrarFijosActivos  
          )  
        }  
      >  

        🔵 Turnos fijos activos (  
        {turnosFijos.length}  
        )  

        {mostrarFijosActivos  
          ? ' ▲'  
          : ' ▼'}  

      </button>  


      {mostrarFijosActivos && (  

        <>  

          <div  
            className="campo"  
            style={{  
              marginTop: '10px'  
            }}  
          >  

            <label>  
              Seleccionar Cancha  
            </label>  

            <select  
              value={canchaFijosFiltro}  
              onChange={e =>  
                setCanchaFijosFiltro(  
                  e.target.value  
                )  
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


          <div className="campo">  

            <label>  
              Día de la semana  
            </label>  

            <div  
              style={{  
                display: 'grid',  
                gridTemplateColumns:  
                  'repeat(7, 1fr)',  
                gap: '4px'  
              }}  
            >  

              {DIAS.map(d => (  

                <button  
                  key={d.numero}  
                  type="button"  
                  className={`dia ${  
                    diaFijosFiltro ===  
                    d.numero  
                      ? 'activo'  
                      : ''  
                  }`}  
                  onClick={() =>  
                    setDiaFijosFiltro(  
                      d.numero  
                    )  
                  }  
                  style={{  
                    padding:  
                      '8px 2px',  
                    fontSize:  
                      '11px'  
                  }}  
                >  

                  {d.nombre}  

                </button>  

              ))}  

            </div>  

          </div>  


          <div  
            style={{  
              marginTop: '15px'  
            }}  
          >  

            {(() => {  

              const fijosFiltrados =  
                turnosFijos.filter(t => {  

                  const coincideCancha =  
                    Number(  
                      t.cancha_id  
                    ) === Number(  
                      canchaFijosFiltro  
                    )  

                  const coincideDia =  
                    Array.isArray(  
                      t.dias_semana  
                    ) &&  
                    t.dias_semana.includes(  
                      diaFijosFiltro  
                    )  

                  return (  
                    coincideCancha &&  
                    coincideDia  
                  )  
                })  


              const diaNombreActual =  
                DIAS.find(  
                  d =>  
                    d.numero ===  
                    diaFijosFiltro  
                )?.nombre || ''  


              return (  

                <div  
                  className="grupoCancha"  
                >  

                  <h3>  

                    📅{' '}  
                    {nombreCancha(  
                      canchaFijosFiltro  
                    )}  

                    {' — '}  

                    {diaNombreActual}  

                    {' ('}  
                    {fijosFiltrados.length}  
                    {')'}  

                  </h3>  


                  {fijosFiltrados.length ===  
                    0 && (  

                    <div className="vacio">  

                      No hay turnos fijos  
                      para este día en  
                      esta cancha.  

                    </div>  

                  )}  


                  {fijosFiltrados.map(  
                    fijo => (  

                      <div  
                        className="fijo"  
                        key={fijo.id}  
                      >  

                        <strong>  

                          ⏰{' '}  
                          {fijo.hora_inicio}  

                          {' a '}  

                          {horaFinTurno(  
                            fijo  
                          )}  

                        </strong>  


                        <div  
                          className="info"  
                          style={{  
                            display:  
                              'flex',  
                            alignItems:  
                              'center',  
                            flexWrap:  
                              'wrap',  
                            gap: '4px'  
                          }}  
                        >  

                          👤{' '}  

                          <strong>  
                            Cliente:  
                          </strong>{' '}  

                          {  
                            fijo.cliente_nombre  
                          }  


                          {fijo.cliente_telefono ? (  

                            <>  

                              <span>  
                                · 📞{' '}  
                                {  
                                  fijo.cliente_telefono  
                                }  
                              </span>  

                              <a  
                                href={`https://wa.me/${telefonoWhatsAppArgentina(  
                                  fijo.cliente_telefono  
                                )}`}  
                                target="_blank"  
                                rel="noopener noreferrer"  
                                className="btnWsp"  
                              >  
                                💬 WhatsApp  
                              </a>  

                            </>  

                          ) : (  

                            <span>  
                              · 📞 Sin  
                              teléfono  
                            </span>  

                          )}  

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
                            🗑️ Eliminar  
                            turno fijo  
                          </button>  

                        </div>  

                      </div>  

                    )  
                  )}  

                </div>  

              )  

            })()}  

          </div>  

        </>  

      )}  

    </section>  

  </div>  

</main>

)
        }
