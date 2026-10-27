/** Configuración por ambiente (Vite inyecta las variables VITE_* en tiempo de build). */
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8080',
  clientToken: (import.meta.env.VITE_CLIENT_TOKEN as string | undefined) ?? '',
}
