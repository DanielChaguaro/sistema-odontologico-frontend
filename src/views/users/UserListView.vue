<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { identityApi } from '@/api/identity'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useRoles } from '@/composables/useRoles'
import type { UserStatus, UserView } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()
const notify = useNotify()
const roles = useRoles()

const users = ref<UserView[]>([])
const loading = ref(false)
const query = ref('')
const roleFilter = ref<string | null>(null)
const statusFilter = ref<UserStatus | null>(null)
const statusOptions = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Inactivos', value: 'INACTIVE' },
]

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return users.value.filter((u) =>
    (!q || `${u.name} ${u.lastName ?? ''} ${u.userName} ${u.email}`.toLowerCase().includes(q))
    && (!roleFilter.value || u.profileIds.includes(roleFilter.value))
    && (!statusFilter.value || u.status === statusFilter.value))
})

onMounted(async () => {
  loading.value = true
  try {
    const [page] = await Promise.all([identityApi.users(0, 100), auth.can(P.profilesRead) ? roles.load() : Promise.resolve()])
    users.value = page.content
  } catch (e) {
    notify.error(e, 'No se pudieron cargar los usuarios')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <PageHeader title="Usuarios" subtitle="Cuentas del sistema, roles y estado de acceso">
      <template #actions>
        <Button v-if="auth.can(P.profilesRead)" label="Roles y permisos" icon="pi pi-shield" severity="secondary" outlined @click="router.push('/roles')" />
        <Button v-if="auth.can(P.usersManage)" label="Crear usuario" icon="pi pi-user-plus" @click="router.push('/usuarios/nuevo')" />
      </template>
    </PageHeader>

    <section class="card">
      <div class="toolbar">
        <IconField class="grow">
          <InputIcon class="pi pi-search" />
          <InputText v-model="query" placeholder="Buscar por nombre, usuario o correo" fluid />
        </IconField>
        <Select v-model="roleFilter" :options="roles.profiles.value" option-label="name" option-value="id" placeholder="Rol" show-clear class="filter" />
        <Select v-model="statusFilter" :options="statusOptions" option-label="label" option-value="value" placeholder="Estado" show-clear class="filter-sm" />
      </div>

      <DataTable :value="filtered" :loading="loading" data-key="id" paginator :rows="10" :rows-per-page-options="[10, 20, 50]"
                 row-hover striped-rows class="clickable" @row-click="(e) => router.push(`/usuarios/${e.data.id}`)">
        <template #empty><p class="empty">No hay usuarios que coincidan con los filtros.</p></template>
        <Column header="Usuario">
          <template #body="{ data }">
            <div class="link-cell">{{ data.name }} {{ data.lastName }}</div>
            <small class="muted mono">{{ data.userName }}</small>
          </template>
        </Column>
        <Column field="email" header="Correo" />
        <Column header="Roles">
          <template #body="{ data }">
            <div class="chips">
              <Tag v-if="data.userType === 'SUPER_ADMIN'" value="Administrador DoctorKyn" severity="warn" />
              <Tag v-for="id in data.profileIds" :key="id" :value="roles.profileById.value.get(id)?.name ?? 'Rol'" severity="info" />
              <span v-if="!data.profileIds.length && data.userType !== 'SUPER_ADMIN'" class="muted">Sin rol</span>
            </div>
          </template>
        </Column>
        <Column header="Estado" style="width: 7rem"><template #body="{ data }"><StatusTag :active="data.status === 'ACTIVE'" /></template></Column>
        <Column style="width: 3rem"><template #body><i class="pi pi-angle-right muted" /></template></Column>
      </DataTable>
    </section>
  </div>
</template>

<style scoped>
.filter { width: 14rem; }
.filter-sm { width: 9rem; }
.clickable :deep(tbody tr) { cursor: pointer; }
</style>
