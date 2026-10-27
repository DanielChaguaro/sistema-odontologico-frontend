import type { ConsentType, DayOfWeek, IdentificationType, Sex, StaffType } from '@/types/api'

export const fullName = (p: { firstNames: string; lastNames: string }) => `${p.firstNames} ${p.lastNames}`

export const initials = (text: string) =>
  text.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')

const dateFormatter = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' })

/** Fechas ISO (yyyy-mm-dd) sin conversión de zona horaria. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return dateFormatter.format(new Date(y!, m! - 1, d!))
}

export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFormatter.format(new Date(iso)) : '—')

/** Date local -> 'yyyy-mm-dd' para el backend. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** 'HH:mm:ss' del backend -> 'HH:mm'. */
export const shortTime = (time: string) => time.slice(0, 5)

export const identificationTypeLabels: Record<IdentificationType, string> = { CEDULA: 'Cédula', PASAPORTE: 'Pasaporte', OTRO: 'Otro' }
export const sexLabels: Record<Sex, string> = { MASCULINO: 'Masculino', FEMENINO: 'Femenino', OTRO: 'Otro' }
export const consentLabels: Record<ConsentType, string> = {
  TRATAMIENTO_DATOS: 'Tratamiento de datos personales',
  ATENCION_ODONTOLOGICA: 'Atención odontológica',
  NOTIFICACIONES: 'Recibir notificaciones',
}
export const staffTypeLabels: Record<StaffType, string> = {
  ODONTOLOGO: 'Odontólogo',
  ASISTENTE_DENTAL: 'Asistente dental',
  HIGIENISTA_DENTAL: 'Higienista dental',
  ADMINISTRATIVO: 'Personal administrativo',
}
export const dayLabels: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
}
export const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export const auditActionLabels: Record<string, string> = {
  CREATE: 'Registro', READ: 'Consulta', UPDATE: 'Actualización', STATUS: 'Cambio de estado', CONSENT: 'Consentimiento',
  DOCTORKYN_SYNC: 'Sincronización DoctorKyn', ODONTOGRAM_READ: 'Consulta del dentigrama', CONSULTATION_OPEN: 'Consulta abierta',
  CONSULTATION_CLOSE: 'Consulta cerrada', FINDING_ADD: 'Hallazgo registrado', FINDING_RESOLVE: 'Hallazgo resuelto',
  FINDING_ANNUL: 'Hallazgo anulado', USER_CREATED: 'Usuario creado', STATUS_CHANGED: 'Estado de cuenta',
  PROFILES_REPLACED: 'Cambio de roles', ASSIGNMENTS_REPLACED: 'Roles y permisos directos', ACCOUNT_CHANGED: 'Tipo de cuenta',
  USER_DELETED: 'Usuario eliminado', PROFILE_CREATED: 'Rol creado', PROFILE_UPDATED: 'Rol actualizado', PROFILE_DELETED: 'Rol eliminado',
  PERMISSION_CREATED: 'Permiso creado', PERMISSION_UPDATED: 'Permiso actualizado', PERMISSION_DELETED: 'Permiso eliminado',
}

/** Campos (nombres técnicos) que la bitácora reporta en las actualizaciones. */
export const patientFieldLabels: Record<string, string> = {
  identification: 'identificación', firstNames: 'nombres', lastNames: 'apellidos', birthDate: 'fecha de nacimiento', sex: 'sexo',
  phone: 'teléfono', email: 'correo', address: 'dirección', occupation: 'ocupación', emergencyContact: 'contacto de emergencia',
  allergies: 'alergias', chronicMedication: 'medicación', medicalHistory: 'antecedentes médicos', dentalHistory: 'antecedentes odontológicos',
}

const statusWords: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' }

/** Traduce el detalle técnico que guardan las bitácoras a una frase legible. */
export function describeAudit(action: string, details: string | null): string {
  if (!details) return ''
  if (action === 'UPDATE' && details.startsWith('fields=')) {
    return 'Campos: ' + details.slice(7).split(',').map((f) => patientFieldLabels[f] ?? f).join(', ')
  }
  if (action === 'CONSENT') {
    const [type, granted] = details.split('=')
    return `${consentLabels[type as ConsentType] ?? type}: ${granted === 'true' ? 'otorgado' : 'revocado'}`
  }
  if ((action === 'STATUS' || action === 'STATUS_CHANGED') && details.includes('->')) {
    return details.split('->').map((s) => statusWords[s] ?? s).join(' → ')
  }
  if (action === 'PROFILES_REPLACED') return 'Roles: ' + details.replace('->', ' → ')
  // Dentigrama: solo identificadores (nunca el hallazgo clínico); se muestran abreviados.
  if (/^(consultation|finding|fdi)=/.test(details)) {
    const words: Record<string, string> = { consultation: 'Consulta', finding: 'hallazgo', fdi: 'Pieza' }
    return details.split(',').map((part) => {
      const [key, value = ''] = part.split('=')
      return `${words[key!] ?? key} ${key === 'fdi' ? value : value.slice(0, 8) + '…'}`
    }).join(' · ')
  }
  return details.replace(/; /g, ' · ')
}
