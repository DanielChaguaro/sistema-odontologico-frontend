<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import Message from 'primevue/message'
import FormField from '@/components/FormField.vue'
import OdontogramChart from './OdontogramChart.vue'
import ToothGlyph from './ToothGlyph.vue'
import { odontogramApi } from '@/api/records'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import type { ConsultationView, Dentition, FindingType, FindingView, OdontogramView, UUID } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import {
  belongsTo, dentitionLabels, describeFinding, diffStates, FINDING_TYPES, findingCatalog, regionSurface, suggestedDentition, summarize,
  toothName, type Region,
} from '@/utils/odontogram'

/** RF-03: espacio de trabajo del dentigrama de un paciente (consultas, registro por pieza y comparación evolutiva). */
const props = defineProps<{ patientId: UUID; patientAge: number; patientActive: boolean }>()

const auth = useAuthStore()
const confirm = useConfirm()
const notify = useNotify()

const consultations = ref<ConsultationView[]>([])
const state = ref<OdontogramView | null>(null)
const loading = ref(true)
const busy = ref(false)
const tool = ref<FindingType | null>(null)
const nextNote = ref('')
const selectedFdi = ref<number | null>(null)
const history = ref<FindingView[] | null>(null)
const compareId = ref<UUID | null>(null)
const compareState = ref<OdontogramView | null>(null)

const openDialog = reactive({ visible: false, dentition: suggestedDentition(props.patientAge) as Dentition, reason: '' })
const annulDialog = reactive({ visible: false, finding: null as FindingView | null, reason: '' })

const current = computed(() => state.value?.consultation ?? null)
const findings = computed(() => state.value?.findings ?? [])
const hasOpen = computed(() => consultations.value.some((c) => c.status === 'OPEN'))
const canWrite = computed(() => auth.can(P.odontogramWrite) && current.value?.status === 'OPEN')
const summary = computed(() => (current.value ? summarize(findings.value, current.value.dentition) : []))
const toothFindings = computed(() => findings.value.filter((f) => f.fdiCode === selectedFdi.value))

const consultationLabel = (c: ConsultationView) =>
  `${formatDateTime(c.consultationDate)} · ${c.practitionerName}${c.status === 'OPEN' ? ' (abierta)' : ''}`
const consultationOptions = computed(() => consultations.value.map((c) => ({ value: c.id, label: consultationLabel(c) })))
const compareOptions = computed(() => consultationOptions.value.filter((o) => o.value !== current.value?.id))
const dentitionOptions = (Object.keys(dentitionLabels) as Dentition[]).map((value) => ({ value, label: dentitionLabels[value] }))
const tools = (group: 'pending' | 'done') => FINDING_TYPES.filter((t) => findingCatalog[t].group === group)

/** Cambios entre la consulta comparada y la que se está viendo, siempre de la más antigua a la más reciente. */
const diff = computed(() => {
  if (!compareState.value?.consultation || !current.value) return null
  const compareIsOlder = compareState.value.consultation.consultationDate <= current.value.consultationDate
  const [before, after] = compareIsOlder ? [compareState.value.findings, findings.value] : [findings.value, compareState.value.findings]
  return { ...diffStates(before, after), from: compareIsOlder ? compareState.value.consultation : current.value,
    to: compareIsOlder ? current.value : compareState.value.consultation }
})

async function load(consultationId?: UUID | null) {
  loading.value = true
  try {
    const [list, view] = await Promise.all([odontogramApi.consultations(props.patientId), odontogramApi.odontogram(props.patientId, consultationId)])
    consultations.value = list
    state.value = view
    if (compareId.value === view.consultation?.id) clearCompare()
  } catch (e) {
    notify.error(e, 'No se pudo cargar el dentigrama')
  } finally {
    loading.value = false
  }
}

async function viewConsultation(id: UUID) {
  tool.value = null
  history.value = null
  await load(id)
}

async function compareWith(id: UUID | null) {
  compareId.value = id
  if (!id) return clearCompare()
  try {
    compareState.value = await odontogramApi.odontogram(props.patientId, id)
  } catch (e) {
    notify.error(e, 'No se pudo cargar la consulta a comparar')
    clearCompare()
  }
}

function clearCompare() {
  compareId.value = null
  compareState.value = null
}

async function openConsultation() {
  busy.value = true
  try {
    const created = await odontogramApi.openConsultation(props.patientId, {
      dentition: openDialog.dentition, reason: openDialog.reason.trim() || null, appointmentRef: null,
    })
    openDialog.visible = false
    openDialog.reason = ''
    notify.success('Consulta abierta', 'Los hallazgos que registre quedarán asociados a esta consulta.')
    await load(created.id)
  } catch (e) {
    notify.error(e)
  } finally {
    busy.value = false
  }
}

function closeConsultation() {
  if (!current.value) return
  const id = current.value.id
  confirm.require({
    header: 'Cerrar consulta',
    message: 'Una vez cerrada, el dentigrama de esta consulta queda de solo lectura. ¿Continuar?',
    icon: 'pi pi-lock',
    acceptLabel: 'Cerrar consulta',
    rejectLabel: 'Cancelar',
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await odontogramApi.closeConsultation(props.patientId, id)
        tool.value = null
        notify.success('Consulta cerrada')
        await load(id)
      } catch (e) {
        notify.error(e)
      }
    },
  })
}

async function onToothClick(fdi: number, region: Region) {
  selectedFdi.value = fdi
  history.value = null
  if (!canWrite.value || !tool.value || !current.value || busy.value) return
  if (!belongsTo(fdi, current.value.dentition)) return
  const type = tool.value
  busy.value = true
  try {
    const created = await odontogramApi.addFinding(props.patientId, current.value.id, {
      fdiCode: fdi,
      surface: findingCatalog[type].scope === 'SURFACE' ? regionSurface(fdi, region) : null,
      type,
      notes: nextNote.value.trim() || null,
    })
    state.value!.findings = [...findings.value, created]
    nextNote.value = ''
  } catch (e) {
    notify.error(e, 'No se pudo registrar el hallazgo')
  } finally {
    busy.value = false
  }
}

function resolveFinding(finding: FindingView) {
  if (!current.value) return
  const consultationId = current.value.id
  confirm.require({
    header: 'Marcar como resuelto',
    message: `«${describeFinding(finding)}» en la pieza ${finding.fdiCode} dejará de figurar desde esta consulta. Se conserva en el historial.`,
    icon: 'pi pi-check-circle',
    acceptLabel: 'Resolver',
    rejectLabel: 'Cancelar',
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await odontogramApi.resolveFinding(props.patientId, consultationId, finding.id)
        state.value!.findings = findings.value.filter((f) => f.id !== finding.id)
      } catch (e) {
        notify.error(e)
      }
    },
  })
}

function askAnnul(finding: FindingView) {
  annulDialog.finding = finding
  annulDialog.reason = ''
  annulDialog.visible = true
}

async function annulFinding() {
  const finding = annulDialog.finding
  if (!finding || !current.value || !annulDialog.reason.trim()) return
  busy.value = true
  try {
    await odontogramApi.annulFinding(props.patientId, current.value.id, finding.id, annulDialog.reason.trim())
    state.value!.findings = findings.value.filter((f) => f.id !== finding.id)
    annulDialog.visible = false
  } catch (e) {
    notify.error(e)
  } finally {
    busy.value = false
  }
}

async function loadHistory() {
  if (selectedFdi.value == null) return
  try {
    history.value = await odontogramApi.toothHistory(props.patientId, selectedFdi.value)
  } catch (e) {
    notify.error(e, 'No se pudo cargar el historial de la pieza')
  }
}

const statusTags = {
  ACTIVE: { value: 'Activo', severity: 'info' },
  RESOLVED: { value: 'Resuelto', severity: 'success' },
  ANNULLED: { value: 'Anulado', severity: 'secondary' },
} as const
const statusTag = (f: FindingView) => statusTags[f.status]

onMounted(() => load())
</script>

<template>
  <div class="odontogram">
    <div v-if="loading && !state" class="card"><Skeleton height="18rem" /></div>

    <template v-else-if="state">
      <!-- Barra de consulta -->
      <div class="consultation-bar">
        <div class="grow">
          <Select v-if="consultations.length" :model-value="current?.id" :options="consultationOptions" option-label="label" option-value="value"
                  placeholder="Consulta" fluid @update:model-value="viewConsultation" />
        </div>
        <Tag v-if="current" :value="current.status === 'OPEN' ? 'Consulta abierta' : 'Consulta cerrada'"
             :severity="current.status === 'OPEN' ? 'success' : 'secondary'" :icon="current.status === 'OPEN' ? 'pi pi-pencil' : 'pi pi-lock'" />
        <Tag v-if="current" :value="`Dentición ${dentitionLabels[current.dentition].toLowerCase()}`" severity="secondary" />
        <Button v-if="auth.can(P.odontogramWrite) && !hasOpen" label="Nueva consulta" icon="pi pi-plus" :disabled="!patientActive"
                v-tooltip.bottom="patientActive ? undefined : 'El paciente está inactivo'" @click="openDialog.visible = true" />
        <Button v-if="canWrite" label="Cerrar consulta" icon="pi pi-lock" severity="secondary" outlined @click="closeConsultation" />
      </div>

      <Message v-if="!current" severity="info" :closable="false">
        El paciente aún no tiene consultas. {{ auth.can(P.odontogramWrite) ? 'Abra una consulta para registrar su dentigrama.' : '' }}
      </Message>

      <template v-else>
        <p v-if="current.reason" class="muted reason"><strong>Motivo:</strong> {{ current.reason }}</p>

        <!-- Paleta de hallazgos (solo en la consulta abierta) -->
        <div v-if="canWrite" class="card palette">
          <div class="palette-head">
            <span class="palette-title"><i class="pi pi-palette" /> Registrar hallazgo</span>
            <span class="muted hint">Elija un hallazgo y haga clic en la cara (caries, obturación) o en la pieza.</span>
            <InputText v-model="nextNote" maxlength="500" placeholder="Nota para el próximo hallazgo (opcional)" class="note"
                       aria-label="Nota para el próximo hallazgo" />
          </div>
          <div v-for="group in (['pending', 'done'] as const)" :key="group" class="tool-row">
            <span :class="['tool-group', group]">{{ group === 'pending' ? 'Por realizar' : 'Realizado' }}</span>
            <button v-for="t in tools(group)" :key="t" type="button" :class="['tool', { active: tool === t }]" :title="findingCatalog[t].label"
                    @click="tool = tool === t ? null : t">
              <svg viewBox="-8 -8 36 36" width="22" height="22" aria-hidden="true">
                <ToothGlyph :fdi="16" :size="20" :findings="[{ type: t, surface: findingCatalog[t].scope === 'SURFACE' ? 'OCLUSAL' : null }]" />
              </svg>
              <span>{{ findingCatalog[t].short }}</span>
            </button>
          </div>
        </div>

        <div class="workspace">
          <div class="card chart-card">
            <OdontogramChart :dentition="current.dentition" :findings="findings" :selected-fdi="selectedFdi"
                             :changed-teeth="diff?.changedTeeth" :interactive="true" @tooth-click="onToothClick" />
            <div class="summary">
              <div v-for="item in summary" :key="item.label" class="stat"><strong>{{ item.value }}</strong><span>{{ item.label }}</span></div>
            </div>
          </div>

          <aside class="card side">
            <template v-if="selectedFdi != null">
              <h3 class="card-title"><i class="pi pi-circle" /> Pieza {{ selectedFdi }}</h3>
              <p class="muted tooth-name">{{ toothName(selectedFdi) }} · FDI {{ selectedFdi }}</p>
              <ul v-if="toothFindings.length" class="finding-list">
                <li v-for="f in toothFindings" :key="f.id">
                  <span class="dot" :style="{ background: findingCatalog[f.type].color }" />
                  <div class="finding-body">
                    <strong>{{ describeFinding(f) }}</strong>
                    <small class="muted">Registrado {{ formatDateTime(f.consultationDate) }}</small>
                    <small v-if="f.notes">{{ f.notes }}</small>
                  </div>
                  <template v-if="canWrite">
                    <Button v-if="f.consultationId === current.id" icon="pi pi-times" text rounded severity="danger" size="small"
                            v-tooltip.left="'Anular (error de registro)'" aria-label="Anular" @click="askAnnul(f)" />
                    <Button v-else icon="pi pi-check" text rounded severity="success" size="small"
                            v-tooltip.left="'Resuelto en esta consulta'" aria-label="Resolver" @click="resolveFinding(f)" />
                  </template>
                </li>
              </ul>
              <p v-else class="empty">Sin hallazgos en esta consulta.</p>
              <Button label="Historial de la pieza" icon="pi pi-history" text size="small" @click="loadHistory" />
              <ul v-if="history" class="history">
                <li v-for="h in history" :key="h.id" :class="{ annulled: h.status === 'ANNULLED' }">
                  <div>
                    <strong>{{ describeFinding(h) }}</strong>
                    <small class="muted">{{ formatDateTime(h.consultationDate) }}<template v-if="h.resolvedAt"> → resuelto {{ formatDateTime(h.resolvedAt) }}</template></small>
                    <small v-if="h.annulReason" class="muted">Anulado: {{ h.annulReason }}</small>
                  </div>
                  <Tag v-bind="statusTag(h)" />
                </li>
                <li v-if="!history.length" class="empty">La pieza no tiene registros.</li>
              </ul>
            </template>
            <p v-else class="empty">Seleccione una pieza para ver sus hallazgos e historial.</p>

            <div class="compare">
              <h3 class="card-title"><i class="pi pi-arrow-right-arrow-left" /> Comparar evolución</h3>
              <Select :model-value="compareId" :options="compareOptions" option-label="label" option-value="value" show-clear
                      placeholder="Elegir otra consulta" fluid :disabled="!compareOptions.length" @update:model-value="compareWith" />
              <template v-if="diff">
                <p class="muted diff-range">De {{ formatDateTime(diff.from.consultationDate) }} a {{ formatDateTime(diff.to.consultationDate) }}</p>
                <p v-if="!diff.added.length && !diff.removed.length" class="empty">Sin cambios entre ambas consultas.</p>
                <ul class="diff">
                  <li v-for="f in diff.added" :key="'a' + f.id"><i class="pi pi-plus-circle added" /> {{ f.fdiCode }} · {{ describeFinding(f) }}</li>
                  <li v-for="f in diff.removed" :key="'r' + f.id"><i class="pi pi-minus-circle removed" /> {{ f.fdiCode }} · {{ describeFinding(f) }}</li>
                </ul>
              </template>
            </div>
          </aside>
        </div>

        <!-- Leyenda MSP -->
        <div class="card legend">
          <span class="legend-title">Simbología (MSP, formulario 033): <span class="red">rojo</span> = por realizar · <span class="blue">azul</span> = realizado</span>
          <div class="legend-items">
            <span v-for="t in FINDING_TYPES" :key="t" class="legend-item">
              <svg viewBox="-8 -8 36 36" width="20" height="20" aria-hidden="true">
                <ToothGlyph :fdi="16" :size="20" :findings="[{ type: t, surface: findingCatalog[t].scope === 'SURFACE' ? 'OCLUSAL' : null }]" />
              </svg>
              {{ findingCatalog[t].label }}
            </span>
          </div>
        </div>
      </template>
    </template>

    <Dialog v-model:visible="openDialog.visible" header="Nueva consulta" modal :style="{ width: '28rem' }">
      <form class="dialog-form" @submit.prevent="openConsultation">
        <FormField label="Dentición" hint="Sugerida según la edad del paciente">
          <SelectButton v-model="openDialog.dentition" :options="dentitionOptions" option-label="label" option-value="value" :allow-empty="false" />
        </FormField>
        <FormField label="Motivo de la consulta" for="consultation-reason">
          <InputText id="consultation-reason" v-model="openDialog.reason" maxlength="500" placeholder="Control, dolor en molar inferior…" fluid autofocus />
        </FormField>
        <div class="form-actions">
          <Button label="Cancelar" severity="secondary" outlined @click="openDialog.visible = false" />
          <Button type="submit" label="Abrir consulta" icon="pi pi-check" :loading="busy" />
        </div>
      </form>
    </Dialog>

    <Dialog v-model:visible="annulDialog.visible" header="Anular hallazgo" modal :style="{ width: '28rem' }">
      <form class="dialog-form" @submit.prevent="annulFinding">
        <p v-if="annulDialog.finding" class="muted">
          Pieza {{ annulDialog.finding.fdiCode }} · {{ describeFinding(annulDialog.finding) }}. El registro se conserva en la bitácora como anulado.
        </p>
        <FormField label="Motivo" for="annul-reason" required>
          <InputText id="annul-reason" v-model="annulDialog.reason" maxlength="500" placeholder="Registrado en la pieza equivocada…" fluid autofocus />
        </FormField>
        <div class="form-actions">
          <Button label="Cancelar" severity="secondary" outlined @click="annulDialog.visible = false" />
          <Button type="submit" label="Anular" severity="danger" icon="pi pi-times" :loading="busy" :disabled="!annulDialog.reason.trim()" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<style scoped>
.odontogram { display: flex; flex-direction: column; gap: 1rem; }
.consultation-bar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
.consultation-bar .grow { flex: 1 1 280px; min-width: 0; }
.reason { margin: 0; }

.palette { padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
.palette-head { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; }
.palette-title { font-weight: 600; display: flex; gap: 0.4rem; align-items: center; }
.palette-title .pi { color: var(--app-accent); }
.hint { font-size: 0.8rem; }
.note { margin-left: auto; flex: 0 1 18rem; min-width: 0; }
.tool-row { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.tool-group { width: 6.5rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.tool-group.pending { color: var(--msp-red); }
.tool-group.done { color: var(--msp-blue); }
.tool { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.6rem 0.3rem 0.35rem; border: 1px solid var(--app-border);
  border-radius: 8px; background: var(--app-surface-2); font: inherit; font-size: 0.8rem; cursor: pointer; color: var(--app-text); }
.tool:hover { border-color: var(--app-accent); }
.tool.active { border-color: var(--app-accent); background: var(--app-primary-soft); box-shadow: 0 0 0 2px var(--app-primary-soft); }

.workspace { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 1rem; align-items: start; }
@media (max-width: 1200px) { .workspace { grid-template-columns: minmax(0, 1fr); } }
.chart-card { padding: 1rem; }
.summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; margin-top: 0.75rem; }
@media (max-width: 700px) { .summary { grid-template-columns: repeat(3, 1fr); } }
.stat { background: var(--app-surface-2); border-radius: 8px; padding: 0.5rem; text-align: center; display: flex; flex-direction: column; }
.stat strong { font-family: var(--font-serif); font-weight: 500; font-size: 1.5rem; color: var(--app-heading); }
.stat span { font-size: 0.72rem; color: var(--app-muted); }

.side { display: flex; flex-direction: column; gap: 0.5rem; }
.side .card-title { margin-bottom: 0; }
.tooth-name { margin: 0; font-size: 0.85rem; }
.finding-list, .history, .diff { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.finding-list li { display: flex; gap: 0.5rem; align-items: center; padding: 0.4rem 0.5rem; border: 1px solid var(--app-border); border-radius: 8px; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.finding-body { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.history li { display: flex; justify-content: space-between; gap: 0.5rem; align-items: flex-start; font-size: 0.85rem; }
.history li > div { display: flex; flex-direction: column; }
.history .annulled strong { text-decoration: line-through; color: var(--app-muted); }
.compare { border-top: 1px solid var(--app-border); padding-top: 0.75rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.diff-range { margin: 0; font-size: 0.8rem; }
.diff li { font-size: 0.85rem; }
.added { color: var(--app-success); }
.removed { color: var(--app-warning); }

.legend { padding: 0.75rem 1rem; }
.legend-title { font-size: 0.8rem; font-weight: 600; }
.legend-title .red { color: var(--msp-red); }
.legend-title .blue { color: var(--msp-blue); }
.legend-items { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; margin-top: 0.5rem; }
.legend-item { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.78rem; color: var(--app-muted); }
.dialog-form { display: flex; flex-direction: column; gap: 1rem; }
</style>
