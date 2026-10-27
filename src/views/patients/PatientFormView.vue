<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import PageHeader from '@/components/PageHeader.vue'
import FormField from '@/components/FormField.vue'
import { recordsApi } from '@/api/records'
import { ApiError } from '@/api/http'
import { useNotify } from '@/composables/useNotify'
import { useClearErrors } from '@/composables/useClearErrors'
import type { IdentificationType, PatientRequest, PatientSummary, Sex } from '@/types/api'
import { isValidCedula } from '@/utils/cedula'
import { fromIsoDate, fullName, toIsoDate } from '@/utils/format'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const notify = useNotify()
const isEdit = computed(() => !!props.id)

const form = reactive({
  identificationType: 'CEDULA' as IdentificationType,
  identificationNumber: '',
  firstNames: '',
  lastNames: '',
  birthDate: null as Date | null,
  sex: null as Sex | null,
  phone: '',
  email: '',
  address: '',
  occupation: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  allergies: '',
  chronicMedication: '',
  medicalHistory: '',
  dentalHistory: '',
})
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)
const loading = ref(false)
const duplicate = ref<PatientSummary | null>(null)
useClearErrors(form, errors, {
  email: ['phone'],
  emergencyName: ['emergencyContact.name'],
  emergencyPhone: ['emergencyContact.phone'],
})

const idTypes = [
  { label: 'Cédula', value: 'CEDULA' },
  { label: 'Pasaporte', value: 'PASAPORTE' },
  { label: 'Otro', value: 'OTRO' },
]
const sexes = [
  { label: 'Femenino', value: 'FEMENINO' },
  { label: 'Masculino', value: 'MASCULINO' },
  { label: 'Otro', value: 'OTRO' },
]
const today = new Date()
const minBirth = new Date(today.getFullYear() - 120, 0, 1)

onMounted(async () => {
  if (!props.id) return
  loading.value = true
  try {
    const p = await recordsApi.get(props.id)
    Object.assign(form, {
      identificationType: p.identificationType, identificationNumber: p.identificationNumber, firstNames: p.firstNames,
      lastNames: p.lastNames, birthDate: fromIsoDate(p.birthDate), sex: p.sex, phone: p.phone ?? '', email: p.email ?? '',
      address: p.address ?? '', occupation: p.occupation ?? '', emergencyName: p.emergencyContact?.name ?? '',
      emergencyPhone: p.emergencyContact?.phone ?? '', emergencyRelationship: p.emergencyContact?.relationship ?? '',
      allergies: p.allergies ?? '', chronicMedication: p.chronicMedication ?? '', medicalHistory: p.medicalHistory ?? '',
      dentalHistory: p.dentalHistory ?? '',
    })
  } catch (e) {
    notify.error(e, 'No se pudo cargar el paciente')
    router.replace('/pacientes')
  } finally {
    loading.value = false
  }
})

/** Avisa de inmediato si la identificación ya existe (RF-01: sin duplicados). */
async function checkDuplicate() {
  duplicate.value = null
  const number = form.identificationNumber.trim()
  if (isEdit.value || !number) return
  if (form.identificationType === 'CEDULA' && !isValidCedula(number)) return
  try {
    duplicate.value = await recordsApi.lookup(form.identificationType, number)
  } catch {
    duplicate.value = null
  }
}

function validate(): boolean {
  const e: Record<string, string> = {}
  const number = form.identificationNumber.trim().toUpperCase()
  if (!number) e.identificationNumber = 'Ingrese la identificación'
  else if (form.identificationType === 'CEDULA' && !isValidCedula(number)) e.identificationNumber = 'Cédula ecuatoriana inválida'
  else if (form.identificationType === 'PASAPORTE' && !/^[A-Z0-9]{5,20}$/.test(number)) e.identificationNumber = 'Pasaporte inválido (5 a 20 letras o dígitos)'
  if (!form.firstNames.trim()) e.firstNames = 'Ingrese los nombres'
  if (!form.lastNames.trim()) e.lastNames = 'Ingrese los apellidos'
  if (!form.birthDate) e.birthDate = 'Ingrese la fecha de nacimiento'
  if (!form.sex) e.sex = 'Seleccione el sexo'
  if (!form.phone.trim() && !form.email.trim()) e.phone = 'Ingrese al menos un teléfono o un correo'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo inválido'
  errors.value = e
  return Object.keys(e).length === 0
}

const blank = (value: string) => (value.trim() ? value.trim() : null)

function payload(): PatientRequest {
  const hasEmergency = form.emergencyName.trim() || form.emergencyPhone.trim() || form.emergencyRelationship.trim()
  return {
    identificationType: form.identificationType,
    identificationNumber: form.identificationNumber.trim().toUpperCase(),
    firstNames: form.firstNames.trim(),
    lastNames: form.lastNames.trim(),
    birthDate: toIsoDate(form.birthDate!),
    sex: form.sex!,
    phone: blank(form.phone),
    email: blank(form.email),
    address: blank(form.address),
    occupation: blank(form.occupation),
    emergencyContact: hasEmergency
      ? { name: blank(form.emergencyName), phone: blank(form.emergencyPhone), relationship: blank(form.emergencyRelationship) }
      : null,
    allergies: blank(form.allergies),
    chronicMedication: blank(form.chronicMedication),
    medicalHistory: blank(form.medicalHistory),
    dentalHistory: blank(form.dentalHistory),
  }
}

async function submit() {
  formError.value = ''
  if (!validate()) {
    formError.value = 'Revise los campos marcados.'
    return
  }
  saving.value = true
  try {
    const saved = props.id ? await recordsApi.update(props.id, payload()) : await recordsApi.create(payload())
    notify.success(props.id ? 'Paciente actualizado' : 'Paciente registrado', fullName(saved))
    router.push(`/pacientes/${saved.id}`)
  } catch (e) {
    if (e instanceof ApiError) {
      errors.value = { ...e.fieldMap() }
      formError.value = e.message
    } else {
      notify.error(e)
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader :title="isEdit ? 'Editar paciente' : 'Nuevo paciente'"
                :subtitle="isEdit ? 'Actualice la información del paciente' : 'Registre al paciente como entidad clínica continua'"
                :crumbs="[{ label: 'Pacientes', to: '/pacientes' }, { label: isEdit ? 'Editar' : 'Nuevo' }]" />

    <div v-if="loading" class="card"><Skeleton height="20rem" /></div>

    <form v-else class="page" novalidate @submit.prevent="submit">
      <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-id-card" /> Identificación</h2>
        <div class="form-grid">
          <FormField label="Tipo de identificación" for="idType" required>
            <Select input-id="idType" v-model="form.identificationType" :options="idTypes" option-label="label" option-value="value"
                    fluid @change="checkDuplicate" />
          </FormField>
          <FormField label="Número" for="idNumber" required :error="errors.identificationNumber"
                     :hint="form.identificationType === 'CEDULA' ? 'Se valida el dígito verificador' : undefined">
            <InputText id="idNumber" v-model="form.identificationNumber" :invalid="!!errors.identificationNumber" maxlength="20"
                       fluid @blur="checkDuplicate" />
          </FormField>
          <Message v-if="duplicate" severity="warn" :closable="false" class="span-all">
            Ya existe un paciente con esta identificación:
            <RouterLink :to="`/pacientes/${duplicate.id}`"><strong>{{ fullName(duplicate) }}</strong></RouterLink>
          </Message>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-user" /> Datos personales</h2>
        <div class="form-grid">
          <FormField label="Nombres" for="firstNames" required :error="errors.firstNames">
            <InputText id="firstNames" v-model="form.firstNames" :invalid="!!errors.firstNames" maxlength="100" fluid />
          </FormField>
          <FormField label="Apellidos" for="lastNames" required :error="errors.lastNames">
            <InputText id="lastNames" v-model="form.lastNames" :invalid="!!errors.lastNames" maxlength="100" fluid />
          </FormField>
          <FormField label="Fecha de nacimiento" for="birthDate" required :error="errors.birthDate">
            <DatePicker input-id="birthDate" v-model="form.birthDate" :max-date="today" :min-date="minBirth" date-format="dd/mm/yy"
                        show-icon icon-display="input" :invalid="!!errors.birthDate" fluid />
          </FormField>
          <FormField label="Sexo" required :error="errors.sex">
            <SelectButton v-model="form.sex" :options="sexes" option-label="label" option-value="value" :invalid="!!errors.sex" />
          </FormField>
          <FormField label="Ocupación" for="occupation">
            <InputText id="occupation" v-model="form.occupation" maxlength="100" fluid />
          </FormField>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-phone" /> Contacto</h2>
        <div class="form-grid">
          <FormField label="Teléfono" for="phone" :error="errors.phone" hint="Teléfono o correo: al menos uno">
            <InputText id="phone" v-model="form.phone" :invalid="!!errors.phone" maxlength="20" placeholder="0991234567" fluid />
          </FormField>
          <FormField label="Correo electrónico" for="email" :error="errors.email">
            <InputText id="email" v-model="form.email" type="email" :invalid="!!errors.email" maxlength="255" fluid />
          </FormField>
          <FormField label="Dirección" for="address" class="span-2">
            <InputText id="address" v-model="form.address" maxlength="255" fluid />
          </FormField>
        </div>
        <h3 class="sub">Contacto de emergencia</h3>
        <div class="form-grid">
          <FormField label="Nombre" for="emName" :error="errors['emergencyContact.name']">
            <InputText id="emName" v-model="form.emergencyName" maxlength="150" fluid />
          </FormField>
          <FormField label="Teléfono" for="emPhone" :error="errors['emergencyContact.phone']">
            <InputText id="emPhone" v-model="form.emergencyPhone" maxlength="20" fluid />
          </FormField>
          <FormField label="Parentesco" for="emRel">
            <InputText id="emRel" v-model="form.emergencyRelationship" maxlength="50" placeholder="Madre, esposo…" fluid />
          </FormField>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-heart" /> Antecedentes</h2>
        <div class="form-grid">
          <FormField label="Alergias" for="allergies" hint="Se muestran como alerta en la ficha">
            <Textarea id="allergies" v-model="form.allergies" rows="2" auto-resize fluid />
          </FormField>
          <FormField label="Medicación crónica" for="medication">
            <Textarea id="medication" v-model="form.chronicMedication" rows="2" auto-resize fluid />
          </FormField>
          <FormField label="Antecedentes médicos relevantes" for="medical">
            <Textarea id="medical" v-model="form.medicalHistory" rows="3" auto-resize fluid />
          </FormField>
          <FormField label="Antecedentes odontológicos" for="dental">
            <Textarea id="dental" v-model="form.dentalHistory" rows="3" auto-resize fluid />
          </FormField>
        </div>
      </section>

      <div class="form-actions">
        <Button type="button" label="Cancelar" severity="secondary" outlined @click="router.back()" />
        <Button type="submit" :label="isEdit ? 'Guardar cambios' : 'Registrar paciente'" icon="pi pi-check" :loading="saving" />
      </div>
    </form>
  </div>
</template>

<style scoped>
.sub { font-size: 0.9rem; font-weight: 600; margin: 1.5rem 0 0.75rem; color: var(--app-heading); }
</style>
