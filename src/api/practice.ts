import { http } from './http'
import type {
  Catalogs, OfficeRequest, OfficeView, PageResponse, PractitionerRequest, PractitionerStatus, PractitionerSummary, PractitionerView,
  ScheduleBlockRequest, ScheduleBlockView, StaffType, UUID,
} from '@/types/api'

const base = '/practice/api'

export const practiceApi = {
  catalogs: () => http.get<Catalogs>(`${base}/catalogs`).then((r) => r.data),

  offices: (active?: boolean) =>
    http.get<PageResponse<OfficeView>>(`${base}/offices`, { params: { active, size: 100 } }).then((r) => r.data.content),
  createOffice: (body: OfficeRequest) => http.post<OfficeView>(`${base}/offices`, body).then((r) => r.data),
  updateOffice: (id: UUID, body: OfficeRequest) => http.put<OfficeView>(`${base}/offices/${id}`, body).then((r) => r.data),
  setOfficeActive: (id: UUID, active: boolean) => http.patch<OfficeView>(`${base}/offices/${id}/active`, { active }).then((r) => r.data),

  practitioners: (params: { q?: string; staffType?: StaffType | null; specialty?: string | null; officeId?: UUID | null;
    status?: PractitionerStatus | null; page?: number; size?: number }) =>
    http.get<PageResponse<PractitionerSummary>>(`${base}/practitioners`, { params }).then((r) => r.data),
  practitioner: (id: UUID) => http.get<PractitionerView>(`${base}/practitioners/${id}`).then((r) => r.data),
  me: () => http.get<PractitionerView>(`${base}/practitioners/me`).then((r) => r.data),
  createPractitioner: (body: PractitionerRequest) => http.post<PractitionerView>(`${base}/practitioners`, body).then((r) => r.data),
  updatePractitioner: (id: UUID, body: PractitionerRequest) =>
    http.put<PractitionerView>(`${base}/practitioners/${id}`, body).then((r) => r.data),
  setPractitionerStatus: (id: UUID, status: PractitionerStatus) =>
    http.patch<PractitionerView>(`${base}/practitioners/${id}/status`, { status }).then((r) => r.data),
  replaceSchedule: (id: UUID, blocks: ScheduleBlockRequest[]) =>
    http.put<ScheduleBlockView[]>(`${base}/practitioners/${id}/schedule`, { blocks }).then((r) => r.data),
}
