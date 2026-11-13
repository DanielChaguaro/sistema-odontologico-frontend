import { watch, type Ref } from 'vue'

/**
 * Borra el error de un campo apenas el usuario lo modifica, para que no queden mensajes viejos.
 * `related` limpia además errores que dependen de otro campo (p. ej. "teléfono o correo").
 */
export function useClearErrors<T extends object>(form: T, errors: Ref<Record<string, string>>, related: Partial<Record<keyof T, string[]>> = {}) {
  let previous = { ...form }
  watch(
    () => ({ ...form }),
    (current) => {
      for (const key of Object.keys(current) as (keyof T)[]) {
        if (current[key] === previous[key]) continue
        delete errors.value[key as string]
        related[key]?.forEach((other) => delete errors.value[other])
      }
      previous = current
    },
  )
}
