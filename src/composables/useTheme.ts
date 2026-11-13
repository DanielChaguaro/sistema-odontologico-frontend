import { computed, ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

const KEY = 'dental.theme'
const mode = ref<ThemeMode>('dark')

/** Preferencia por equipo (no es dato clínico): el almacenamiento puede no estar disponible. */
function stored(): ThemeMode | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

function apply(next: ThemeMode) {
  mode.value = next
  document.documentElement.classList.toggle('app-dark', next === 'dark')
}

/** Se llama antes de montar la app para no mostrar un destello del tema equivocado. Oscuro por defecto. */
export function initTheme() {
  apply(stored() ?? 'dark')
}

export function useTheme() {
  return {
    mode,
    isDark: computed(() => mode.value === 'dark'),
    toggle() {
      const next = mode.value === 'dark' ? 'light' : 'dark'
      apply(next)
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // Sin almacenamiento: el cambio dura hasta recargar.
      }
    },
  }
}
