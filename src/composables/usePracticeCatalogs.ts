import { ref } from 'vue'
import { practiceApi } from '@/api/practice'
import type { CatalogItem, OfficeView } from '@/types/api'

/** Catálogos de dental-practice compartidos por listados y formularios (se cargan una sola vez). */
const staffTypes = ref<CatalogItem[]>([])
const specialties = ref<CatalogItem[]>([])
const offices = ref<OfficeView[]>([])
let loaded: Promise<void> | null = null

export function usePracticeCatalogs() {
  function load(force = false) {
    if (!loaded || force) {
      loaded = Promise.all([practiceApi.catalogs(), practiceApi.offices().catch(() => [] as OfficeView[])])
        .then(([catalogs, officeList]) => {
          staffTypes.value = catalogs.staffTypes
          specialties.value = catalogs.specialties
          offices.value = officeList
        })
        .catch((error) => {
          loaded = null
          throw error
        })
    }
    return loaded
  }

  const specialtyLabel = (code: string | null) => (code ? (specialties.value.find((s) => s.code === code)?.label ?? code) : '')

  return { staffTypes, specialties, offices, load, specialtyLabel }
}
