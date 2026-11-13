import { computed, ref } from 'vue'
import { identityApi } from '@/api/identity'
import type { PermissionView, ProfileView } from '@/types/api'

const profiles = ref<ProfileView[]>([])
const permissions = ref<PermissionView[]>([])

/** Catálogo de roles y permisos de identity (para selects, etiquetas y vista previa de permisos). */
export function useRoles() {
  async function load(withPermissions = false) {
    const [p, perms] = await Promise.all([
      identityApi.profiles(),
      withPermissions ? identityApi.permissions().catch(() => [] as PermissionView[]) : Promise.resolve(permissions.value),
    ])
    profiles.value = p.sort((a, b) => a.name.localeCompare(b.name))
    permissions.value = perms
  }

  const profileById = computed(() => new Map(profiles.value.map((p) => [p.id, p])))
  const permissionById = computed(() => new Map(permissions.value.map((p) => [p.id, p])))
  const activeProfiles = computed(() => profiles.value.filter((p) => p.active))

  /** Permisos que otorgan los roles indicados (unión, sin duplicados). */
  function permissionsOf(profileIds: string[]): PermissionView[] {
    const ids = new Set(profileIds.flatMap((id) => profileById.value.get(id)?.permissionIds ?? []))
    return [...ids].map((id) => permissionById.value.get(id)).filter((p): p is PermissionView => !!p)
      .sort((a, b) => a.code.localeCompare(b.code))
  }

  return { profiles, permissions, activeProfiles, profileById, permissionById, load, permissionsOf }
}
