<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import PageHeader from '@/components/PageHeader.vue'
import FormField from '@/components/FormField.vue'
import { practiceApi } from '@/api/practice'
import { identityApi } from '@/api/identity'
import { ApiError } from '@/api/http'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { usePracticeCatalogs } from '@/composables/usePracticeCatalogs'
import { useClearErrors } from '@/composables/useClearErrors'
import type { PractitionerRequest, StaffType, UserView } from '@/types/api'
import { isValidCedula } from '@/utils/cedula'
import { fullName } from '@/utils/format'

const props = defineProps<{ id?: string }>()
const auth = useAuthStore()
const router = useRouter()
const notify = useNotify()
const catalogs = usePracticeCatalogs()
const isEdit = computed(() => !!props.id)

const form = reactive({
  staffType: 'ODONTOLOGO' as StaffType,
  identificationNumber: '',
  firstNames: '',
  lastNames: '',
  email: '',
  phone: '',
  specialty: null as string | null,
  professionalRegistration: '',
  userId: null as string | null,
  appointmentDurationMinutes: 30 as number | null,
  officeIds: [] as string[],
})
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)
const loading = ref(true)
const users = ref<UserView[]>([])
const isDentist = computed(() => form.staffType === 'ODONTOLOGO')
useClearErrors(form, errors, { staffType: ['specialty', 'professionalRegistration', 'officeIds'] })

/** Consultorios activos más los ya asignados (aunque luego se hayan desactivado). */
const officeOptions = computed(() =>
  catalogs.offices.value
    .filter((o) => o.active || form.officeIds.includes(o.id))
    .map((o) => ({ id: o.id, label: `${o.code} · ${o.name}${o.active ? '' : ' (inactivo)'}` })),
)
const userOptions = computed(() =>
  users.value.filter((u) => u.status === 'ACTIVE' || u.id === form.userId)
    .map((u) => ({ id: u.id, label: `${u.name} ${u.lastName ?? ''}`.trim() + ` · ${u.userName}` })),
)

onMounted(async () => {
  try {
    await catalogs.load(true)
    if (auth.can(P.usersRead)) users.value = (await identityApi.users(0, 100)).content
    if (props.id) {
      const p = await practiceApi.practitioner(props.id)
      Object.assign(form, {
        staffType: p.staffType, identificationNumber: p.identificationNumber, firstNames: p.firstNames, lastNames: p.lastNames,
        email: p.email, phone: p.phone ?? '', specialty: p.specialty, professionalRegistration: p.professionalRegistration ?? '',
        userId: p.userId, appointmentDurationMinutes: p.appointmentDurationMinutes, officeIds: p.offices.map((o) => o.id),
      })
    }
  } catch (e) {
    notify.error(e, 'No se pudo cargar el formulario')
    router.replace('/personal')
  } finally {
    loading.value = false
  }
})

function onStaffTypeChange() {
  if (!isDentist.value) form.specialty = null
}

function validate(): boolean {
  const e: Record<string, string> = {}
  const id = form.identificationNumber.trim().toUpperCase()
  if (!id) e.identificationNumber = 'Ingrese la identificación'
  else if (/^\d{10}$/.test(id) ? !isValidCedula(id) : !/^[A-Z0-9]{5,20}$/.test(id)) e.identificationNumber = 'Cédula o pasaporte inválido'
  if (!form.firstNames.trim()) e.firstNames = 'Ingrese los nombres'
  if (!form.lastNames.trim()) e.lastNames = 'Ingrese los apellidos'
  if (!form.email.trim()) e.email = 'Ingrese el correo'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo inválido'
  const registration = form.professionalRegistration.trim()
  if (registration && !/^[A-Za-z0-9-]{4,30}$/.test(registration)) e.professionalRegistration = 'Solo letras, dígitos y guiones (4 a 30)'
  if (isDentist.value) {
    if (!registration) e.professionalRegistration = 'Obligatorio para odontólogos (ACESS/SENESCYT)'
    if (!form.specialty) e.specialty = 'Seleccione la especialidad'
    if (!form.officeIds.length) e.officeIds = 'Asigne al menos un consultorio'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

function payload(): PractitionerRequest {
  return {
    staffType: form.staffType,
    identificationNumber: form.identificationNumber.trim().toUpperCase(),
    firstNames: form.firstNames.trim(),
    lastNames: form.lastNames.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    specialty: isDentist.value ? form.specialty : null,
    professionalRegistration: form.professionalRegistration.trim() || null,
    userId: form.userId,
    appointmentDurationMinutes: form.appointmentDurationMinutes,
    officeIds: form.officeIds,
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
    const saved = props.id ? await practiceApi.updatePractitioner(props.id, payload()) : await practiceApi.createPractitioner(payload())
    notify.success(props.id ? 'Profesional actualizado' : 'Profesional registrado', fullName(saved))
    router.push(`/personal/${saved.id}`)
  } catch (e) {
    if (e instanceof ApiError) {
      errors.value = e.fieldMap()
      formError.value = e.message
    } else notify.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader :title="isEdit ? 'Editar profesional' : 'Registrar profesional'"
                subtitle="Información profesional, consultorios y vínculo con la cuenta del sistema"
                :crumbs="[{ label: 'Personal clínico', to: '/personal' }, { label: isEdit ? 'Editar' : 'Nuevo' }]" />

    <div v-if="loading" class="card"><Skeleton height="18rem" /></div>

    <form v-else class="page" novalidate @submit.prevent="submit">
      <Message v-if="formError" severity="error" :closable="false">{{ formError }}</Message>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-user" /> Datos personales</h2>
        <div class="form-grid">
          <FormField label="Tipo de personal" for="staffType" required>
            <Select input-id="staffType" v-model="form.staffType" :options="catalogs.staffTypes.value" option-label="label" option-value="code"
                    fluid @change="onStaffTypeChange" />
          </FormField>
          <FormField label="Cédula o pasaporte" for="ident" required :error="errors.identificationNumber">
            <InputText id="ident" v-model="form.identificationNumber" :invalid="!!errors.identificationNumber" maxlength="20" fluid />
          </FormField>
          <FormField label="Nombres" for="fn" required :error="errors.firstNames">
            <InputText id="fn" v-model="form.firstNames" :invalid="!!errors.firstNames" maxlength="100" fluid />
          </FormField>
          <FormField label="Apellidos" for="ln" required :error="errors.lastNames">
            <InputText id="ln" v-model="form.lastNames" :invalid="!!errors.lastNames" maxlength="100" fluid />
          </FormField>
          <FormField label="Correo electrónico" for="email" required :error="errors.email">
            <InputText id="email" v-model="form.email" type="email" :invalid="!!errors.email" maxlength="255" fluid />
          </FormField>
          <FormField label="Teléfono" for="phone" :error="errors.phone">
            <InputText id="phone" v-model="form.phone" maxlength="20" fluid />
          </FormField>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-briefcase" /> Información profesional</h2>
        <div class="form-grid">
          <FormField v-if="isDentist" label="Especialidad" for="specialty" required :error="errors.specialty">
            <Select input-id="specialty" v-model="form.specialty" :options="catalogs.specialties.value" option-label="label" option-value="code"
                    placeholder="Seleccione" :invalid="!!errors.specialty" fluid />
          </FormField>
          <FormField label="Registro profesional (ACESS/SENESCYT)" for="reg" :required="isDentist" :error="errors.professionalRegistration"
                     hint="Ej.: 1005-2019-123456">
            <InputText id="reg" v-model="form.professionalRegistration" :invalid="!!errors.professionalRegistration" maxlength="30" fluid />
          </FormField>
          <FormField label="Duración de cita (min)" for="duration" :error="errors.appointmentDurationMinutes" hint="Base para la agenda (10–240)">
            <InputNumber input-id="duration" v-model="form.appointmentDurationMinutes" :min="10" :max="240" :step="5" show-buttons fluid />
          </FormField>
          <FormField label="Consultorios asignados" for="offices" :required="isDentist" :error="errors.officeIds" class="span-2">
            <MultiSelect input-id="offices" v-model="form.officeIds" :options="officeOptions" option-label="label" option-value="id"
                         display="chip" placeholder="Seleccione uno o más" :invalid="!!errors.officeIds" fluid />
          </FormField>
        </div>
        <p v-if="!catalogs.offices.value.length" class="muted">
          No hay consultorios registrados. <RouterLink to="/consultorios">Regístrelos primero</RouterLink>.
        </p>
      </section>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-link" /> Cuenta del sistema</h2>
        <div class="form-grid">
          <FormField label="Usuario vinculado" for="user" :error="errors.userId"
                     hint="Permite que el profesional vea su perfil y horario al iniciar sesión">
            <Select v-if="auth.can(P.usersRead)" input-id="user" v-model="form.userId" :options="userOptions" option-label="label" option-value="id"
                    placeholder="Sin vincular" filter show-clear fluid />
            <InputText v-else :model-value="form.userId ?? 'Sin vincular'" disabled fluid />
          </FormField>
        </div>
      </section>

      <div class="form-actions">
        <Button type="button" label="Cancelar" severity="secondary" outlined @click="router.back()" />
        <Button type="submit" :label="isEdit ? 'Guardar cambios' : 'Registrar'" icon="pi pi-check" :loading="saving" />
      </div>
    </form>
  </div>
</template>
