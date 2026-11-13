<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AutoComplete, { type AutoCompleteCompleteEvent } from 'primevue/autocomplete'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import PageHeader from '@/components/PageHeader.vue'
import FormField from '@/components/FormField.vue'
import AvailabilityPicker from '@/components/agenda/AvailabilityPicker.vue'
import { agendaApi, practiceApi } from '@/api/practice'
import { recordsApi } from '@/api/records'
import { ApiError } from '@/api/http'
import { useNotify } from '@/composables/useNotify'
import { usePracticeCatalogs } from '@/composables/usePracticeCatalogs'
import { useClearErrors } from '@/composables/useClearErrors'
import type { AppointmentType, AvailabilitySlot, PatientSummary, PractitionerSummary } from '@/types/api'
import { formatLongDay, hhmm, parseLocal } from '@/utils/agenda'
import { fromIsoDate, fullName } from '@/utils/format'

/** RF-10 / HU-05: la recepcionista (o el odontólogo) agenda una cita en un horario libre del profesional. */
const route = useRoute()
const router = useRouter()
const notify = useNotify()
const catalogs = usePracticeCatalogs()

const loading = ref(true)
const saving = ref(false)
const formError = ref('')
const errors = ref<Record<string, string>>({})
const practitioners = ref<PractitionerSummary[]>([])
const specialty = ref<string | null>(null)
const patient = ref<PatientSummary | null>(null)
const patientQuery = ref<PatientSummary | string | null>(null)
const patientSuggestions = ref<PatientSummary[]>([])
const date = ref(typeof route.query.fecha === 'string' ? fromIsoDate(route.query.fecha) : new Date())
const preferredTime = typeof route.query.hora === 'string' ? route.query.hora : null
const slot = ref<AvailabilitySlot | null>(null)

const form = reactive({
  practitionerId: (typeof route.query.profesional === 'string' ? route.query.profesional : null) as string | null,
  durationMinutes: null as number | null,
  type: 'VALORACION_INICIAL' as AppointmentType,
  reason: '',
  notes: '',
})
useClearErrors(form, errors)
watch(slot, () => delete errors.value.startAt)
watch(patient, () => delete errors.value.patientId)

const practitionerOptions = computed(() =>
  practitioners.value
    .filter((p) => !specialty.value || p.specialty === specialty.value)
    .map((p) => ({ id: p.id, label: `${fullName(p)}${p.specialty ? ' · ' + catalogs.specialtyLabel(p.specialty) : ''}` })),
)
const practitioner = computed(() => practitioners.value.find((p) => p.id === form.practitionerId) ?? null)

onMounted(async () => {
  try {
    await catalogs.load()
    // Solo odontólogos e higienistas activos atienden citas (regla de dental-practice).
    const [dentists, hygienists] = await Promise.all([
      practiceApi.practitioners({ staffType: 'ODONTOLOGO', status: 'ACTIVE', size: 100 }),
      practiceApi.practitioners({ staffType: 'HIGIENISTA_DENTAL', status: 'ACTIVE', size: 100 }),
    ])
    practitioners.value = [...dentists.content, ...hygienists.content]
    if (form.practitionerId && !practitioner.value) form.practitionerId = null
    if (!form.practitionerId && practitioners.value.length === 1) form.practitionerId = practitioners.value[0]!.id
    if (typeof route.query.paciente === 'string') patient.value = await recordsApi.get(route.query.paciente)
  } catch (e) {
    notify.error(e, 'No se pudo cargar el formulario')
  } finally {
    loading.value = false
  }
})

/** La duración por defecto es la configurada en el perfil del profesional (RF-07). */
watch(() => form.practitionerId, async (id) => {
  form.durationMinutes = null
  if (!id) return
  try {
    const p = await practiceApi.practitioner(id)
    if (form.practitionerId === id) form.durationMinutes = p.appointmentDurationMinutes
  } catch (e) {
    notify.error(e, 'No se pudo cargar el profesional')
  }
}, { immediate: true })

watch(specialty, () => {
  if (form.practitionerId && !practitionerOptions.value.some((o) => o.id === form.practitionerId)) form.practitionerId = null
})

async function searchPatients(event: AutoCompleteCompleteEvent) {
  try {
    patientSuggestions.value = (await recordsApi.search({ q: event.query.trim(), status: 'ACTIVE', size: 10 })).content
  } catch (e) {
    notify.error(e, 'No se pudo buscar pacientes')
  }
}

function choosePatient(value: PatientSummary) {
  patient.value = value
  patientQuery.value = null
}

function validate(): boolean {
  const e: Record<string, string> = {}
  if (!patient.value) e.patientId = 'Seleccione el paciente'
  if (!form.practitionerId) e.practitionerId = 'Seleccione el profesional'
  if (!slot.value) e.startAt = 'Seleccione un horario disponible'
  if (!form.reason.trim()) e.reason = 'Indique el motivo de la cita'
  errors.value = e
  return Object.keys(e).length === 0
}

async function submit() {
  formError.value = ''
  if (!validate()) {
    formError.value = 'Revise los campos marcados.'
    return
  }
  saving.value = true
  try {
    const created = await agendaApi.create({
      patientId: patient.value!.id,
      practitionerId: form.practitionerId!,
      officeId: slot.value!.officeId,
      startAt: slot.value!.startAt,
      durationMinutes: form.durationMinutes,
      type: form.type,
      reason: form.reason.trim(),
      notes: form.notes.trim() || null,
    })
    notify.success('Cita agendada', `${created.patientName} · ${formatLongDay(parseLocal(created.startAt))} ${hhmm(created.startAt)}`)
    router.push({ path: '/agenda', query: { fecha: created.startAt.slice(0, 10), profesional: created.practitionerId, cita: created.id } })
  } catch (e) {
    if (e instanceof ApiError) {
      errors.value = e.fieldMap()
      formError.value = e.message
      // El horario pudo ocuparse mientras se llenaba el formulario: se recargan los huecos.
      if (e.status === 409) date.value = new Date(date.value)
    } else notify.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="Agendar cita" subtitle="Complete la información para programar una nueva cita en la agenda clínica."
                :crumbs="[{ label: 'Agenda', to: '/agenda' }, { label: 'Agendar cita' }]" />

    <div v-if="loading" class="card"><Skeleton height="20rem" /></div>

    <form v-else class="layout" novalidate @submit.prevent="submit">
      <div class="page">
        <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>
        <Message v-if="!practitioners.length" severity="warn" :closable="false">
          No hay odontólogos activos con horario. <RouterLink to="/personal">Registre el personal clínico</RouterLink>.
        </Message>

        <section class="card">
          <h2 class="card-title"><i class="pi pi-calendar-plus" /> Información de la cita</h2>
          <div class="form-grid">
            <FormField label="Especialidad" for="specialty">
              <Select input-id="specialty" v-model="specialty" :options="catalogs.specialties.value" option-label="label" option-value="code"
                      placeholder="Todas" show-clear fluid />
            </FormField>
            <FormField label="Profesional" for="practitioner" required :error="errors.practitionerId">
              <Select input-id="practitioner" v-model="form.practitionerId" :options="practitionerOptions" option-label="label" option-value="id"
                      placeholder="Seleccione un profesional" filter :invalid="!!errors.practitionerId" fluid />
            </FormField>
            <FormField label="Paciente" for="patient" required :error="errors.patientId" class="span-2">
              <div v-if="patient" class="chosen">
                <span><strong>{{ fullName(patient) }}</strong> <span class="muted">· {{ patient.identificationNumber }} · {{ patient.age }} años</span></span>
                <Button icon="pi pi-times" text rounded size="small" aria-label="Cambiar paciente" @click="patient = null" />
              </div>
              <AutoComplete v-else v-model="patientQuery" input-id="patient" :suggestions="patientSuggestions"
                            :option-label="(p: PatientSummary) => `${fullName(p)} · ${p.identificationNumber}`"
                            placeholder="Buscar por nombre o identificación…" :min-length="2" :delay="300" :invalid="!!errors.patientId" fluid
                            @complete="searchPatients" @option-select="(e) => choosePatient(e.value)" />
            </FormField>
            <FormField label="Tipo de cita" for="type" required>
              <Select input-id="type" v-model="form.type" :options="catalogs.appointmentTypes.value" option-label="label" option-value="code" fluid />
            </FormField>
            <FormField label="Duración (min)" for="duration" :error="errors.durationMinutes" hint="Por defecto, la del profesional">
              <InputNumber input-id="duration" v-model="form.durationMinutes" :min="10" :max="240" :step="5" show-buttons fluid />
            </FormField>
            <FormField label="Motivo de la cita" for="reason" required :error="errors.reason" class="span-2">
              <InputText id="reason" v-model="form.reason" maxlength="500" placeholder="Ej.: Consulta y evaluación de dolor dental"
                         :invalid="!!errors.reason" fluid />
            </FormField>
            <FormField label="Observaciones" for="notes" class="span-2" :hint="`${form.notes.length}/1000`">
              <Textarea id="notes" v-model="form.notes" rows="3" maxlength="1000" auto-resize fluid />
            </FormField>
          </div>
        </section>
      </div>

      <aside class="side">
        <section class="card">
          <h2 class="card-title"><i class="pi pi-clock" /> Horarios disponibles</h2>
          <AvailabilityPicker v-model="slot" v-model:date="date" :practitioner-id="form.practitionerId"
                              :duration-minutes="form.durationMinutes" :preferred-time="preferredTime" />
          <small v-if="errors.startAt" class="error">{{ errors.startAt }}</small>
        </section>

        <section class="card summary">
          <h2 class="card-title"><i class="pi pi-list" /> Resumen de la cita</h2>
          <dl class="data-list">
            <div><dt>Paciente</dt><dd>{{ patient ? fullName(patient) : '—' }}</dd></div>
            <div><dt>Profesional</dt><dd>{{ practitioner ? fullName(practitioner) : '—' }}</dd></div>
            <div><dt>Fecha</dt><dd class="cap">{{ slot ? formatLongDay(parseLocal(slot.startAt)) : '—' }}</dd></div>
            <div><dt>Hora</dt><dd>{{ slot ? `${hhmm(slot.startAt)} – ${hhmm(slot.endAt)}` : '—' }}</dd></div>
            <div><dt>Consultorio</dt><dd>{{ slot?.officeName ?? '—' }}</dd></div>
            <div><dt>Tipo</dt><dd>{{ catalogs.appointmentTypeLabel(form.type) }}</dd></div>
          </dl>
          <div class="form-actions">
            <Button type="button" label="Cancelar" severity="secondary" outlined @click="router.back()" />
            <Button type="submit" label="Guardar cita" icon="pi pi-calendar-plus" :loading="saving" />
          </div>
        </section>
      </aside>
    </form>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem); gap: 1rem; align-items: start; }
.side { display: flex; flex-direction: column; gap: 1rem; }
.chosen { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.4rem 0.75rem;
  border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface-2); }
.error { color: var(--app-danger); font-size: 0.8rem; }
.cap { text-transform: capitalize; }
.summary .form-actions { margin-top: 1rem; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
</style>
