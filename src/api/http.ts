import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { config } from '@/config'
import type { ApiErrorBody, ErrorField } from '@/types/api'
import { tokenStorage } from './tokenStorage'

/** Error normalizado de cualquier servicio (todos comparten el formato de identity). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: ErrorField[] = [],
  ) {
    super(message)
  }

  /** Errores por campo, listos para mostrarse debajo de cada input. */
  fieldMap(): Record<string, string> {
    return Object.fromEntries(this.fields.map((f) => [f.field, f.message]))
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Verifique que el backend esté encendido.',
  401: 'Su sesión expiró. Inicie sesión nuevamente.',
  403: 'No tiene permiso para realizar esta acción.',
  404: 'El registro no existe.',
  409: 'El registro entra en conflicto con otro existente.',
  429: 'Demasiados intentos. Espere un minuto e intente de nuevo.',
  503: 'El servicio no está disponible en este momento.',
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0
    const body = error.response?.data as Partial<ApiErrorBody> | undefined
    const message = body?.error?.errorMessage || DEFAULT_MESSAGES[status] || 'Ocurrió un error inesperado.'
    return new ApiError(status, message, body?.error?.errors ?? [])
  }
  return new ApiError(0, error instanceof Error ? error.message : 'Ocurrió un error inesperado.')
}

export const http = axios.create({ baseURL: config.apiUrl, timeout: 20000 })

http.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  // El gateway exige el identificador del cliente en las rutas privadas.
  if (config.clientToken) request.headers.set('X-Client-Token', config.clientToken)
  const token = tokenStorage.accessToken()
  if (token && !request.headers.has('Authorization')) request.headers.set('Authorization', `Bearer ${token}`)
  return request
})

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean }
let refreshing: Promise<boolean> | null = null
let refreshSession: () => Promise<boolean> = async () => false
let onSessionExpired: () => void = () => {}

/** El store de autenticación registra cómo renovar el token y qué hacer si la sesión expira. */
export function configureSession(refresh: () => Promise<boolean>, expired: () => void) {
  refreshSession = refresh
  onSessionExpired = expired
}

// Un 401 intenta renovar el token una sola vez (compartido entre peticiones simultáneas) y reintenta.
http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as RetriableConfig | undefined
  const isAuthCall = original?.url?.includes('/identity/api/auth/')
  if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
    original._retried = true
    refreshing ??= refreshSession().finally(() => (refreshing = null))
    if (await refreshing) {
      original.headers = { ...original.headers, Authorization: `Bearer ${tokenStorage.accessToken()}` }
      return http(original)
    }
    onSessionExpired()
  }
  return Promise.reject(toApiError(error))
})
