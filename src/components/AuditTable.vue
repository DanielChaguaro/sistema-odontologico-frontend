<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import { identityApi } from '@/api/identity'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { auditActionLabels, describeAudit, formatDateTime } from '@/utils/format'

/** Bitácora paginada; resuelve el sujeto del token a nombre de usuario cuando se puede leer usuarios. */
const props = defineProps<{
  fetch: (page: number, size: number) => Promise<{ content: { id: string; actorSubject: string; action: string; details: string | null; createdAt: string }[]; totalElements: number }>
}>()

const auth = useAuthStore()
const notify = useNotify()
const rows = ref<Awaited<ReturnType<typeof props.fetch>>['content']>([])
const total = ref(0)
const loading = ref(false)
const page = ref(0)
const size = ref(10)
const actors = ref<Record<string, string>>({})

async function load() {
  loading.value = true
  try {
    const result = await props.fetch(page.value, size.value)
    rows.value = result.content
    total.value = result.totalElements
  } catch (e) {
    notify.error(e, 'No se pudo cargar la bitácora')
  } finally {
    loading.value = false
  }
}

async function loadActors() {
  if (!auth.can(P.usersRead)) return
  try {
    const users = await identityApi.users(0, 100)
    actors.value = Object.fromEntries(users.content.map((u) => [u.keyCloakId, `${u.name} ${u.lastName ?? ''}`.trim() || u.userName]))
  } catch {
    actors.value = {}
  }
}

const actorName = (subject: string) => actors.value[subject] ?? (subject === 'system' ? 'Sistema' : subject.slice(0, 8) + '…')

function onPage(event: DataTablePageEvent) {
  page.value = event.page
  size.value = event.rows
  load()
}

onMounted(() => Promise.all([load(), loadActors()]))
defineExpose({ reload: load })
</script>

<template>
  <DataTable :value="rows" :loading="loading" lazy paginator :rows="size" :total-records="total" :first="page * size" data-key="id"
             :rows-per-page-options="[10, 20, 50]" size="small" @page="onPage">
    <template #empty><p class="empty">Sin registros en la bitácora.</p></template>
    <Column header="Fecha" style="width: 13rem"><template #body="{ data }">{{ formatDateTime(data.createdAt) }}</template></Column>
    <Column header="Acción" style="width: 13rem">
      <template #body="{ data }"><Tag :value="auditActionLabels[data.action] ?? data.action" severity="secondary" /></template>
    </Column>
    <Column header="Usuario"><template #body="{ data }">{{ actorName(data.actorSubject) }}</template></Column>
    <Column header="Detalle"><template #body="{ data }"><span class="muted">{{ describeAudit(data.action, data.details) }}</span></template></Column>
  </DataTable>
</template>
