<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import FormField from '@/components/FormField.vue'
import AvailabilityPicker from '@/components/agenda/AvailabilityPicker.vue'
import { agendaApi } from '@/api/practice'
import { ApiError } from '@/api/http'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { usePracticeCatalogs } from '@/composables/usePracticeCatalogs'
import type { AppointmentHistoryView, AppointmentType, AppointmentView, AvailabilitySlot, UUID } from '@/types/api'
import { appointmentActionLabels, appointmentStatusLabels, appointmentStatusSeverity, formatLongDay, hhmm, parseLocal } from '@/utils/agenda'
import { formatDateTime } from '@/utils/format'

/** Detalle de una cita con sus acciones (RF-10): reprogramar, cancelar, editar el motivo y cerrar la atención. */
const props = defineProps<{ appointmentId: UUID | null }>()
const emit = defineEmits<{ changed: [AppointmentView]; close: [] }>()

const auth = useAuthStore()
const router = useRouter()
const notify = useNotify()
const catalogs = usePracticeCatalogs()

type Mode = 'view' | 'reschedule' | 'cancel' | 'edit'
const mode = ref<Mode>('view')
const appointment = ref<AppointmentView | null>(null)
const history = ref<AppointmentHistoryView[]>([])
const busy = ref(false)
const error = ref('')
const rescheduleDate = ref(new Date())
const rescheduleSlot = ref<AvailabilitySlot | null>(null)
const rescheduleReason = ref('')
const cancelReason = ref('')
const edit = ref({ type: 'CONTROL' as AppointmentType, reason: '', notes: '' })

const visible = computed({ get: () => !!props.appointmentId, set: (open) => !open && emit('close') })
const canWrite = computed(() => auth.can(P.appointmentWrite) && appointment.value?.status === 'CONFIRMED')
const started = computed(() => !!appointment.value && parseLocal(appointment.value.startAt) <= new Date())
const headerTitle = computed(() => ({ view: 'Detalle de la cita', reschedule: 'Reprogramar cita', cancel: 'Cancelar cita', edit: 'Editar cita' })[mode.value])

watch(() => props.appointmentId, async (id) => {
  mode.value = 'view'
  error.value = ''
  appointment.value = null
  history.value = []
  if (!id) return
  try {
    const [a, h] = await Promise.all([agendaApi.appointment(id), agendaApi.history(id)])
    appointment.value = a
    history.value = h
  } catch (e) {
    notify.error(e, 'No se pudo cargar la cita')
    emit('close')
  }
}, { immediate: true })

function start(next: Mode) {
  error.value = ''
  const a = appointment.value!
  if (next === 'reschedule') {
    rescheduleDate.value = parseLocal(a.startAt) > new Date() ? parseLocal(a.startAt) : new Date()
    rescheduleSlot.value = null
    rescheduleReason.value = ''
  }
  if (next === 'cancel') cancelReason.value = ''
  if (next === 'edit') edit.value = { type: a.type, reason: a.reason, notes: a.notes ?? '' }
  mode.value = next
}

async function run(action: () => Promise<AppointmentView>, success: string) {
  busy.value = true
  error.value = ''
  try {
    const updated = await action()
    appointment.value = updated
    history.value = await agendaApi.history(updated.id)
    mode.value = 'view'
    notify.success(success, updated.patientName)
    emit('changed', updated)
  } catch (e) {
    if (e instanceof ApiError) error.value = e.message
    else notify.error(e)
    // Un conflicto de horario deja la lista de huecos desactualizada: se recarga.
    if (mode.value === 'reschedule') rescheduleDate.value = new Date(rescheduleDate.value)
  } finally {
    busy.value = false
  }
}

const a = () => appointment.value!
function reschedule() {
  if (!rescheduleSlot.value) return (error.value = 'Seleccione el nuevo horario')
  run(() => agendaApi.reschedule(a().id, { startAt: rescheduleSlot.value!.startAt, durationMinutes: a().durationMinutes,
    officeId: rescheduleSlot.value!.officeId, reason: rescheduleReason.value.trim() || null }), 'Cita reprogramada')
}
function cancel() {
  if (!cancelReason.value.trim()) return (error.value = 'Indique el motivo de la cancelación')
  run(() => agendaApi.cancel(a().id, cancelReason.value.trim()), 'Cita cancelada')
}
function saveDetails() {
  if (!edit.value.reason.trim()) return (error.value = 'Indique el motivo de la cita')
  run(() => agendaApi.updateDetails(a().id, { type: edit.value.type, reason: edit.value.reason.trim(), notes: edit.value.notes.trim() || null }),
    'Cita actualizada')
}
const complete = () => run(() => agendaApi.complete(a().id), 'Cita marcada como atendida')
const noShow = () => run(() => agendaApi.noShow(a().id), 'Inasistencia registrada')
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="headerTitle" :style="{ width: '40rem' }" :breakpoints="{ '720px': '95vw' }" :draggable="false">
    <Skeleton v-if="!appointment" height="16rem" />

    <div v-else class="body">
      <div class="head">
        <div>
          <h3>{{ appointment.patientName }}</h3>
          <span class="muted">{{ appointment.patientIdentification }}</span>
        </div>
        <Tag :value="appointmentStatusLabels[appointment.status]" :severity="appointmentStatusSeverity[appointment.status]" rounded />
      </div>

      <p v-if="error" class="error-box"><i class="pi pi-exclamation-circle" /> {{ error }}</p>

      <template v-if="mode === 'view'">
        <dl class="data-list">
          <div><dt>Fecha</dt><dd class="cap">{{ formatLongDay(parseLocal(appointment.startAt)) }}</dd></div>
          <div><dt>Hora</dt><dd>{{ hhmm(appointment.startAt) }} – {{ hhmm(appointment.endAt) }} ({{ appointment.durationMinutes }} min)</dd></div>
          <div><dt>Profesional</dt><dd>{{ appointment.practitionerName }}</dd></div>
          <div><dt>Consultorio</dt><dd>{{ appointment.officeName }}</dd></div>
          <div><dt>Tipo</dt><dd>{{ catalogs.appointmentTypeLabel(appointment.type) }}</dd></div>
          <div><dt>Motivo</dt><dd>{{ appointment.reason }}</dd></div>
          <div v-if="appointment.notes" class="wide"><dt>Observaciones</dt><dd>{{ appointment.notes }}</dd></div>
          <div v-if="appointment.cancellationReason" class="wide"><dt>Motivo de cancelación</dt><dd>{{ appointment.cancellationReason }}</dd></div>
        </dl>

        <h4 class="section">Historial</h4>
        <ol class="timeline">
          <li v-for="h in history" :key="h.id">
            <strong>{{ appointmentActionLabels[h.action] }}</strong>
            <span class="muted"> · {{ formatDateTime(h.createdAt) }} · {{ h.actorName }}</span>
            <div v-if="h.details" class="muted small">{{ h.details }}</div>
          </li>
        </ol>
      </template>

      <template v-else-if="mode === 'reschedule'">
        <p class="muted small">Se mantiene el profesional y la duración ({{ appointment.durationMinutes }} min). Para cambiar de profesional, cancele y agende otra cita.</p>
        <AvailabilityPicker v-model="rescheduleSlot" v-model:date="rescheduleDate" :practitioner-id="appointment.practitionerId"
                            :duration-minutes="appointment.durationMinutes" />
        <FormField label="Motivo del cambio" for="rs-reason">
          <InputText id="rs-reason" v-model="rescheduleReason" maxlength="400" placeholder="Opcional" fluid />
        </FormField>
      </template>

      <template v-else-if="mode === 'cancel'">
        <FormField label="Motivo de la cancelación" for="cancel-reason" required>
          <Textarea id="cancel-reason" v-model="cancelReason" rows="3" maxlength="500" auto-resize fluid />
        </FormField>
      </template>

      <template v-else>
        <div class="form-grid">
          <FormField label="Tipo de cita" for="ed-type" required>
            <Select input-id="ed-type" v-model="edit.type" :options="catalogs.appointmentTypes.value" option-label="label" option-value="code" fluid />
          </FormField>
          <FormField label="Motivo" for="ed-reason" required class="span-2">
            <InputText id="ed-reason" v-model="edit.reason" maxlength="500" fluid />
          </FormField>
          <FormField label="Observaciones" for="ed-notes" class="span-2">
            <Textarea id="ed-notes" v-model="edit.notes" rows="3" maxlength="1000" auto-resize fluid />
          </FormField>
        </div>
      </template>
    </div>

    <template #footer>
      <div v-if="appointment && mode === 'view'" class="footer">
        <Button v-if="auth.can(P.odontogramRead)" label="Dentigrama" icon="pi pi-th-large" text
                @click="router.push({ path: '/dentigrama', query: { paciente: appointment.patientId } })" />
        <Button v-if="auth.can(P.patientRead)" label="Ficha" icon="pi pi-user" text @click="router.push(`/pacientes/${appointment.patientId}`)" />
        <span class="spacer" />
        <template v-if="canWrite">
          <template v-if="started">
            <Button label="No asistió" severity="warn" outlined :loading="busy" @click="noShow" />
            <Button label="Atendida" icon="pi pi-check" :loading="busy" @click="complete" />
          </template>
          <Button label="Editar" icon="pi pi-pencil" severity="secondary" outlined @click="start('edit')" />
          <Button label="Cancelar cita" icon="pi pi-times" severity="danger" outlined @click="start('cancel')" />
          <Button label="Reprogramar" icon="pi pi-calendar" @click="start('reschedule')" />
        </template>
      </div>
      <div v-else-if="appointment" class="footer">
        <span class="spacer" />
        <Button label="Volver" severity="secondary" outlined @click="mode = 'view'; error = ''" />
        <Button v-if="mode === 'reschedule'" label="Confirmar nuevo horario" icon="pi pi-check" :loading="busy" @click="reschedule" />
        <Button v-else-if="mode === 'cancel'" label="Cancelar cita" icon="pi pi-times" severity="danger" :loading="busy" @click="cancel" />
        <Button v-else label="Guardar" icon="pi pi-check" :loading="busy" @click="saveDetails" />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.body { display: flex; flex-direction: column; gap: 1rem; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.head h3 { font-size: 1.1rem; font-weight: 600; margin: 0; }
.data-list .wide { grid-column: 1 / -1; }
.cap { text-transform: capitalize; }
.section { font-size: 0.85rem; font-weight: 600; margin: 0; }
.timeline { list-style: none; margin: 0; padding: 0 0 0 1rem; border-left: 2px solid var(--app-border); display: flex; flex-direction: column; gap: 0.6rem; }
.timeline li { font-size: 0.875rem; position: relative; }
.timeline li::before { content: ''; position: absolute; left: calc(-1rem - 5px); top: 0.4rem; width: 8px; height: 8px; border-radius: 50%; background: var(--app-primary); }
.small { font-size: 0.8rem; }
.error-box { margin: 0; padding: 0.6rem 0.75rem; border-radius: 10px; color: var(--app-danger); border: 1px solid var(--app-danger); font-size: 0.875rem; }
.footer { display: flex; flex-wrap: wrap; gap: 0.5rem; width: 100%; align-items: center; }
.spacer { flex: 1; }
</style>
