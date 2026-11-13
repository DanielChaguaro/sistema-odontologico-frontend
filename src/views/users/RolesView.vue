<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import PageHeader from '@/components/PageHeader.vue'
import { P, permissionGroups } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useRoles } from '@/composables/useRoles'

const auth = useAuthStore()
const notify = useNotify()
const roles = useRoles()
const loading = ref(true)

/** Matriz rol × permiso agrupada por módulo (RF-08: permisos granulares por componente y operación). */
const matrix = computed(() => {
  const byCode = new Map(roles.permissions.value.map((p) => [p.code, p]))
  return permissionGroups.map((g) => ({
    title: g.title,
    rows: g.codes.map((code) => byCode.get(code)).filter((p) => !!p).map((p) => ({
      permission: p!,
      granted: roles.profiles.value.map((r) => r.permissionIds.includes(p!.id)),
    })),
  })).filter((g) => g.rows.length)
})

onMounted(async () => {
  try {
    await roles.load(auth.can(P.permissionsRead))
  } catch (e) {
    notify.error(e, 'No se pudieron cargar los roles')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <PageHeader title="Roles y permisos" subtitle="Qué puede hacer cada rol en el sistema"
                :crumbs="[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Roles y permisos' }]" />

    <div v-if="loading" class="card"><Skeleton height="16rem" /></div>
    <template v-else>
      <div class="roles">
        <section v-for="r in roles.profiles.value" :key="r.id" class="card role">
          <div class="role-head">
            <h2>{{ r.name }}</h2>
            <Tag v-if="!r.active" value="Inactivo" severity="secondary" />
          </div>
          <p class="muted">{{ r.description || 'Sin descripción' }}</p>
          <small class="mono muted">{{ r.code }} · {{ r.permissionIds.length }} permisos</small>
        </section>
      </div>

      <section v-if="auth.can(P.permissionsRead)" class="card">
        <h2 class="card-title"><i class="pi pi-table" /> Matriz de permisos</h2>
        <div class="table-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th>Permiso</th>
                <th v-for="r in roles.profiles.value" :key="r.id">{{ r.name }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="g in matrix" :key="g.title">
                <tr class="group"><td :colspan="roles.profiles.value.length + 1">{{ g.title }}</td></tr>
                <tr v-for="row in g.rows" :key="row.permission.id">
                  <td>{{ row.permission.description || row.permission.code }} <small class="mono muted">{{ row.permission.code }}</small></td>
                  <td v-for="(granted, i) in row.granted" :key="i" class="cell">
                    <i :class="granted ? 'pi pi-check-circle yes' : 'pi pi-minus no'" :aria-label="granted ? 'Sí' : 'No'" />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <p class="muted note">Los roles y su catálogo de permisos los administra el administrador de DoctorKyn. El administrador del consultorio asigna roles a los usuarios.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.role h2 { font-size: 1rem; }
.role-head { display: flex; justify-content: space-between; align-items: center; }
.role p { margin: 0.4rem 0; }
.table-wrap { overflow-x: auto; }
.matrix { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.matrix th, .matrix td { padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--app-border); text-align: left; }
.matrix th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--app-muted); }
.matrix th:not(:first-child), .cell { text-align: center; }
.matrix .group td { background: var(--app-surface-2); font-weight: 600; }
.matrix small { margin-left: 0.4rem; }
.yes { color: var(--app-success); }
.no { color: var(--app-border); }
.note { margin-bottom: 0; }
</style>
