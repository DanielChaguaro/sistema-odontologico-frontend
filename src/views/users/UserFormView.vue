<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import Message from 'primevue/message'
import PageHeader from '@/components/PageHeader.vue'
import FormField from '@/components/FormField.vue'
import RolePermissions from '@/components/RolePermissions.vue'
import { identityApi } from '@/api/identity'
import { ApiError } from '@/api/http'
import { useNotify } from '@/composables/useNotify'
import { useRoles } from '@/composables/useRoles'
import { useClearErrors } from '@/composables/useClearErrors'

const router = useRouter()
const notify = useNotify()
const roles = useRoles()

const form = reactive({ name: '', lastName: '', email: '', userName: '', password: '', profileIds: [] as string[] })
const errors = ref<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)
const userNameTouched = ref(false)
useClearErrors(form, errors)

const grantedPermissions = computed(() => roles.permissionsOf(form.profileIds))

onMounted(() => roles.load(true).catch((e) => notify.error(e, 'No se pudieron cargar los roles')))

/** Sugiere el usuario a partir del correo mientras no se haya escrito uno a mano. */
function onEmailInput() {
  if (!userNameTouched.value) form.userName = form.email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, '') ?? ''
}

/** Contraseña temporal aleatoria de 14 caracteres con mayúsculas, minúsculas, dígitos y símbolo. */
function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*?']
  const random = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0]! % n
  const chars = sets.map((s) => s[random(s.length)]!)
  const all = sets.join('')
  while (chars.length < 14) chars.push(all[random(all.length)]!)
  form.password = chars.sort(() => random(3) - 1).join('')
}

function validate() {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = 'Ingrese los nombres'
  if (!form.email.trim()) e.email = 'Ingrese el correo'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo inválido'
  if (!form.userName.trim()) e.userName = 'Ingrese el nombre de usuario'
  if (form.password.length < 12) e.password = 'Mínimo 12 caracteres'
  if (!form.profileIds.length) e.profileIds = 'Toda cuenta debe tener al menos un rol'
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
    const user = await identityApi.createUser({
      name: form.name.trim(), lastName: form.lastName.trim(), email: form.email.trim(), userName: form.userName.trim(),
      password: form.password, profileIds: form.profileIds,
    })
    notify.success('Usuario creado', 'Entregue la contraseña temporal: se pedirá cambiarla en el primer ingreso.')
    router.push(`/usuarios/${user.id}`)
  } catch (e) {
    if (e instanceof ApiError) {
      errors.value = e.fieldMap()
      formError.value = e.status === 409 ? 'Ya existe un usuario con ese correo o nombre de usuario.' : e.message
    } else notify.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="Crear usuario" subtitle="Complete la información para registrar un nuevo usuario en el sistema"
                :crumbs="[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Crear usuario' }]" />

    <form class="split" novalidate @submit.prevent="submit">
      <section class="card">
        <h2 class="card-title"><i class="pi pi-user" /> Información del usuario</h2>
        <Message v-if="formError" severity="error" :closable="false" class="msg">{{ formError }}</Message>
        <div class="form-grid">
          <FormField label="Nombres" for="name" required :error="errors.name">
            <InputText id="name" v-model="form.name" maxlength="255" :invalid="!!errors.name" fluid />
          </FormField>
          <FormField label="Apellidos" for="lastName" :error="errors.lastName">
            <InputText id="lastName" v-model="form.lastName" maxlength="255" fluid />
          </FormField>
          <FormField label="Correo electrónico" for="email" required :error="errors.email">
            <InputText id="email" v-model="form.email" type="email" maxlength="255" :invalid="!!errors.email" fluid @input="onEmailInput" />
          </FormField>
          <FormField label="Usuario" for="userName" required :error="errors.userName">
            <InputText id="userName" v-model="form.userName" maxlength="255" :invalid="!!errors.userName" fluid @input="userNameTouched = true" />
          </FormField>
          <FormField label="Contraseña temporal" for="password" required :error="errors.password"
                     hint="Keycloak pedirá cambiarla en el primer ingreso" class="span-2">
            <div class="password-row">
              <Password input-id="password" v-model="form.password" :feedback="false" toggle-mask :invalid="!!errors.password" fluid />
              <Button type="button" label="Generar" icon="pi pi-refresh" severity="secondary" outlined @click="generatePassword" />
            </div>
          </FormField>
          <FormField label="Rol" for="roles" required :error="errors.profileIds" class="span-2">
            <MultiSelect input-id="roles" v-model="form.profileIds" :options="roles.activeProfiles.value" option-label="name" option-value="id"
                         display="chip" placeholder="Seleccione uno o más roles" :invalid="!!errors.profileIds" fluid />
          </FormField>
        </div>
        <div class="form-actions">
          <Button type="button" label="Cancelar" severity="secondary" outlined @click="router.back()" />
          <Button type="submit" label="Crear usuario" icon="pi pi-user-plus" :loading="saving" />
        </div>
      </section>

      <aside class="card">
        <h2 class="card-title"><i class="pi pi-shield" /> Permisos por rol</h2>
        <RolePermissions :permissions="grantedPermissions" />
      </aside>
    </form>
  </div>
</template>

<style scoped>
.password-row { display: flex; gap: 0.5rem; }
.password-row > :first-child { flex: 1; }
.msg { margin-bottom: 1rem; }
</style>
