import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { configureSession, ApiError } from '@/api/http'
import { identityApi } from '@/api/identity'
import { tokenStorage } from '@/api/tokenStorage'
import { hasPermission } from '@/auth/permissions'
import type { UserMe } from '@/types/api'
import { initials } from '@/utils/format'

const ROLE_LABELS: Record<string, string> = {
  ADMIN_CONSULTORIO: 'Administrador del consultorio',
  ODONTOLOGO: 'Odontólogo',
  RECEPCIONISTA: 'Recepcionista',
}

export const useAuthStore = defineStore('auth', () => {
  const me = ref<UserMe | null>(null)
  const initialized = ref(false)

  const isAuthenticated = computed(() => me.value !== null)
  const isSuperAdmin = computed(() => me.value?.user.userType === 'SUPER_ADMIN')
  const permissions = computed(() => new Set(me.value?.permissions ?? []))
  const displayName = computed(() => (me.value ? `${me.value.user.name} ${me.value.user.lastName ?? ''}`.trim() : ''))
  const userInitials = computed(() => initials(displayName.value || me.value?.user.userName || '?'))
  const roleLabel = computed(() => {
    if (!me.value) return ''
    if (isSuperAdmin.value) return 'Administrador de DoctorKyn'
    return me.value.profiles.map((code) => ROLE_LABELS[code] ?? code).join(', ') || 'Sin rol asignado'
  })

  function can(code: string | string[] | undefined) {
    return hasPermission(permissions.value, isSuperAdmin.value, code)
  }

  async function loadMe() {
    try {
      me.value = await identityApi.me()
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        throw new ApiError(403, 'Su cuenta no está habilitada en el sistema odontológico. Contacte al administrador.')
      }
      throw error
    }
  }

  async function login(username: string, password: string) {
    try {
      const tokens = await identityApi.login(username.trim(), password)
      tokenStorage.save(tokens.access_token, tokens.refresh_token)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
        throw new ApiError(error.status, 'Usuario o contraseña incorrectos. Si es su primer ingreso, su contraseña temporal debe cambiarse antes.')
      }
      throw error
    }
    try {
      await loadMe()
    } catch (error) {
      logout()
      throw error
    }
  }

  async function refresh(): Promise<boolean> {
    const token = tokenStorage.refreshToken()
    if (!token) return false
    try {
      const tokens = await identityApi.refresh(token)
      tokenStorage.save(tokens.access_token, tokens.refresh_token)
      return true
    } catch {
      return false
    }
  }

  function logout() {
    tokenStorage.clear()
    me.value = null
  }

  /** Restaura la sesión al recargar la página. */
  async function init() {
    if (initialized.value) return
    initialized.value = true
    if (!tokenStorage.accessToken()) return
    try {
      await loadMe()
    } catch {
      logout()
    }
  }

  return { me, isAuthenticated, isSuperAdmin, permissions, displayName, userInitials, roleLabel, can, login, logout, refresh, loadMe, init }
})

/** Conecta el cliente HTTP con el store: renovación de token y cierre de sesión al expirar. */
export function installSessionHandling(onExpired: () => void) {
  const auth = useAuthStore()
  configureSession(auth.refresh, () => {
    auth.logout()
    onExpired()
  })
}
