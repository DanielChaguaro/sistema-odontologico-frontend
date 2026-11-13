import type { AppointmentAction, AppointmentStatus, DayOfWeek } from '@/types/api'
import { toIsoDate } from './format'

/** RF-10: utilidades de la agenda. Las fechas-hora del backend son locales del consultorio (sin zona). */

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada', COMPLETED: 'Atendida', CANCELLED: 'Cancelada', NO_SHOW: 'No asistió',
}
export const appointmentStatusSeverity: Record<AppointmentStatus, 'info' | 'success' | 'secondary' | 'warn'> = {
  CONFIRMED: 'info', COMPLETED: 'success', CANCELLED: 'secondary', NO_SHOW: 'warn',
}
export const appointmentActionLabels: Record<AppointmentAction, string> = {
  CREATED: 'Cita agendada', RESCHEDULED: 'Reprogramada', UPDATED: 'Detalle actualizado', CANCELLED: 'Cancelada',
  COMPLETED: 'Marcada como atendida', NO_SHOW: 'Paciente no asistió',
}

const WEEK: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
export const dayOfWeek = (date: Date): DayOfWeek => WEEK[date.getDay()]!

const pad = (n: number) => String(n).padStart(2, '0')

/** 'yyyy-mm-ddTHH:mm[:ss]' -> Date local, sin conversión de zona horaria. */
export function parseLocal(iso: string): Date {
  const [datePart, timePart = '00:00:00'] = iso.split('T')
  const [y, m, d] = datePart!.split('-').map(Number)
  const [h, min, s] = timePart.split(':').map(Number)
  return new Date(y!, m! - 1, d!, h ?? 0, min ?? 0, s ?? 0)
}

/** Date local -> 'yyyy-mm-ddTHH:mm:00' para el backend. */
export const toLocalIso = (date: Date) => `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`

/** 'yyyy-mm-ddTHH:mm:ss' -> 'HH:mm'. */
export const hhmm = (iso: string) => iso.slice(11, 16)

/** Minutos desde la medianoche de una fecha-hora local. */
export const minutesOfDay = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16))

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

/** Lunes de la semana de la fecha (la agenda empieza en lunes, como el horario semanal). */
export const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7))

export const sameDay = (a: Date, b: Date) => toIsoDate(a) === toIsoDate(b)

/** Seis semanas completas (lunes a domingo) que cubren el mes de la fecha. */
export function monthGrid(date: Date): Date[] {
  const first = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1))
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

export interface Placed<T> { item: T; lane: number; lanes: number }

/**
 * Reparte las citas de un día en carriles para que las simultáneas (de distintos profesionales)
 * se muestren lado a lado. Cada grupo de citas encadenadas comparte el mismo número de carriles.
 */
export function layoutDay<T extends { startAt: string; endAt: string }>(items: T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.startAt.localeCompare(b.startAt) || b.endAt.localeCompare(a.endAt))
  const placed: Placed<T>[] = []
  let cluster: Placed<T>[] = []
  let laneEnds: string[] = []
  let clusterEnd = ''
  const flush = () => {
    cluster.forEach((p) => (p.lanes = laneEnds.length))
    cluster = []
    laneEnds = []
  }
  for (const item of sorted) {
    if (cluster.length && item.startAt >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= item.startAt)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.endAt)
    } else laneEnds[lane] = item.endAt
    const entry = { item, lane, lanes: 1 }
    cluster.push(entry)
    placed.push(entry)
    if (cluster.length === 1 || item.endAt > clusterEnd) clusterEnd = item.endAt
  }
  flush()
  return placed
}

const rangeDay = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short' })
const longDay = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const monthYear = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' })

export const formatLongDay = (date: Date) => longDay.format(date)
export const formatMonth = (date: Date) => monthYear.format(date)
export const formatRange = (from: Date, to: Date) => `${rangeDay.format(from)} – ${rangeDay.format(to)} ${to.getFullYear()}`
