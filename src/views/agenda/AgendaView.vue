<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Skeleton from 'primevue/skeleton'
import PageHeader from '@/components/PageHeader.vue'
import AppointmentDialog from '@/components/agenda/AppointmentDialog.vue'
import { agendaApi, practiceApi } from '@/api/practice'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { usePracticeCatalogs } from '@/composables/usePracticeCatalogs'
import type { AppointmentStatus, AppointmentView, PractitionerSummary, ScheduleBlockView } from '@/types/api'
import {
  addDays, appointmentStatusLabels, dayOfWeek, formatLongDay, formatMonth, formatRange, hhmm, layoutDay, minutesOfDay, monthGrid,
  sameDay, startOfWeek,
} from '@/utils/agenda'
import { fromIsoDate, fullName, shortTime, toIsoDate } from '@/utils/format'

/** RF-10: agenda odontológica en vista día / semana / mes, por profesional y consultorio. */
type ViewMode = 'dia' | 'semana' | 'mes'
const HOUR_PX = 56
const SNAP_MINUTES = 15

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notify = useNotify()
const catalogs = usePracticeCatalogs()

const view = ref<ViewMode>(['dia', 'semana', 'mes'].includes(route.query.vista as string) ? (route.query.vista as ViewMode) : 'semana')
const anchor = ref(typeof route.query.fecha === 'string' ? fromIsoDate(route.query.fecha) : new Date())
const practitionerId = ref<string | null>(typeof route.query.profesional === 'string' ? route.query.profesional : null)
const officeId = ref<string | null>(null)
const statusFilter = ref<AppointmentStatus | null>(null)
const openId = ref<string | null>(typeof route.query.cita === 'string' ? route.query.cita : null)

const loading = ref(true)
const appointments = ref<AppointmentView[]>([])
const practitioners = ref<PractitionerSummary[]>([])
const schedule = ref<ScheduleBlockView[]>([])
const now = ref(new Date())
const timer = window.setInterval(() => (now.value = new Date()), 60_000)
onBeforeUnmount(() => window.clearInterval(timer))

const canWrite = computed(() => auth.can(P.appointmentWrite))
const viewOptions = [{ label: 'Día', value: 'dia' }, { label: 'Semana', value: 'semana' }, { label: 'Mes', value: 'mes' }]
const practitionerOptions = computed(() => practitioners.value.map((p) => ({ id: p.id, label: fullName(p) })))
const officeOptions = computed(() => catalogs.offices.value.filter((o) => o.active).map((o) => ({ id: o.id, label: o.name })))

const days = computed(() => (view.value === 'dia' ? [anchor.value] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor.value), i))))
const grid = computed(() => monthGrid(anchor.value))
const range = computed(() =>
  view.value === 'mes' ? { from: grid.value[0]!, to: grid.value[41]! } : { from: days.value[0]!, to: days.value[days.value.length - 1]! })
const title = computed(() =>
  view.value === 'mes' ? formatMonth(anchor.value) : view.value === 'dia' ? formatLongDay(anchor.value) : formatRange(range.value.from, range.value.to))

const filtered = computed(() => appointments.value.filter((a) => !statusFilter.value || a.status === statusFilter.value))
const counts = computed(() => {
  const result: Record<string, number> = { ALL: appointments.value.length }
  for (const a of appointments.value) result[a.status] = (result[a.status] ?? 0) + 1
  return result
})
const statusChips = computed(() => [
  { value: null, label: 'Todas', count: counts.value.ALL ?? 0 },
  ...(Object.keys(appointmentStatusLabels) as AppointmentStatus[]).map((s) => ({ value: s, label: appointmentStatusLabels[s], count: counts.value[s] ?? 0 })),
])

const byDay = computed(() => {
  const map = new Map<string, AppointmentView[]>()
  for (const a of filtered.value) {
    const key = a.startAt.slice(0, 10)
    map.set(key, [...(map.get(key) ?? []), a])
  }
  return map
})

/** Franja horaria visible: 07:00–21:00, ampliada si hay horario o citas fuera de ella. */
const hours = computed(() => {
  let first = 7
  let last = 21
  for (const a of filtered.value) {
    first = Math.min(first, Math.floor(minutesOfDay(a.startAt) / 60))
    last = Math.max(last, Math.ceil(minutesOfDay(a.endAt) / 60))
  }
  for (const b of schedule.value) {
    first = Math.min(first, Number(b.startTime.slice(0, 2)))
    last = Math.max(last, Math.ceil((Number(b.endTime.slice(0, 2)) * 60 + Number(b.endTime.slice(3, 5))) / 60))
  }
  return { first, last, list: Array.from({ length: last - first }, (_, i) => first + i) }
})
const top = (minutes: number) => ((minutes - hours.value.first * 60) / 60) * HOUR_PX

function columnFor(day: Date) {
  const placed = layoutDay(byDay.value.get(toIsoDate(day)) ?? []).map((p) => ({
    ...p,
    style: {
      top: `${top(minutesOfDay(p.item.startAt))}px`,
      height: `${Math.max(22, (p.item.durationMinutes / 60) * HOUR_PX - 2)}px`,
      left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
      width: `calc(${100 / p.lanes}% - 4px)`,
    },
  }))
  // Horario de atención del profesional elegido: se sombrea como "disponible".
  const blocks = schedule.value
    .filter((b) => b.dayOfWeek === dayOfWeek(day) && (!officeId.value || b.officeId === officeId.value))
    .map((b) => {
      const start = Number(b.startTime.slice(0, 2)) * 60 + Number(b.startTime.slice(3, 5))
      const end = Number(b.endTime.slice(0, 2)) * 60 + Number(b.endTime.slice(3, 5))
      return { id: b.id, label: `${shortTime(b.startTime)}–${shortTime(b.endTime)} · ${b.officeName}`,
        style: { top: `${top(start)}px`, height: `${((end - start) / 60) * HOUR_PX}px` } }
    })
  return { placed, blocks }
}
const columns = computed(() => days.value.map((day) => ({ day, key: toIsoDate(day), isToday: sameDay(day, now.value), ...columnFor(day) })))
const nowLine = computed(() => `${top(now.value.getHours() * 60 + now.value.getMinutes())}px`)
const showNowLine = computed(() => {
  const minutes = now.value.getHours() * 60 + now.value.getMinutes()
  return minutes >= hours.value.first * 60 && minutes <= hours.value.last * 60
})

async function load() {
  loading.value = true
  try {
    appointments.value = await agendaApi.appointments({ from: toIsoDate(range.value.from), to: toIsoDate(range.value.to),
      practitionerId: practitionerId.value, officeId: officeId.value })
  } catch (e) {
    notify.error(e, 'No se pudo cargar la agenda')
  } finally {
    loading.value = false
  }
}

async function loadSchedule() {
  schedule.value = []
  if (!practitionerId.value || !auth.can(P.practitionerRead)) return
  try {
    schedule.value = (await practiceApi.practitioner(practitionerId.value)).schedule
  } catch {
    // El sombreado del horario es una ayuda visual: si falla, la agenda sigue usable.
  }
}

function move(step: number) {
  const a = anchor.value
  anchor.value = view.value === 'mes' ? new Date(a.getFullYear(), a.getMonth() + step, 1)
    : addDays(a, step * (view.value === 'dia' ? 1 : 7))
}

function openDay(day: Date) {
  anchor.value = day
  view.value = 'dia'
}

/** Clic en un hueco del calendario: abre el formulario con fecha, hora y profesional precargados. */
function bookAt(day: Date, event: MouseEvent) {
  if (!canWrite.value) return
  const offset = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const minutes = hours.value.first * 60 + Math.floor(((event.clientY - offset.top) / HOUR_PX) * 60 / SNAP_MINUTES) * SNAP_MINUTES
  const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60)
  if (when <= new Date()) return notify.info('Horario pasado', 'Seleccione un horario futuro para agendar.')
  const pad = (n: number) => String(n).padStart(2, '0')
  router.push({ path: '/agenda/nueva', query: { fecha: toIsoDate(day), hora: `${pad(when.getHours())}:${pad(when.getMinutes())}`,
    ...(practitionerId.value ? { profesional: practitionerId.value } : {}) } })
}

function newAppointment() {
  router.push({ path: '/agenda/nueva', query: { fecha: toIsoDate(anchor.value < new Date() ? new Date() : anchor.value),
    ...(practitionerId.value ? { profesional: practitionerId.value } : {}) } })
}

function onChanged(updated: AppointmentView) {
  const index = appointments.value.findIndex((a) => a.id === updated.id)
  if (index >= 0) appointments.value.splice(index, 1, updated)
  // Una reprogramación puede sacar la cita del rango visible.
  load()
}

watch([view, () => toIsoDate(anchor.value), practitionerId, officeId], () => {
  router.replace({ query: { vista: view.value, fecha: toIsoDate(anchor.value), ...(practitionerId.value ? { profesional: practitionerId.value } : {}),
    ...(openId.value ? { cita: openId.value } : {}) } })
  load()
})
watch(practitionerId, loadSchedule)
watch(openId, (id) => router.replace({ query: { ...route.query, cita: id ?? undefined } }))

onMounted(async () => {
  try {
    await catalogs.load()
    if (auth.can(P.practitionerRead)) {
      const [dentists, hygienists] = await Promise.all([
        practiceApi.practitioners({ staffType: 'ODONTOLOGO', status: 'ACTIVE', size: 100 }),
        practiceApi.practitioners({ staffType: 'HIGIENISTA_DENTAL', status: 'ACTIVE', size: 100 }),
      ])
      practitioners.value = [...dentists.content, ...hygienists.content]
    }
    // El odontólogo ve primero su propia agenda.
    if (!practitionerId.value) {
      const me = await practiceApi.me().catch(() => null)
      if (me && (me.staffType === 'ODONTOLOGO' || me.staffType === 'HIGIENISTA_DENTAL')) {
        practitionerId.value = me.id
        return // el watch de practitionerId carga agenda y horario
      }
    }
  } catch (e) {
    notify.error(e, 'No se pudieron cargar los filtros')
  }
  await Promise.all([load(), loadSchedule()])
})
</script>

<template>
  <div class="page">
    <PageHeader title="Agenda odontológica" subtitle="Citas por profesional y consultorio · vista día, semana y mes">
      <template #actions>
        <Button v-if="canWrite" label="Nueva cita" icon="pi pi-plus" @click="newAppointment" />
      </template>
    </PageHeader>

    <div class="card filters">
      <Select v-if="practitioners.length" v-model="practitionerId" :options="practitionerOptions" option-label="label" option-value="id"
              placeholder="Todos los profesionales" show-clear filter class="filter" aria-label="Profesional" />
      <Select v-model="officeId" :options="officeOptions" option-label="label" option-value="id" placeholder="Todos los consultorios"
              show-clear class="filter" aria-label="Consultorio" />
      <div class="chips" role="group" aria-label="Filtrar por estado">
        <button v-for="chip in statusChips" :key="chip.label" type="button" class="chip" :class="[chip.value ?? 'ALL', { on: statusFilter === chip.value }]"
                @click="statusFilter = chip.value">
          {{ chip.label }} <strong>{{ chip.count }}</strong>
        </button>
      </div>
    </div>

    <div class="card calendar">
      <div class="cal-toolbar">
        <div class="nav">
          <Button icon="pi pi-chevron-left" text rounded aria-label="Anterior" @click="move(-1)" />
          <Button icon="pi pi-chevron-right" text rounded aria-label="Siguiente" @click="move(1)" />
          <Button label="Hoy" size="small" severity="secondary" outlined @click="anchor = new Date()" />
        </div>
        <h2 class="cal-title">{{ title }}</h2>
        <SelectButton v-model="view" :options="viewOptions" option-label="label" option-value="value" :allow-empty="false" size="small" />
      </div>

      <Skeleton v-if="loading && !appointments.length" height="28rem" />

      <!-- Mes -->
      <div v-else-if="view === 'mes'" class="month">
        <div v-for="label in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']" :key="label" class="month-head">{{ label }}</div>
        <button v-for="day in grid" :key="toIsoDate(day)" type="button" class="month-cell"
                :class="{ other: day.getMonth() !== anchor.getMonth(), today: sameDay(day, now) }" @click="openDay(day)">
          <span class="num">{{ day.getDate() }}</span>
          <span v-for="a in (byDay.get(toIsoDate(day)) ?? []).slice(0, 3)" :key="a.id" class="pill" :class="a.status"
                @click.stop="openId = a.id">{{ hhmm(a.startAt) }} {{ a.patientName }}</span>
          <span v-if="(byDay.get(toIsoDate(day))?.length ?? 0) > 3" class="more">+{{ byDay.get(toIsoDate(day))!.length - 3 }} más</span>
        </button>
      </div>

      <!-- Día / semana -->
      <div v-else class="timegrid" :style="{ '--cols': columns.length }">
        <div class="corner" />
        <div v-for="col in columns" :key="col.key" class="col-head" :class="{ today: col.isToday }">
          <button type="button" class="day-link" @click="openDay(col.day)">
            <span>{{ col.day.toLocaleDateString('es-EC', { weekday: 'short' }) }}</span>
            <strong>{{ col.day.getDate() }}</strong>
          </button>
        </div>

        <div class="hours" :style="{ height: `${hours.list.length * HOUR_PX}px` }">
          <span v-for="h in hours.list" :key="h" :style="{ height: `${HOUR_PX}px` }">{{ String(h).padStart(2, '0') }}:00</span>
        </div>
        <div v-for="col in columns" :key="col.key + '-body'" class="col" :class="{ today: col.isToday, bookable: canWrite }"
             :style="{ height: `${hours.list.length * HOUR_PX}px`, backgroundSize: `100% ${HOUR_PX}px` }" @click="bookAt(col.day, $event)">
          <div v-for="b in col.blocks" :key="b.id" class="available" :style="b.style" :title="`Atención: ${b.label}`" />
          <div v-if="col.isToday && showNowLine" class="now" :style="{ top: nowLine }" />
          <button v-for="p in col.placed" :key="p.item.id" type="button" class="appt" :class="p.item.status" :style="p.style"
                  :title="`${hhmm(p.item.startAt)}–${hhmm(p.item.endAt)} · ${p.item.patientName} · ${p.item.practitionerName}`"
                  @click.stop="openId = p.item.id">
            <strong>{{ hhmm(p.item.startAt) }} {{ p.item.patientName }}</strong>
            <span>{{ catalogs.appointmentTypeLabel(p.item.type) }}<template v-if="!practitionerId"> · {{ p.item.practitionerName }}</template></span>
          </button>
        </div>
      </div>

      <p v-if="!loading && !filtered.length" class="empty">
        No hay citas en este periodo.<template v-if="canWrite"> Haga clic en un horario del calendario o en «Nueva cita» para agendar.</template>
      </p>
      <p v-if="schedule.length && view !== 'mes'" class="legend muted"><span class="swatch" /> Horario de atención del profesional</p>
    </div>

    <AppointmentDialog :appointment-id="openId" @close="openId = null" @changed="onChanged" />
  </div>
</template>

<style scoped>
.filters { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; padding: 1rem; }
.filter { min-width: 14rem; }
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-left: auto; }
.chip {
  border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-text); border-radius: 999px;
  padding: 0.3rem 0.75rem; font: inherit; font-size: 0.8rem; cursor: pointer; display: inline-flex; gap: 0.35rem; align-items: center;
}
.chip.on { border-color: var(--app-primary); background: var(--app-primary-soft); color: var(--app-primary); }
.chip::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--app-muted); }
.chip.CONFIRMED::before { background: var(--msp-blue); }
.chip.COMPLETED::before { background: var(--app-success); }
.chip.NO_SHOW::before { background: var(--app-warning); }
.chip.ALL::before { background: var(--app-primary); }

.calendar { padding: 1rem; overflow-x: auto; }
.cal-toolbar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
.nav { display: flex; align-items: center; gap: 0.25rem; }
.cal-title { flex: 1; text-align: center; font-size: 1.05rem; font-weight: 600; text-transform: capitalize; margin: 0; }

.timegrid { display: grid; grid-template-columns: 3.5rem repeat(var(--cols), minmax(7.5rem, 1fr)); min-width: calc(3.5rem + var(--cols) * 7.5rem); }
.corner, .col-head { position: sticky; top: 0; z-index: 3; background: var(--app-surface); border-bottom: 1px solid var(--app-border); }
.col-head { text-align: center; padding: 0.35rem 0; }
.day-link { border: 0; background: none; color: var(--app-text); font: inherit; cursor: pointer; display: inline-flex; flex-direction: column; align-items: center; text-transform: capitalize; font-size: 0.8rem; }
.day-link strong { font-size: 1.1rem; }
.col-head.today .day-link strong { color: var(--app-primary-contrast); background: var(--app-primary); border-radius: 999px; padding: 0 0.45rem; }
.hours { display: flex; flex-direction: column; }
.hours span { font-size: 0.7rem; color: var(--app-muted); text-align: right; padding-right: 0.4rem; transform: translateY(-0.45rem); }
.col {
  position: relative; border-left: 1px solid var(--app-border);
  background-image: linear-gradient(to bottom, var(--app-border) 1px, transparent 1px);
}
.col.today { background-color: color-mix(in srgb, var(--app-primary-soft) 35%, transparent); }
.col.bookable { cursor: copy; }
.available { position: absolute; left: 0; right: 0; background: color-mix(in srgb, var(--app-success) 10%, transparent);
  border-left: 3px solid color-mix(in srgb, var(--app-success) 55%, transparent); pointer-events: none; }
.now { position: absolute; left: 0; right: 0; height: 2px; background: var(--app-danger); z-index: 2; pointer-events: none; }
.now::before { content: ''; position: absolute; left: -4px; top: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--app-danger); }
.appt {
  position: absolute; z-index: 1; overflow: hidden; text-align: left; cursor: pointer; font: inherit; font-size: 0.72rem; line-height: 1.25;
  padding: 0.2rem 0.4rem; border-radius: 8px; border: 1px solid transparent; border-left: 4px solid var(--msp-blue);
  background: color-mix(in srgb, var(--msp-blue) 14%, var(--app-surface)); color: var(--app-heading);
  display: flex; flex-direction: column;
}
.appt span { color: var(--app-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.appt strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
.appt:hover { border-color: var(--app-primary); }
.appt.COMPLETED { border-left-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 14%, var(--app-surface)); }
.appt.NO_SHOW { border-left-color: var(--app-warning); background: color-mix(in srgb, var(--app-warning) 14%, var(--app-surface)); }
.appt.CANCELLED { border-left-color: var(--app-muted); background: var(--app-surface-2); opacity: 0.7; }
.appt.CANCELLED strong { text-decoration: line-through; }

.month { display: grid; grid-template-columns: repeat(7, minmax(6.5rem, 1fr)); border-top: 1px solid var(--app-border); border-left: 1px solid var(--app-border); }
.month-head { font-size: 0.75rem; color: var(--app-muted); text-align: center; padding: 0.35rem 0; border-right: 1px solid var(--app-border); border-bottom: 1px solid var(--app-border); }
.month-cell {
  min-height: 6.5rem; display: flex; flex-direction: column; gap: 0.2rem; align-items: stretch; padding: 0.3rem; text-align: left;
  border: 0; border-right: 1px solid var(--app-border); border-bottom: 1px solid var(--app-border); background: var(--app-surface);
  color: var(--app-text); font: inherit; cursor: pointer;
}
.month-cell:hover { background: var(--app-hover); }
.month-cell.other { color: var(--app-muted); background: var(--app-surface-2); }
.month-cell .num { font-size: 0.8rem; font-weight: 600; }
.month-cell.today .num { color: var(--app-primary); }
.pill { font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  background: color-mix(in srgb, var(--msp-blue) 14%, var(--app-surface)); border-left: 3px solid var(--msp-blue); }
.pill.COMPLETED { border-left-color: var(--app-success); }
.pill.NO_SHOW { border-left-color: var(--app-warning); }
.pill.CANCELLED { border-left-color: var(--app-muted); text-decoration: line-through; opacity: 0.7; }
.more { font-size: 0.7rem; color: var(--app-muted); }
.legend { font-size: 0.8rem; margin: 0.75rem 0 0; display: flex; align-items: center; gap: 0.4rem; }
.swatch { width: 14px; height: 10px; background: color-mix(in srgb, var(--app-success) 18%, transparent); border-left: 3px solid var(--app-success); display: inline-block; }
@media (max-width: 720px) { .chips { margin-left: 0; } .cal-title { order: -1; flex-basis: 100%; } }
</style>
