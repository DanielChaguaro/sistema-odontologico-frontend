<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Skeleton from 'primevue/skeleton'
import { agendaApi } from '@/api/practice'
import { toApiError } from '@/api/http'
import type { AvailabilitySlot, UUID } from '@/types/api'
import { addDays, formatLongDay, hhmm } from '@/utils/agenda'
import { toIsoDate } from '@/utils/format'

/**
 * "Horarios disponibles" del prototipo: huecos libres del profesional en la fecha elegida, calculados por
 * dental-practice a partir del horario semanal y de las citas ya confirmadas del profesional y del consultorio.
 */
const props = defineProps<{ practitionerId: UUID | null; durationMinutes: number | null; officeId?: UUID | null; preferredTime?: string | null }>()
const date = defineModel<Date>('date', { required: true })
const selected = defineModel<AvailabilitySlot | null>({ default: null })

const slots = ref<AvailabilitySlot[]>([])
const loading = ref(false)
const error = ref('')
const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
const canGoBack = computed(() => date.value > today)
let request = 0

async function load() {
  selected.value = null
  slots.value = []
  error.value = ''
  if (!props.practitionerId) return
  const current = ++request
  loading.value = true
  try {
    const result = await agendaApi.availability({ practitionerId: props.practitionerId, date: toIsoDate(date.value),
      officeId: props.officeId ?? null, durationMinutes: props.durationMinutes })
    if (current !== request) return
    slots.value = result.slots
    if (props.preferredTime) selected.value = result.slots.find((s) => hhmm(s.startAt) === props.preferredTime) ?? null
  } catch (e) {
    if (current === request) error.value = toApiError(e).message
  } finally {
    if (current === request) loading.value = false
  }
}

watch(() => [props.practitionerId, props.durationMinutes, props.officeId, toIsoDate(date.value)], load, { immediate: true })

const isSelected = (slot: AvailabilitySlot) => selected.value?.startAt === slot.startAt && selected.value.officeId === slot.officeId
const showOffice = computed(() => new Set(slots.value.map((s) => s.officeId)).size > 1)
</script>

<template>
  <div class="picker">
    <div class="day-nav">
      <Button icon="pi pi-chevron-left" text rounded aria-label="Día anterior" :disabled="!canGoBack" @click="date = addDays(date, -1)" />
      <DatePicker v-model="date" :min-date="today" date-format="dd/mm/yy" show-icon icon-display="input" input-id="agenda-date" fluid />
      <Button icon="pi pi-chevron-right" text rounded aria-label="Día siguiente" @click="date = addDays(date, 1)" />
    </div>
    <p class="day-label">{{ formatLongDay(date) }}</p>

    <p v-if="!practitionerId" class="muted hint">Seleccione un profesional para ver sus horarios.</p>
    <div v-else-if="loading" class="slots"><Skeleton v-for="i in 6" :key="i" height="2.25rem" /></div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!slots.length" class="muted hint">Sin horarios disponibles este día. Pruebe con otra fecha.</p>
    <div v-else class="slots" role="listbox" aria-label="Horarios disponibles">
      <button v-for="slot in slots" :key="slot.startAt + slot.officeId" type="button" role="option" class="slot"
              :class="{ selected: isSelected(slot) }" :aria-selected="isSelected(slot)" @click="selected = slot">
        <span>{{ hhmm(slot.startAt) }} – {{ hhmm(slot.endAt) }}</span>
        <small v-if="showOffice">{{ slot.officeName }}</small>
        <i v-if="isSelected(slot)" class="pi pi-check" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 0.5rem; }
.day-nav { display: flex; align-items: center; gap: 0.25rem; }
.day-label { font-size: 0.85rem; color: var(--app-muted); text-transform: capitalize; }
.hint { font-size: 0.875rem; padding: 0.5rem 0; }
.error { color: var(--app-danger); font-size: 0.875rem; }
.slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 0.5rem; max-height: 22rem; overflow-y: auto; }
.slot {
  display: flex; align-items: center; justify-content: space-between; gap: 0.25rem; flex-wrap: wrap;
  padding: 0.5rem 0.75rem; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface);
  color: var(--app-text); font: inherit; font-size: 0.875rem; cursor: pointer; text-align: left;
}
.slot:hover { background: var(--app-hover); }
.slot.selected { border-color: var(--app-primary); background: var(--app-primary-soft); color: var(--app-primary); font-weight: 600; }
.slot small { width: 100%; color: var(--app-muted); font-weight: 400; }
</style>
