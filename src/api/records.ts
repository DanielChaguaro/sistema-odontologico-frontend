import { http } from './http'
import type {
  AuditView, ConsentType, ConsentView, IdentificationType, PageResponse, PatientRequest, PatientStatus, PatientSummary, PatientView, UUID,
} from '@/types/api'

const base = '/records/api/patients'


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
