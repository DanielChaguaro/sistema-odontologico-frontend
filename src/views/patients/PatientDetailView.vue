<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Skeleton from 'primevue/skeleton'
import Avatar from 'primevue/avatar'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import FormField from '@/components/FormField.vue'
import AuditTable from '@/components/AuditTable.vue'
import OdontogramPanel from '@/components/odontogram/OdontogramPanel.vue'
import { recordsApi } from '@/api/records'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import type { ConsentType, ConsentView, PatientView } from '@/types/api'
import { consentLabels, formatDate, formatDateTime, fullName, identificationTypeLabels, initials, sexLabels } from '@/utils/format'

const props = defineProps<{ id: string }>()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const notify = useNotify()

const tab = ref<string | number>(route.query.tab === 'dentigrama' && auth.can(P.odontogramRead) ? 'odontogram' : 'general')
const patient = ref<PatientView | null>(null)
const consents = ref<ConsentView[]>([])
const busy = ref(false)
const consentForm = reactive({ type: 'TRATAMIENTO_DATOS' as ConsentType, granted: true, notes: '' })
const consentOptions = (Object.keys(consentLabels) as ConsentType[]).map((value) => ({ value, label: consentLabels[value] }))

const isActive = computed(() => patient.value?.status === 'ACTIVE')
/** Vigente = último registro de cada tipo (el historial es inmutable). */
const currentConsents = computed(() => {
  const latest = new Map<ConsentType, ConsentView>()
  for (const c of consents.value) if (!latest.has(c.type)) latest.set(c.type, c)
  return [...latest.values()]
})

async function load() {
  try {
    const [p, c] = await Promise.all([recordsApi.get(props.id), recordsApi.consents(props.id)])
    patient.value = p
    consents.value = c
  } catch (e) {
    notify.error(e, 'No se pudo cargar el paciente')
    router.replace('/pacientes')
  }
}

function toggleStatus() {
  if (!patient.value) return
  const activating = !isActive.value
  confirm.require({
    header: activating ? 'Reactivar paciente' : 'Desactivar paciente',
    message: activating
      ? '¿Desea reactivar a este paciente?'
      : 'El paciente dejará de aparecer en la lista de activos. Su información clínica se conserva. ¿Continuar?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: activating ? 'Reactivar' : 'Desactivar',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: activating ? 'primary' : 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        patient.value = await recordsApi.setStatus(props.id, activating ? 'ACTIVE' : 'INACTIVE')
        notify.success(activating ? 'Paciente reactivado' : 'Paciente desactivado')
      } catch (e) {
        notify.error(e)
      }
    },
  })
}

async function syncDoctorKyn() {
  busy.value = true
  try {
    patient.value = await recordsApi.syncDoctorKyn(props.id)
    notify.success('Antecedentes sincronizados con DoctorKyn')
  } catch (e) {
    notify.error(e, 'Sincronización con DoctorKyn')
  } finally {
    busy.value = false
  }
}

async function addConsent() {
  busy.value = true
  try {
    await recordsApi.addConsent(props.id, { type: consentForm.type, granted: consentForm.granted, notes: consentForm.notes.trim() || null })
    consents.value = await recordsApi.consents(props.id)
    consentForm.notes = ''
    notify.success('Consentimiento registrado')
  } catch (e) {
    notify.error(e)
  } finally {
    busy.value = false
  }
}

const fetchAudit = (page: number, size: number) => recordsApi.audit(props.id, page, size)

onMounted(load)
</script>

<template>
  <div class="page">
    <div v-if="!patient" class="card"><Skeleton height="14rem" /></div>

    <template v-else>
      <PageHeader :title="fullName(patient)" :crumbs="[{ label: 'Pacientes', to: '/pacientes' }, { label: 'Ficha' }]">
        <template #actions>
          <Button v-if="auth.can(P.patientWrite)" label="Sincronizar DoctorKyn" icon="pi pi-sync" severity="secondary" outlined
                  :loading="busy" @click="syncDoctorKyn" />
          <Button v-if="auth.can(P.patientWrite)" :label="isActive ? 'Desactivar' : 'Reactivar'"
                  :icon="isActive ? 'pi pi-ban' : 'pi pi-replay'" severity="secondary" outlined @click="toggleStatus" />
          <Button v-if="auth.can(P.patientWrite)" label="Editar" icon="pi pi-pencil" @click="router.push(`/pacientes/${patient.id}/editar`)" />
        </template>
      </PageHeader>

      <section class="card summary">
        <Avatar :label="initials(fullName(patient))" size="xlarge" shape="circle" class="avatar" />
        <div class="summary-main">
          <div class="summary-line">
            <StatusTag :active="isActive" />
            <span>{{ identificationTypeLabels[patient.identificationType] }} <strong class="mono">{{ patient.identificationNumber }}</strong></span>
            <span>{{ sexLabels[patient.sex] }} · {{ patient.age }} años</span>
            <span v-if="patient.phone"><i class="pi pi-phone muted" /> {{ patient.phone }}</span>
            <span v-if="patient.email"><i class="pi pi-envelope muted" /> {{ patient.email }}</span>
          </div>
          <Message v-if="patient.allergies || patient.doctorKyn?.allergies" severity="error" :closable="false" class="allergy">
            <strong>Alergias:</strong> {{ [patient.allergies, patient.doctorKyn?.allergies].filter(Boolean).join(' · ') }}
          </Message>
        </div>
      </section>

      <Tabs v-model:value="tab">
        <TabList>
          <Tab value="general">Datos generales</Tab>
          <Tab value="history">Antecedentes</Tab>
          <Tab v-if="auth.can(P.odontogramRead)" value="odontogram">Dentigrama</Tab>
          <Tab value="consents">Consentimientos</Tab>
          <Tab v-if="auth.can(P.auditRead)" value="audit">Bitácora</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="general">
            <dl class="data-list">
              <div><dt>Nombres</dt><dd>{{ patient.firstNames }}</dd></div>
              <div><dt>Apellidos</dt><dd>{{ patient.lastNames }}</dd></div>
              <div><dt>Fecha de nacimiento</dt><dd>{{ formatDate(patient.birthDate) }}</dd></div>
              <div><dt>Ocupación</dt><dd>{{ patient.occupation || '—' }}</dd></div>
              <div><dt>Teléfono</dt><dd>{{ patient.phone || '—' }}</dd></div>
              <div><dt>Correo</dt><dd>{{ patient.email || '—' }}</dd></div>
              <div class="wide"><dt>Dirección</dt><dd>{{ patient.address || '—' }}</dd></div>
              <div class="wide">
                <dt>Contacto de emergencia</dt>
                <dd v-if="patient.emergencyContact">
                  {{ patient.emergencyContact.name || 'Sin nombre' }}
                  <span v-if="patient.emergencyContact.relationship" class="muted">({{ patient.emergencyContact.relationship }})</span>
                  <span v-if="patient.emergencyContact.phone"> · {{ patient.emergencyContact.phone }}</span>
                </dd>
                <dd v-else class="empty">No registrado</dd>
              </div>
              <div><dt>Registrado</dt><dd>{{ formatDateTime(patient.createdAt) }}</dd></div>
              <div><dt>Última actualización</dt><dd>{{ formatDateTime(patient.updatedAt) }}</dd></div>
            </dl>
          </TabPanel>

          <TabPanel value="history">
            <div class="split">
              <dl class="data-list">
                <div class="wide"><dt>Alergias</dt><dd>{{ patient.allergies || 'Ninguna registrada' }}</dd></div>
                <div class="wide"><dt>Medicación crónica</dt><dd>{{ patient.chronicMedication || 'Ninguna registrada' }}</dd></div>
                <div class="wide"><dt>Antecedentes médicos</dt><dd>{{ patient.medicalHistory || 'Ninguno registrado' }}</dd></div>
                <div class="wide"><dt>Antecedentes odontológicos</dt><dd>{{ patient.dentalHistory || 'Ninguno registrado' }}</dd></div>
              </dl>
              <div class="card doctorkyn">
                <h3 class="card-title"><i class="pi pi-sync" /> Antecedentes de DoctorKyn</h3>
                <dl v-if="patient.doctorKyn" class="data-list">
                  <div class="wide"><dt>Alergias</dt><dd>{{ patient.doctorKyn.allergies || '—' }}</dd></div>
                  <div class="wide"><dt>Medicación</dt><dd>{{ patient.doctorKyn.chronicMedication || '—' }}</dd></div>
                  <div class="wide"><dt>Antecedentes</dt><dd>{{ patient.doctorKyn.medicalHistory || '—' }}</dd></div>
                  <div class="wide"><dt>Sincronizado</dt><dd>{{ formatDateTime(patient.doctorKyn.syncedAt) }}</dd></div>
                </dl>
                <p v-else class="empty">Sin datos sincronizados. Los antecedentes de DoctorKyn se guardan aparte y nunca reemplazan los registrados aquí.</p>
              </div>
            </div>
          </TabPanel>

          <TabPanel v-if="auth.can(P.odontogramRead)" value="odontogram">
            <!-- Se monta solo al abrir la pestaña: cada lectura del dentigrama queda auditada. -->
            <OdontogramPanel v-if="tab === 'odontogram'" :patient-id="patient.id" :patient-age="patient.age" :patient-active="isActive" />
          </TabPanel>

          <TabPanel value="consents">
            <div class="chips current">
              <span class="muted">Vigentes:</span>
              <Tag v-for="c in currentConsents" :key="c.type" :severity="c.granted ? 'success' : 'danger'"
                   :value="`${consentLabels[c.type]}: ${c.granted ? 'otorgado' : 'revocado'}`" />
              <span v-if="!currentConsents.length" class="empty">Ninguno registrado</span>
            </div>

            <form v-if="auth.can(P.patientWrite)" class="consent-form" @submit.prevent="addConsent">
              <FormField label="Tipo de consentimiento">
                <Select v-model="consentForm.type" :options="consentOptions" option-label="label" option-value="value" fluid />
              </FormField>
              <FormField label="Decisión">
                <SelectButton v-model="consentForm.granted" :options="[{ l: 'Otorga', v: true }, { l: 'Revoca', v: false }]"
                              option-label="l" option-value="v" :allow-empty="false" />
              </FormField>
              <FormField label="Observación">
                <InputText v-model="consentForm.notes" maxlength="500" placeholder="Firmado en recepción…" fluid />
              </FormField>
              <Button type="submit" label="Registrar" icon="pi pi-plus" :loading="busy" class="consent-submit" />
            </form>

            <DataTable :value="consents" size="small" data-key="id">
              <template #empty><p class="empty">Sin consentimientos registrados.</p></template>
              <Column header="Fecha"><template #body="{ data }">{{ formatDateTime(data.recordedAt) }}</template></Column>
              <Column header="Tipo"><template #body="{ data }">{{ consentLabels[data.type as ConsentType] }}</template></Column>
              <Column header="Decisión">
                <template #body="{ data }"><Tag :severity="data.granted ? 'success' : 'danger'" :value="data.granted ? 'Otorgado' : 'Revocado'" /></template>
              </Column>
              <Column header="Observación"><template #body="{ data }">{{ data.notes || '—' }}</template></Column>
            </DataTable>
          </TabPanel>

          <TabPanel v-if="auth.can(P.auditRead)" value="audit">
            <p class="muted audit-note">Registro inmutable de accesos y cambios sobre la información del paciente (LOPDP).</p>
            <!-- Se monta al abrir la pestaña para mostrar siempre los últimos registros. -->
            <AuditTable v-if="tab === 'audit'" :fetch="fetchAudit" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>
</template>

<style scoped>
.summary { display: flex; gap: 1.25rem; align-items: center; }
.avatar { background: var(--app-primary-soft); color: var(--app-accent); font-weight: 600; flex-shrink: 0; }
.summary-main { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
.summary-line { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; align-items: center; }
.allergy { margin: 0; }
.doctorkyn { background: var(--app-surface-2); box-shadow: none; }
.current { margin-bottom: 1rem; align-items: center; }
.consent-form { display: grid; grid-template-columns: 1.4fr 1fr 2fr auto; gap: 1rem; align-items: end; margin-bottom: 1.25rem;
  padding: 1rem; background: var(--app-surface-2); border-radius: 10px; }
@media (max-width: 900px) { .consent-form { grid-template-columns: 1fr; } }
.audit-note { margin-top: 0; }
:deep(.p-tabpanels) { background: var(--app-surface); border: 1px solid var(--app-border); border-top: 0; border-radius: 0 0 12px 12px; padding: 1.25rem; }
:deep(.p-tablist) { border-radius: 12px 12px 0 0; overflow: hidden; border: 1px solid var(--app-border); border-bottom: 0; }
</style>
