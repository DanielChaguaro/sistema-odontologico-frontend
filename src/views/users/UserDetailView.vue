<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import FormField from '@/components/FormField.vue'
import RolePermissions from '@/components/RolePermissions.vue'
import AuditTable from '@/components/AuditTable.vue'
import { identityApi } from '@/api/identity'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/composables/useNotify'
import { useRoles } from '@/composables/useRoles'
import type { UserView } from '@/types/api'

const props = defineProps<{ id: string }>()
const auth = useAuthStore()
const router = useRouter()
const confirm = useConfirm()
const notify = useNotify()
const roles = useRoles()

const user = ref<UserView | null>(null)
const editingRoles = ref(false)
const selectedRoles = ref<string[]>([])
const editingData = ref(false)
const dataForm = reactive({ name: '', lastName: '' })
const saving = ref(false)
const audit = ref<InstanceType<typeof AuditTable>>()

const isSelf = computed(() => user.value?.id === auth.me?.user.id)
const isPlatformAdmin = computed(() => user.value?.userType === 'SUPER_ADMIN')
/** Mismas reglas que identity: users.manage nunca sobre la propia cuenta ni sobre un SUPER_ADMIN. */
const canManage = computed(() => auth.isSuperAdmin || (auth.can(P.usersManage) && !isSelf.value && !isPlatformAdmin.value))
const canEditData = computed(() => isSelf.value || auth.can(P.usersWrite))
const isActive = computed(() => user.value?.status === 'ACTIVE')
const effective = computed(() => roles.permissionsOf(user.value?.profileIds ?? []))

async function load() {
  try {
    const [u] = await Promise.all([identityApi.user(props.id), roles.load(auth.can(P.permissionsRead))])
    user.value = u
  } catch (e) {
    notify.error(e, 'No se pudo cargar el usuario')
    router.replace('/usuarios')
  }
}

function startRoles() {
  selectedRoles.value = [...(user.value?.profileIds ?? [])]
  editingRoles.value = true
}

async function saveRoles() {
  if (!selectedRoles.value.length) {
    notify.info('Seleccione al menos un rol', 'Para quitar todo acceso, desactive la cuenta.')
    return
  }
  saving.value = true
  try {
    user.value = await identityApi.setUserProfiles(props.id, selectedRoles.value)
    editingRoles.value = false
    notify.success('Roles actualizados')
    audit.value?.reload()
  } catch (e) {
    notify.error(e)
  } finally {
    saving.value = false
  }
}

function startData() {
  Object.assign(dataForm, { name: user.value?.name ?? '', lastName: user.value?.lastName ?? '' })
  editingData.value = true
}

async function saveData() {
  if (!dataForm.name.trim()) return notify.info('Ingrese los nombres')
  saving.value = true
  try {
    user.value = await identityApi.updateUser(props.id, { name: dataForm.name.trim(), lastName: dataForm.lastName.trim() || null })
    editingData.value = false
    notify.success('Datos actualizados')
    if (isSelf.value) auth.loadMe()
  } catch (e) {
    notify.error(e)
  } finally {
    saving.value = false
  }
}

function toggleStatus() {
  const activating = !isActive.value
  confirm.require({
    header: activating ? 'Activar cuenta' : 'Desactivar cuenta',
    message: activating ? 'El usuario podrá volver a ingresar al sistema. ¿Continuar?'
      : 'El usuario perderá el acceso de inmediato en todos los servicios. ¿Continuar?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: activating ? 'Activar' : 'Desactivar',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: activating ? 'primary' : 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        user.value = await identityApi.setUserStatus(props.id, activating ? 'ACTIVE' : 'INACTIVE')
        notify.success(activating ? 'Cuenta activada' : 'Cuenta desactivada')
        audit.value?.reload()
      } catch (e) {
        notify.error(e)
      }
    },
  })
}

const fetchAudit = (page: number, size: number) => identityApi.rbacAudit(props.id, page, size)

onMounted(load)
</script>

<template>
  <div class="page">
    <div v-if="!user" class="card"><Skeleton height="14rem" /></div>

    <template v-else>
      <PageHeader :title="`${user.name} ${user.lastName ?? ''}`" :subtitle="user.email"
                  :crumbs="[{ label: 'Usuarios', to: '/usuarios' }, { label: user.userName }]">
        <template #actions>
          <Button v-if="canManage" :label="isActive ? 'Desactivar cuenta' : 'Activar cuenta'" :icon="isActive ? 'pi pi-ban' : 'pi pi-check'"
                  severity="secondary" outlined @click="toggleStatus" />
        </template>
      </PageHeader>

      <Message v-if="isSelf" severity="info" :closable="false">Esta es su propia cuenta: sus roles y estado los gestiona otro administrador.</Message>

      <div class="split">
        <section class="card">
          <div class="head">
            <h2 class="card-title"><i class="pi pi-user" /> Cuenta</h2>
            <Button v-if="canEditData && !editingData" icon="pi pi-pencil" label="Editar" size="small" text @click="startData" />
          </div>
          <form v-if="editingData" class="form-grid" @submit.prevent="saveData">
            <FormField label="Nombres" for="n" required><InputText id="n" v-model="dataForm.name" fluid /></FormField>
            <FormField label="Apellidos" for="l"><InputText id="l" v-model="dataForm.lastName" fluid /></FormField>
            <div class="form-actions span-all">
              <Button type="button" label="Cancelar" severity="secondary" outlined @click="editingData = false" />
              <Button type="submit" label="Guardar" icon="pi pi-check" :loading="saving" />
            </div>
          </form>
          <dl v-else class="data-list">
            <div><dt>Usuario</dt><dd class="mono">{{ user.userName }}</dd></div>
            <div><dt>Correo</dt><dd>{{ user.email }}</dd></div>
            <div><dt>Estado</dt><dd><StatusTag :active="isActive" /></dd></div>
            <div><dt>Tipo de cuenta</dt><dd><Tag :value="isPlatformAdmin ? 'Administrador DoctorKyn' : 'Usuario'" :severity="isPlatformAdmin ? 'warn' : 'secondary'" /></dd></div>
          </dl>

          <div class="head roles-head">
            <h2 class="card-title"><i class="pi pi-shield" /> Roles</h2>
            <Button v-if="canManage && !editingRoles" icon="pi pi-pencil" label="Cambiar roles" size="small" text @click="startRoles" />
          </div>
          <div v-if="editingRoles" class="roles-edit">
            <MultiSelect v-model="selectedRoles" :options="roles.activeProfiles.value" option-label="name" option-value="id" display="chip" fluid />
            <div class="form-actions">
              <Button label="Cancelar" severity="secondary" outlined @click="editingRoles = false" />
              <Button label="Guardar roles" icon="pi pi-check" :loading="saving" @click="saveRoles" />
            </div>
          </div>
          <div v-else class="chips">
            <Tag v-for="id in user.profileIds" :key="id" :value="roles.profileById.value.get(id)?.name ?? 'Rol'" severity="info" />
            <span v-if="!user.profileIds.length" class="empty">Sin roles asignados</span>
          </div>
        </section>

        <aside class="card">
          <h2 class="card-title"><i class="pi pi-key" /> Permisos efectivos por rol</h2>
          <p v-if="isPlatformAdmin" class="muted">El administrador de DoctorKyn tiene acceso total.</p>
          <RolePermissions v-else-if="auth.can(P.permissionsRead)" :permissions="effective" />
          <p v-else class="empty">No tiene permiso para consultar el catálogo de permisos.</p>
        </aside>
      </div>

      <section v-if="auth.can(P.auditRead)" class="card">
        <h2 class="card-title"><i class="pi pi-history" /> Bitácora de cambios de permisos</h2>
        <AuditTable ref="audit" :fetch="fetchAudit" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: center; }
.roles-head { margin-top: 1.5rem; }
.roles-edit { display: flex; flex-direction: column; gap: 0.75rem; }
</style>
