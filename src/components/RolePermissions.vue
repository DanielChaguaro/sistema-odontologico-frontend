<script setup lang="ts">
import { computed } from 'vue'
import { permissionGroups } from '@/auth/permissions'
import type { PermissionView } from '@/types/api'

/** Vista previa de los permisos que otorga una selección de roles, agrupados por módulo. */
const props = defineProps<{ permissions: PermissionView[] }>()

const groups = computed(() => {
  const byCode = new Map(props.permissions.map((p) => [p.code, p]))
  const known = new Set(permissionGroups.flatMap((g) => g.codes as string[]))
  const result = permissionGroups
    .map((g) => ({ title: g.title, items: g.codes.map((c) => byCode.get(c)).filter((p): p is PermissionView => !!p) }))
    .filter((g) => g.items.length)
  const others = props.permissions.filter((p) => !known.has(p.code))
  if (others.length) result.push({ title: 'Otros', items: others })
  return result
})
</script>

<template>
  <div v-if="groups.length" class="groups">
    <div v-for="g in groups" :key="g.title">
      <h4>{{ g.title }}</h4>
      <ul>
        <li v-for="p in g.items" :key="p.id"><i class="pi pi-check-circle" /> {{ p.description || p.code }}</li>
      </ul>
    </div>
  </div>
  <p v-else class="empty">Seleccione un rol para ver los permisos que otorga.</p>
</template>

<style scoped>
.groups { display: flex; flex-direction: column; gap: 0.75rem; }
h4 { margin: 0 0 0.3rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--app-muted); }
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
li { font-size: 0.85rem; display: flex; gap: 0.45rem; align-items: baseline; }
li .pi { color: var(--app-success); font-size: 0.85rem; }
</style>
