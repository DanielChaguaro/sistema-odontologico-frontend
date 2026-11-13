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
import Tag from 'primevue/tag'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { practiceApi } from '@/api/practice'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { usePracticeCatalogs } from '@/composables/usePracticeCatalogs'
import type { PractitionerStatus, PractitionerSummary, StaffType } from '@/types/api'
import { fullName, staffTypeLabels } from '@/utils/format'

const auth = useAuthStore()
const router = useRouter()
const notify = useNotify()
const catalogs = usePracticeCatalogs()

const rows = ref<PractitionerSummary[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const size = ref(10)
const filters = ref({ q: '', staffType: null as StaffType | null, specialty: null as string | null, officeId: null as string | null,
  status: 'ACTIVE' as PractitionerStatus | null })
const statusOptions = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Inactivos', value: 'INACTIVE' },
  { label: 'Todos', value: null },
]

async function load() {
  loading.value = true
  try {
    const f = filters.value
    const result = await practiceApi.practitioners({ q: f.q.trim() || undefined, staffType: f.staffType, specialty: f.specialty,
      officeId: f.officeId, status: f.status, page: page.value, size: size.value })
    rows.value = result.content
    total.value = result.totalElements
  } catch (e) {
    notify.error(e, 'No se pudo cargar el personal')
  } finally {
    loading.value = false
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(() => filters.value.q, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { page.value = 0; load() }, 350)
})
watch(() => [filters.value.staffType, filters.value.specialty, filters.value.officeId, filters.value.status], () => { page.value = 0; load() })

function onPage(event: DataTablePageEvent) {
  page.value = event.page
  size.value = event.rows
  load()
}

onMounted(() => {
  catalogs.load().catch((e) => notify.error(e, 'No se pudieron cargar los catálogos'))
  load()
})
</script>

<template>
  <div class="page">
    <PageHeader title="Personal clínico" subtitle="Odontólogos, asistentes y personal del consultorio">
      <template #actions>
        <Button v-if="auth.can(P.practitionerWrite)" label="Registrar profesional" icon="pi pi-plus" @click="router.push('/personal/nuevo')" />
      </template>
    </PageHeader>

    <section class="card">
      <div class="toolbar">
        <IconField class="grow">
          <InputIcon class="pi pi-search" />
          <InputText v-model="filters.q" placeholder="Buscar por nombre, identificación o correo" fluid />
        </IconField>
        <Select v-model="filters.staffType" :options="catalogs.staffTypes.value" option-label="label" option-value="code" placeholder="Tipo"
                show-clear class="filter" />
        <Select v-model="filters.specialty" :options="catalogs.specialties.value" option-label="label" option-value="code" placeholder="Especialidad"
                show-clear class="filter" />
        <Select v-model="filters.officeId" :options="catalogs.offices.value" option-label="name" option-value="id" placeholder="Consultorio"
                show-clear class="filter" />
        <Select v-model="filters.status" :options="statusOptions" option-label="label" option-value="value" class="filter-sm" />
      </div>

      <DataTable :value="rows" :loading="loading" lazy paginator :rows="size" :total-records="total" :first="page * size"
                 :rows-per-page-options="[10, 20, 50]" data-key="id" row-hover striped-rows class="clickable"
                 @page="onPage" @row-click="(e) => router.push(`/personal/${e.data.id}`)">
        <template #empty><p class="empty">No hay personal que coincida con los filtros.</p></template>
        <Column header="Profesional">
          <template #body="{ data }">
            <div class="link-cell">{{ fullName(data) }}</div>
            <small class="muted">{{ data.email }}</small>
          </template>
        </Column>
        <Column header="Tipo / especialidad">
          <template #body="{ data }">
            <div>{{ staffTypeLabels[data.staffType as StaffType] }}</div>
            <small v-if="data.specialty" class="muted">{{ catalogs.specialtyLabel(data.specialty) }}</small>
          </template>
        </Column>
        <Column header="Registro profesional"><template #body="{ data }"><span class="mono">{{ data.professionalRegistration || '—' }}</span></template></Column>
        <Column header="Consultorios">
          <template #body="{ data }">
            <div class="chips"><Tag v-for="o in data.offices" :key="o.id" :value="o.code" severity="secondary" v-tooltip.top="o.name" /></div>
          </template>
        </Column>
        <Column header="Estado" style="width: 7rem"><template #body="{ data }"><StatusTag :active="data.status === 'ACTIVE'" /></template></Column>
        <Column style="width: 3rem"><template #body><i class="pi pi-angle-right muted" /></template></Column>
      </DataTable>
    </section>
  </div>
</template>

<style scoped>
.filter { width: 12rem; }
.filter-sm { width: 9rem; }
.clickable :deep(tbody tr) { cursor: pointer; }
</style>
