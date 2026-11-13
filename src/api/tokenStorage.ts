/**
 * Tokens en sessionStorage: sobreviven a recargar la página pero se borran al cerrar la pestaña,
 * lo que limita la exposición de datos clínicos en equipos compartidos del consultorio.
 */
const ACCESS = 'dental.accessToken'
const REFRESH = 'dental.refreshToken'

export const tokenStorage = {
  accessToken: () => sessionStorage.getItem(ACCESS),
  refreshToken: () => sessionStorage.getItem(REFRESH),
  save(access: string, refresh: string) {
    sessionStorage.setItem(ACCESS, access)
    sessionStorage.setItem(REFRESH, refresh)
  },
  clear() {
    sessionStorage.removeItem(ACCESS)
    sessionStorage.removeItem(REFRESH)
  },
}
