<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Button from 'primevue/button'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import OdontogramPanel from '@/components/odontogram/OdontogramPanel.vue'
import { recordsApi } from '@/api/records'
import { useNotify } from '@/composables/useNotify'
import type { PatientSummary } from '@/types/api'
import { fullName, identificationTypeLabels } from '@/utils/format'

/** Acceso directo al dentigrama desde el menú: se busca al paciente y se trabaja sobre su dentigrama. */
const route = useRoute()
const router = useRouter()
const notify = useNotify()

const patient = ref<PatientSummary | null>(null)
const selection = ref<PatientSummary | string | null>(null)
const suggestions = ref<PatientSummary[]>([])

async function search(event: AutoCompleteCompleteEvent) {
  try {
    suggestions.value = (await recordsApi.search({ q: event.query.trim(), status: 'ACTIVE', size: 10 })).content
  } catch (e) {
    notify.error(e, 'No se pudo buscar pacientes')
  }
}

function choose(value: PatientSummary) {
  router.replace({ query: { paciente: value.id } })
}

async function loadFromQuery() {
  const id = route.query.paciente
  if (typeof id !== 'string') {
    patient.value = null
    return
  }
  if (patient.value?.id === id) return
  try {
    const p = await recordsApi.get(id)
    patient.value = p
    selection.value = null
  } catch (e) {
    notify.error(e, 'No se pudo cargar el paciente')
    router.replace({ query: {} })
  }
}

watch(() => route.query.paciente, loadFromQuery)
onMounted(loadFromQuery)
</script>

<template>
  <div class="page">
    <PageHeader title="Dentigrama digital" subtitle="Estado bucal por pieza con nomenclatura FDI y comparación entre consultas." />

    <div class="card picker">
      <AutoComplete v-model="selection" :suggestions="suggestions" :option-label="(p: PatientSummary) => `${fullName(p)} · ${p.identificationNumber}`"
                    placeholder="Buscar paciente por nombre o identificación…" :min-length="2" :delay="300" fluid
                    @complete="search" @option-select="(e) => choose(e.value)">
        <template #option="{ option }">
          <div class="option">
            <strong>{{ fullName(option) }}</strong>
            <span class="muted">{{ identificationTypeLabels[option.identificationType as PatientSummary['identificationType']] }} {{ option.identificationNumber }} · {{ option.age }} años</span>
          </div>
        </template>
      </AutoComplete>
    </div>

    <template v-if="patient">
      <div class="patient-line">
        <h2>{{ fullName(patient) }}</h2>
        <StatusTag :active="patient.status === 'ACTIVE'" />
        <span class="muted">{{ identificationTypeLabels[patient.identificationType] }} {{ patient.identificationNumber }} · {{ patient.age }} años</span>
        <Button label="Ver ficha" icon="pi pi-external-link" text size="small" @click="router.push(`/pacientes/${patient.id}`)" />
      </div>
      <OdontogramPanel :key="patient.id" :patient-id="patient.id" :patient-age="patient.age" :patient-active="patient.status === 'ACTIVE'" />
    </template>
    <p v-else class="empty">Busque un paciente para abrir su dentigrama.</p>
  </div>
</template>

<style scoped>
.picker { padding: 1rem; }
.option { display: flex; flex-direction: column; }
.option .muted { font-size: 0.8rem; }
.patient-line { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; }
.patient-line h2 { font-size: 1.15rem; font-weight: 600; }
</style>
