// Contratos del backend (identity, dental-records, dental-practice). Mantener alineados con los DTOs Java.

export type UUID = string

/** Paginación de los servicios odontológicos. */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Page de Spring Data (identity). */
export interface SpringPage<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ErrorField { field: string; message: string }
export interface ApiErrorBody { data: null; error: { status?: number; errorMessage: string; errors?: ErrorField[] | null } }

// ---------- identity (RF-08) ----------
export type UserStatus = 'ACTIVE' | 'INACTIVE'
export type UserType = 'SUPER_ADMIN' | 'USER' | 'SYSTEM' | 'UNDEFINED'

export interface TokenResponse { access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number }

export interface UserView {
  id: UUID
  keyCloakId: UUID
  userName: string
  email: string
  name: string
  lastName: string | null
  status: UserStatus
  userType: UserType
  profileIds: UUID[]
  permissionIds: UUID[]
}
export interface UserMe { user: UserView; profiles: string[]; permissions: string[] }
export interface UserCreate { userName: string; email: string; name: string; lastName: string; password: string; profileIds: UUID[] }
export interface ProfileView { id: UUID; code: string; name: string; description: string | null; active: boolean; permissionIds: UUID[] }
export interface PermissionView { id: UUID; code: string; description: string | null; action: string | null; active: boolean }
export interface RbacAuditView { id: UUID; actorSubject: string; action: string; targetType: string; targetId: UUID; details: string | null; createdAt: string }

// ---------- dental-records (RF-01) ----------
export type IdentificationType = 'CEDULA' | 'PASAPORTE' | 'OTRO'
export type Sex = 'MASCULINO' | 'FEMENINO' | 'OTRO'
export type PatientStatus = 'ACTIVE' | 'INACTIVE'
export type ConsentType = 'TRATAMIENTO_DATOS' | 'ATENCION_ODONTOLOGICA' | 'NOTIFICACIONES'

export interface EmergencyContact { name: string | null; phone: string | null; relationship: string | null }

export interface PatientRequest {
  identificationType: IdentificationType
  identificationNumber: string
  firstNames: string
  lastNames: string
  birthDate: string
  sex: Sex
  phone: string | null
  email: string | null
  address: string | null
  occupation: string | null
  emergencyContact: EmergencyContact | null
  allergies: string | null
  chronicMedication: string | null
  medicalHistory: string | null
  dentalHistory: string | null
}

export interface PatientSummary {
  id: UUID
  identificationType: IdentificationType
  identificationNumber: string
  firstNames: string
  lastNames: string
  birthDate: string
  age: number
  sex: Sex
  phone: string | null
  email: string | null
  status: PatientStatus
}

export interface DoctorKynData { patientRef: string; allergies: string | null; chronicMedication: string | null; medicalHistory: string | null; syncedAt: string }

export interface PatientView extends PatientSummary {
  address: string | null
  occupation: string | null
  emergencyContact: EmergencyContact | null
  allergies: string | null
  chronicMedication: string | null
  medicalHistory: string | null
  dentalHistory: string | null
  doctorKyn: DoctorKynData | null
  createdAt: string
  createdBy: string
  updatedAt: string
  lastModifiedBy: string
}

export interface ConsentView { id: UUID; type: ConsentType; granted: boolean; notes: string | null; recordedAt: string; recordedBy: string }
export interface AuditView { id: UUID; actorSubject: string; action: string; details: string | null; createdAt: string }

// ---------- dental-practice (RF-07) ----------
export type StaffType = 'ODONTOLOGO' | 'ASISTENTE_DENTAL' | 'HIGIENISTA_DENTAL' | 'ADMINISTRATIVO'
export type PractitionerStatus = 'ACTIVE' | 'INACTIVE'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface OfficeView { id: UUID; code: string; name: string; location: string | null; active: boolean }
export interface OfficeRequest { code: string; name: string; location: string | null }

export interface PractitionerRequest {
  staffType: StaffType
  identificationNumber: string
  firstNames: string
  lastNames: string
  email: string
  phone: string | null
  specialty: string | null
  professionalRegistration: string | null
  userId: UUID | null
  appointmentDurationMinutes: number | null
  officeIds: UUID[]
}

export interface PractitionerSummary {
  id: UUID
  staffType: StaffType
  identificationNumber: string
  firstNames: string
  lastNames: string
  email: string
  phone: string | null
  specialty: string | null
  professionalRegistration: string | null
  status: PractitionerStatus
  offices: OfficeView[]
}

export interface ScheduleBlockView { id: UUID; dayOfWeek: DayOfWeek; startTime: string; endTime: string; officeId: UUID; officeName: string }
export interface ScheduleBlockRequest { dayOfWeek: DayOfWeek; startTime: string; endTime: string; officeId: UUID }

export interface PractitionerView extends PractitionerSummary {
  userId: UUID | null
  appointmentDurationMinutes: number
  schedule: ScheduleBlockView[]
  createdAt: string
  createdBy: string
  updatedAt: string
  lastModifiedBy: string
}

export interface CatalogItem { code: string; label: string }
export interface Catalogs { staffTypes: CatalogItem[]; specialties: CatalogItem[] }

// ---------- dental-records: consulta y dentigrama (RF-03) ----------
export type Dentition = 'PERMANENT' | 'TEMPORARY' | 'MIXED'
export type ConsultationStatus = 'OPEN' | 'CLOSED'
export type FindingStatus = 'ACTIVE' | 'RESOLVED' | 'ANNULLED'
export type ToothSurface = 'VESTIBULAR' | 'LINGUAL' | 'MESIAL' | 'DISTAL' | 'OCLUSAL'
export type FindingScope = 'SURFACE' | 'TOOTH'
export type FindingType =
  | 'CARIES' | 'OBTURACION' | 'SELLANTE_NECESARIO' | 'SELLANTE_REALIZADO'
  | 'EXTRACCION_INDICADA' | 'PERDIDA_POR_CARIES' | 'PERDIDA_OTRA_CAUSA'
  | 'ENDODONCIA_NECESARIA' | 'ENDODONCIA_REALIZADA' | 'CORONA_NECESARIA' | 'CORONA_REALIZADA'
  | 'PROTESIS_FIJA_NECESARIA' | 'PROTESIS_FIJA_REALIZADA' | 'PROTESIS_REMOVIBLE_NECESARIA' | 'PROTESIS_REMOVIBLE_REALIZADA'

export interface ConsultationRequest { dentition: Dentition; reason: string | null; appointmentRef: UUID | null }
export interface ConsultationView {
  id: UUID
  patientId: UUID
  consultationDate: string
  practitionerRef: UUID
  practitionerName: string
  appointmentRef: UUID | null
  reason: string | null
  dentition: Dentition
  status: ConsultationStatus
  closedAt: string | null
}

export interface FindingRequest { fdiCode: number; surface: ToothSurface | null; type: FindingType; notes: string | null }
export interface FindingView {
  id: UUID
  fdiCode: number
  surface: ToothSurface | null
  type: FindingType
  scope: FindingScope
  notes: string | null
  status: FindingStatus
  consultationId: UUID
  consultationDate: string | null
  resolvedConsultationId: UUID | null
  resolvedAt: string | null
  annulReason: string | null
  createdBy: string
  createdAt: string
}
export interface OdontogramView { patientId: UUID; consultation: ConsultationView | null; findings: FindingView[] }
