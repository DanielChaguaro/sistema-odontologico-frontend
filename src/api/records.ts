import { http } from './http'
import type {
  AuditView, ConsentType, ConsentView, ConsultationRequest, ConsultationView, FindingRequest, FindingView, IdentificationType, OdontogramView,
  PageResponse, PatientRequest, PatientStatus, PatientSummary, PatientView, UUID,
} from '@/types/api'

const base = '/records/api/patients'

/** RF-03: consultas del paciente y dentigrama registrado en ellas. */
export const odontogramApi = {
  consultations: (patientId: UUID) => http.get<ConsultationView[]>(`${base}/${patientId}/consultations`).then((r) => r.data),
  openConsultation: (patientId: UUID, body: ConsultationRequest) =>
    http.post<ConsultationView>(`${base}/${patientId}/consultations`, body).then((r) => r.data),
  closeConsultation: (patientId: UUID, consultationId: UUID) =>
    http.post<ConsultationView>(`${base}/${patientId}/consultations/${consultationId}/close`).then((r) => r.data),
  odontogram: (patientId: UUID, consultationId?: UUID | null) =>
    http.get<OdontogramView>(`${base}/${patientId}/odontogram`, { params: { consultationId: consultationId ?? undefined } }).then((r) => r.data),
  toothHistory: (patientId: UUID, fdiCode: number) =>
    http.get<FindingView[]>(`${base}/${patientId}/odontogram/teeth/${fdiCode}`).then((r) => r.data),
  addFinding: (patientId: UUID, consultationId: UUID, body: FindingRequest) =>
    http.post<FindingView>(`${base}/${patientId}/consultations/${consultationId}/findings`, body).then((r) => r.data),
  resolveFinding: (patientId: UUID, consultationId: UUID, findingId: UUID) =>
    http.post<FindingView>(`${base}/${patientId}/consultations/${consultationId}/findings/${findingId}/resolve`).then((r) => r.data),
  annulFinding: (patientId: UUID, consultationId: UUID, findingId: UUID, reason: string) =>
    http.post<FindingView>(`${base}/${patientId}/consultations/${consultationId}/findings/${findingId}/annul`, { reason }).then((r) => r.data),
}

export const recordsApi = {
  search: (params: { q?: string; status?: PatientStatus | null; page?: number; size?: number }) =>
    http.get<PageResponse<PatientSummary>>(base, { params }).then((r) => r.data),
  lookup: (identificationType: IdentificationType, identificationNumber: string) =>
    http.get<PatientSummary>(`${base}/lookup`, { params: { identificationType, identificationNumber } }).then((r) => r.data),
  get: (id: UUID) => http.get<PatientView>(`${base}/${id}`).then((r) => r.data),
  create: (body: PatientRequest) => http.post<PatientView>(base, body).then((r) => r.data),
  update: (id: UUID, body: PatientRequest) => http.put<PatientView>(`${base}/${id}`, body).then((r) => r.data),
  setStatus: (id: UUID, status: PatientStatus) => http.patch<PatientView>(`${base}/${id}/status`, { status }).then((r) => r.data),
  syncDoctorKyn: (id: UUID) => http.post<PatientView>(`${base}/${id}/doctorkyn-sync`).then((r) => r.data),
  consents: (id: UUID) => http.get<ConsentView[]>(`${base}/${id}/consents`).then((r) => r.data),
  addConsent: (id: UUID, body: { type: ConsentType; granted: boolean; notes: string | null }) =>
    http.post<ConsentView>(`${base}/${id}/consents`, body).then((r) => r.data),
  audit: (id: UUID, page = 0, size = 20) =>
    http.get<PageResponse<AuditView>>(`${base}/${id}/audit`, { params: { page, size } }).then((r) => r.data),
}
