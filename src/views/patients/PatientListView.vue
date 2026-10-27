<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Select from 'primevue/select'
import Button from 'primevue/button'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { recordsApi } from '@/api/records'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import type { PatientStatus, PatientSummary } from '@/types/api'
import { fullName, identificationTypeLabels, sexLabels } from '@/utils/format'

const auth = useAuthStore()
const router = useRouter()
const notify = useNotify()

const rows = ref<PatientSummary[]>([])
const total = ref(0)
const loading = ref(false)
const query = ref('')
const status = ref<PatientStatus | null>('ACTIVE')
const page = ref(0)
const size = ref(10)
const statusOptions = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Inactivos', value: 'INACTIVE' },
  { label: 'Todos', value: null },
]

async function load() {
  loading.value = true
  try {
    const result = await recordsApi.search({ q: query.value.trim() || undefined, status: status.value, page: page.value, size: size.value })
    rows.value = result.content
    total.value = result.totalElements
  } catch (e) {
    notify.error(e, 'No se pudo cargar la lista de pacientes')
  } finally {
    loading.value = false
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(query, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 0; load() }, 350)
})
watch(status, () => { page.value = 0; load() })

function onPage(event: DataTablePageEvent) {
  page.value = event.page
  size.value = event.rows
  load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <PageHeader title="Pacientes" subtitle="Gestión integral de pacientes odontológicos">
      <template #actions>
        <Button v-if="auth.can(P.patientWrite)" label="Nuevo paciente" icon="pi pi-user-plus" @click="router.push('/pacientes/nuevo')" />
      </template>
    </PageHeader>

    <section class="card">
      <div class="toolbar">
        <IconField class="grow">
          <InputIcon class="pi pi-search" />
          <InputText v-model="query" placeholder="Buscar por nombre, apellido o identificación" fluid />
        </IconField>
        <Select v-model="status" :options="statusOptions" option-label="label" option-value="value" class="status-filter" />
      </div>

      <DataTable :value="rows" :loading="loading" lazy paginator :rows="size" :total-records="total" :first="page * size"
                 :rows-per-page-options="[10, 20, 50]" data-key="id" row-hover striped-rows
                 class="clickable" @page="onPage" @row-click="(e) => router.push(`/pacientes/${e.data.id}`)">
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users" />
            <p>{{ query ? 'No hay pacientes que coincidan con la búsqueda.' : 'Todavía no hay pacientes registrados.' }}</p>
          </div>
        </template>
        <Column header="Paciente">
          <template #body="{ data }">
            <div class="link-cell">{{ fullName(data) }}</div>
            <small class="muted">{{ identificationTypeLabels[data.identificationType as keyof typeof identificationTypeLabels] }} {{ data.identificationNumber }}</small>
          </template>
        </Column>
        <Column header="Edad" style="width: 6rem"><template #body="{ data }">{{ data.age }} años</template></Column>
        <Column header="Sexo" style="width: 8rem"><template #body="{ data }">{{ sexLabels[data.sex as keyof typeof sexLabels] }}</template></Column>
        <Column header="Contacto">
          <template #body="{ data }">
            <div v-if="data.phone"><i class="pi pi-phone muted" /> {{ data.phone }}</div>
            <div v-if="data.email" class="muted"><i class="pi pi-envelope" /> {{ data.email }}</div>
          </template>
        </Column>
        <Column header="Estado" style="width: 7rem"><template #body="{ data }"><StatusTag :active="data.status === 'ACTIVE'" /></template></Column>
        <Column style="width: 3rem"><template #body><i class="pi pi-angle-right muted" /></template></Column>
      </DataTable>
    </section>
  </div>
</template>

<style scoped>
.status-filter { width: 10rem; }
.clickable :deep(tbody tr) { cursor: pointer; }
.empty-state { text-align: center; padding: 2rem; color: var(--app-muted); }
.empty-state .pi { font-size: 1.8rem; }
</style>
