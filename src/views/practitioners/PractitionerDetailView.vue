<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { practiceApi } from '@/api/practice'
import { identityApi } from '@/api/identity'
import { ApiError } from '@/api/http'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { usePracticeCatalogs } from '@/composables/usePracticeCatalogs'
import type { DayOfWeek, PractitionerView } from '@/types/api'
import { DAYS, dayLabels, formatDateTime, fullName, shortTime, staffTypeLabels } from '@/utils/format'

interface EditableBlock { dayOfWeek: DayOfWeek; startTime: string; endTime: string; officeId: string }

const props = defineProps<{ id: string }>()
const auth = useAuthStore()
const router = useRouter()
const confirm = useConfirm()
const notify = useNotify()
const catalogs = usePracticeCatalogs()

const practitioner = ref<PractitionerView | null>(null)
const linkedUser = ref<string | null>(null)
const editing = ref(false)
const blocks = ref<EditableBlock[]>([])
const scheduleError = ref('')
const saving = ref(false)

const isActive = computed(() => practitioner.value?.status === 'ACTIVE')
const dayOptions = DAYS.map((d) => ({ value: d, label: dayLabels[d] }))
const officeOptions = computed(() => practitioner.value?.offices.filter((o) => o.active) ?? [])
const byDay = computed(() => DAYS.map((day) => ({ day, blocks: practitioner.value?.schedule.filter((b) => b.dayOfWeek === day) ?? [] })))
const weeklyHours = computed(() =>
  (practitioner.value?.schedule ?? []).reduce((acc, b) => acc + (minutes(b.endTime) - minutes(b.startTime)) / 60, 0),
)

function minutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

async function load() {
  try {
    const [p] = await Promise.all([practiceApi.practitioner(props.id), catalogs.load()])
    practitioner.value = p
    if (p.userId && auth.can(P.usersRead)) {
      identityApi.user(p.userId).then((u) => (linkedUser.value = `${u.name} ${u.lastName ?? ''} · ${u.userName}`)).catch(() => {})
    }
  } catch (e) {
    notify.error(e, 'No se pudo cargar el profesional')
    router.replace('/personal')
  }
}

function startEditing() {
  blocks.value = (practitioner.value?.schedule ?? []).map((b) => ({
    dayOfWeek: b.dayOfWeek, startTime: shortTime(b.startTime), endTime: shortTime(b.endTime), officeId: b.officeId,
  }))
  if (!blocks.value.length) addBlock()
  scheduleError.value = ''
  editing.value = true
}

function addBlock() {
  const last = blocks.value[blocks.value.length - 1]
  blocks.value.push({ dayOfWeek: last?.dayOfWeek ?? 'MONDAY', startTime: '08:00', endTime: '12:00', officeId: last?.officeId ?? officeOptions.value[0]?.id ?? '' })
}

/** Mismas reglas que el backend, para avisar antes de guardar. */
function validateBlocks(): string {
  const sorted = [...blocks.value].sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || minutes(a.startTime) - minutes(b.startTime))
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!
    if (!b.startTime || !b.endTime || !b.officeId) return 'Complete día, horas y consultorio de cada bloque.'
    if (minutes(b.startTime) >= minutes(b.endTime)) return `${dayLabels[b.dayOfWeek]}: la hora de inicio debe ser anterior a la de fin.`
    const prev = sorted[i - 1]
    if (prev && prev.dayOfWeek === b.dayOfWeek && minutes(b.startTime) < minutes(prev.endTime)) return `${dayLabels[b.dayOfWeek]}: hay bloques solapados.`
  }
  return ''
}

async function saveSchedule() {
  scheduleError.value = validateBlocks()
  if (scheduleError.value) return
  saving.value = true
  try {
    const schedule = await practiceApi.replaceSchedule(props.id, blocks.value)
    practitioner.value = { ...practitioner.value!, schedule }
    editing.value = false
    notify.success('Horario actualizado')
  } catch (e) {
    scheduleError.value = e instanceof ApiError ? e.message : 'No se pudo guardar el horario'
  } finally {
    saving.value = false
  }
}

function toggleStatus() {
  const activating = !isActive.value
  confirm.require({
    header: activating ? 'Reactivar profesional' : 'Desactivar profesional',
    message: activating ? '¿Desea reactivar a este profesional?' : 'No podrá asignársele nuevas citas ni tratamientos. ¿Continuar?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: activating ? 'Reactivar' : 'Desactivar',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: activating ? 'primary' : 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        practitioner.value = await practiceApi.setPractitionerStatus(props.id, activating ? 'ACTIVE' : 'INACTIVE')
        notify.success(activating ? 'Profesional reactivado' : 'Profesional desactivado')
      } catch (e) {
        notify.error(e)
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div v-if="!practitioner" class="card"><Skeleton height="14rem" /></div>

    <template v-else>
      <PageHeader :title="fullName(practitioner)" :crumbs="[{ label: 'Personal clínico', to: '/personal' }, { label: 'Profesional' }]">
        <template #actions>
          <Button v-if="auth.can(P.practitionerWrite)" :label="isActive ? 'Desactivar' : 'Reactivar'" :icon="isActive ? 'pi pi-ban' : 'pi pi-replay'"
                  severity="secondary" outlined @click="toggleStatus" />
          <Button v-if="auth.can(P.practitionerWrite)" label="Editar" icon="pi pi-pencil" @click="router.push(`/personal/${practitioner.id}/editar`)" />
        </template>
      </PageHeader>

      <div class="split">
        <section class="card">
          <h2 class="card-title"><i class="pi pi-id-card" /> Información profesional</h2>
          <dl class="data-list">
            <div><dt>Estado</dt><dd><StatusTag :active="isActive" /></dd></div>
            <div><dt>Tipo</dt><dd>{{ staffTypeLabels[practitioner.staffType] }}</dd></div>
            <div v-if="practitioner.specialty"><dt>Especialidad</dt><dd>{{ catalogs.specialtyLabel(practitioner.specialty) }}</dd></div>
            <div><dt>Registro profesional</dt><dd class="mono">{{ practitioner.professionalRegistration || '—' }}</dd></div>
            <div><dt>Identificación</dt><dd class="mono">{{ practitioner.identificationNumber }}</dd></div>
            <div><dt>Correo</dt><dd>{{ practitioner.email }}</dd></div>
            <div><dt>Teléfono</dt><dd>{{ practitioner.phone || '—' }}</dd></div>
            <div><dt>Duración de cita</dt><dd>{{ practitioner.appointmentDurationMinutes }} min</dd></div>
            <div class="wide">
              <dt>Consultorios</dt>
              <dd class="chips">
                <Tag v-for="o in practitioner.offices" :key="o.id" :value="`${o.code} · ${o.name}`" :severity="o.active ? 'info' : 'secondary'" />
                <span v-if="!practitioner.offices.length" class="empty">Sin consultorios</span>
              </dd>
            </div>
          </dl>
        </section>
        <section class="card">
          <h2 class="card-title"><i class="pi pi-link" /> Cuenta del sistema</h2>
          <p v-if="practitioner.userId">
            <i class="pi pi-check-circle linked" /> Vinculado a <strong>{{ linkedUser ?? 'un usuario del sistema' }}</strong>
          </p>
          <p v-else class="empty">Sin usuario vinculado: el profesional no puede iniciar sesión con este perfil.</p>
          <p class="muted small">Registrado {{ formatDateTime(practitioner.createdAt) }} · Actualizado {{ formatDateTime(practitioner.updatedAt) }}</p>
        </section>
      </div>

      <section class="card">
        <div class="schedule-head">
          <h2 class="card-title"><i class="pi pi-clock" /> Horario de atención <small class="muted">{{ weeklyHours.toFixed(1) }} h/semana</small></h2>
          <Button v-if="!editing && auth.can(P.practitionerWrite)" label="Editar horario" icon="pi pi-pencil" size="small" outlined
                  :disabled="!officeOptions.length" @click="startEditing" />
        </div>
        <Message v-if="!officeOptions.length && auth.can(P.practitionerWrite)" severity="info" :closable="false">
          Asigne al menos un consultorio activo para configurar el horario.
        </Message>

        <div v-if="!editing" class="week">
          <div v-for="d in byDay" :key="d.day" class="day" :class="{ off: !d.blocks.length }">
            <h3>{{ dayLabels[d.day] }}</h3>
            <div v-for="b in d.blocks" :key="b.id" class="block">
              <strong>{{ shortTime(b.startTime) }} – {{ shortTime(b.endTime) }}</strong>
              <small>{{ b.officeName }}</small>
            </div>
            <small v-if="!d.blocks.length" class="muted">Sin atención</small>
          </div>
        </div>

        <div v-else class="editor">
          <Message v-if="scheduleError" severity="error" :closable="false">{{ scheduleError }}</Message>
          <div v-for="(b, i) in blocks" :key="i" class="editor-row">
            <Select v-model="b.dayOfWeek" :options="dayOptions" option-label="label" option-value="value" aria-label="Día" />
            <InputText v-model="b.startTime" type="time" aria-label="Hora de inicio" />
            <InputText v-model="b.endTime" type="time" aria-label="Hora de fin" />
            <Select v-model="b.officeId" :options="officeOptions" option-label="name" option-value="id" placeholder="Consultorio" aria-label="Consultorio" />
            <Button icon="pi pi-trash" severity="danger" text rounded aria-label="Quitar bloque" @click="blocks.splice(i, 1)" />
          </div>
          <div class="editor-actions">
            <Button label="Agregar bloque" icon="pi pi-plus" text @click="addBlock" />
            <span class="grow" />
            <Button label="Cancelar" severity="secondary" outlined @click="editing = false" />
            <Button label="Guardar horario" icon="pi pi-check" :loading="saving" @click="saveSchedule" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.linked { color: var(--app-success); }
.small { font-size: 0.8rem; }
.schedule-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.schedule-head .card-title small { font-weight: 400; font-size: 0.8rem; }
.week { display: grid; grid-template-columns: repeat(7, minmax(110px, 1fr)); gap: 0.6rem; overflow-x: auto; }
.day { border: 1px solid var(--app-border); border-radius: 10px; padding: 0.6rem; min-height: 120px; display: flex; flex-direction: column; gap: 0.4rem; }
.day.off { background: var(--app-surface-2); }
.day h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--app-muted); }
.block { background: var(--app-primary-soft); border-left: 3px solid var(--app-primary); border-radius: 6px; padding: 0.4rem 0.5rem; display: flex; flex-direction: column; }
.block small { color: var(--app-muted); }
.editor { display: flex; flex-direction: column; gap: 0.6rem; }
.editor-row { display: grid; grid-template-columns: 10rem 8rem 8rem minmax(10rem, 1fr) auto; gap: 0.5rem; align-items: center; }
.editor-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.grow { flex: 1; }
@media (max-width: 760px) { .editor-row { grid-template-columns: 1fr 1fr; } }
</style>
