<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import Message from 'primevue/message'
import PageHeader from '@/components/PageHeader.vue'
import FormField from '@/components/FormField.vue'
import StatusTag from '@/components/StatusTag.vue'
import { practiceApi } from '@/api/practice'
import { ApiError } from '@/api/http'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { usePracticeCatalogs } from '@/composables/usePracticeCatalogs'
import type { OfficeView } from '@/types/api'

const auth = useAuthStore()
const notify = useNotify()
const catalogs = usePracticeCatalogs()

const offices = ref<OfficeView[]>([])
const loading = ref(false)
const dialog = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ code: '', name: '', location: '' })
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    offices.value = await practiceApi.offices()
  } catch (e) {
    notify.error(e, 'No se pudieron cargar los consultorios')
  } finally {
    loading.value = false
  }
}

function open(office?: OfficeView) {
  editingId.value = office?.id ?? null
  Object.assign(form, { code: office?.code ?? '', name: office?.name ?? '', location: office?.location ?? '' })
  errors.value = {}
  formError.value = ''
  dialog.value = true
}

async function save() {
  const e: Record<string, string> = {}
  if (!form.code.trim()) e.code = 'Ingrese un código'
  if (!form.name.trim()) e.name = 'Ingrese un nombre'
  errors.value = e
  if (Object.keys(e).length) return
  saving.value = true
  try {
    const body = { code: form.code.trim(), name: form.name.trim(), location: form.location.trim() || null }
    if (editingId.value) await practiceApi.updateOffice(editingId.value, body)
    else await practiceApi.createOffice(body)
    notify.success(editingId.value ? 'Consultorio actualizado' : 'Consultorio registrado')
    dialog.value = false
    await load()
    catalogs.load(true).catch(() => {})
  } catch (err) {
    if (err instanceof ApiError) {
      errors.value = err.fieldMap()
      formError.value = err.message
    } else notify.error(err)
  } finally {
    saving.value = false
  }
}

async function toggle(office: OfficeView, active: boolean) {
  try {
    const updated = await practiceApi.setOfficeActive(office.id, active)
    Object.assign(office, updated)
    notify.success(active ? 'Consultorio activado' : 'Consultorio desactivado')
    catalogs.load(true).catch(() => {})
  } catch (e) {
    notify.error(e)
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <PageHeader title="Consultorios" subtitle="Espacios donde atiende el personal clínico">
      <template #actions>
        <Button v-if="auth.can(P.officeWrite)" label="Nuevo consultorio" icon="pi pi-plus" @click="open()" />
      </template>
    </PageHeader>

    <section class="card">
      <DataTable :value="offices" :loading="loading" data-key="id" striped-rows>
        <template #empty><p class="empty">No hay consultorios registrados.</p></template>
        <Column field="code" header="Código" style="width: 8rem"><template #body="{ data }"><span class="mono">{{ data.code }}</span></template></Column>
        <Column field="name" header="Nombre" />
        <Column header="Ubicación"><template #body="{ data }">{{ data.location || '—' }}</template></Column>
        <Column header="Estado" style="width: 9rem">
          <template #body="{ data }">
            <ToggleSwitch v-if="auth.can(P.officeWrite)" :model-value="data.active" @update:model-value="(v: boolean) => toggle(data, v)"
                          v-tooltip.top="data.active ? 'Desactivar' : 'Activar'" />
            <StatusTag v-else :active="data.active" />
          </template>
        </Column>
        <Column v-if="auth.can(P.officeWrite)" style="width: 4rem">
          <template #body="{ data }"><Button icon="pi pi-pencil" text rounded aria-label="Editar" @click="open(data)" /></template>
        </Column>
      </DataTable>
    </section>

    <Dialog v-model:visible="dialog" :header="editingId ? 'Editar consultorio' : 'Nuevo consultorio'" modal :style="{ width: '28rem' }">
      <form class="dialog-form" novalidate @submit.prevent="save">
        <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>
        <FormField label="Código" for="code" required :error="errors.code" hint="Único, por ejemplo C-01">
          <InputText id="code" v-model="form.code" maxlength="20" :invalid="!!errors.code" fluid />
        </FormField>
        <FormField label="Nombre" for="name" required :error="errors.name">
          <InputText id="name" v-model="form.name" maxlength="100" :invalid="!!errors.name" fluid />
        </FormField>
        <FormField label="Ubicación" for="location">
          <InputText id="location" v-model="form.location" maxlength="255" placeholder="Planta baja, consultorio 2…" fluid />
        </FormField>
        <div class="form-actions">
          <Button type="button" label="Cancelar" severity="secondary" outlined @click="dialog = false" />
          <Button type="submit" label="Guardar" icon="pi pi-check" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<style scoped>
.dialog-form { display: flex; flex-direction: column; gap: 1rem; }
</style>
