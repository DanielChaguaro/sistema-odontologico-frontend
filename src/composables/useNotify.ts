import { useToast } from 'primevue/usetoast'
import { toApiError } from '@/api/http'

/** Avisos consistentes; los errores del backend se muestran con su mensaje en español. */
export function useNotify() {
  const toast = useToast()
  return {
    success: (summary: string, detail?: string) => toast.add({ severity: 'success', summary, detail, life: 3500 }),
    info: (summary: string, detail?: string) => toast.add({ severity: 'info', summary, detail, life: 4500 }),
    error: (error: unknown, summary = 'No se pudo completar la operación') => {
      const apiError = toApiError(error)
      toast.add({ severity: 'error', summary, detail: apiError.message, life: 6000 })
      return apiError
    },
  }
}
