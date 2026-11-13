import { http } from './http'
import type {
  PermissionView, ProfileView, RbacAuditView, SpringPage, TokenResponse, UserCreate, UserMe, UserStatus, UserView, UUID,
} from '@/types/api'

const base = '/identity/api'

export const identityApi = {
  login: (username: string, password: string) =>
    http.post<TokenResponse>(`${base}/auth/authenticate`, { username, password }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    http.post<TokenResponse>(`${base}/auth/refresh-token`, { refreshToken }).then((r) => r.data),
  me: () => http.get<UserMe>(`${base}/users/me`).then((r) => r.data),

  users: (page = 0, size = 20) => http.get<SpringPage<UserView>>(`${base}/users`, { params: { page, size } }).then((r) => r.data),
  user: (id: UUID) => http.get<UserView>(`${base}/users/${id}`).then((r) => r.data),
  createUser: (body: UserCreate) => http.post<UserView>(`${base}/users`, body).then((r) => r.data),
  updateUser: (id: UUID, body: { name: string; lastName: string | null }) =>
    http.put<UserView>(`${base}/users/${id}`, body).then((r) => r.data),
  setUserStatus: (id: UUID, status: UserStatus) => http.put<UserView>(`${base}/users/${id}/status`, { status }).then((r) => r.data),
  setUserProfiles: (id: UUID, profileIds: UUID[]) =>
    http.put<UserView>(`${base}/users/${id}/profiles`, { profileIds }).then((r) => r.data),

  profiles: () => http.get<SpringPage<ProfileView>>(`${base}/profiles`, { params: { size: 100 } }).then((r) => r.data.content),
  permissions: () => http.get<SpringPage<PermissionView>>(`${base}/permissions`, { params: { size: 100 } }).then((r) => r.data.content),
  rbacAudit: (targetId?: UUID, page = 0, size = 20) =>
    http.get<SpringPage<RbacAuditView>>(`${base}/rbac-audit`, { params: { targetId, page, size } }).then((r) => r.data),
}
