<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Skeleton from 'primevue/skeleton'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import { recordsApi } from '@/api/records'
import { practiceApi } from '@/api/practice'
import { identityApi } from '@/api/identity'

const auth = useAuthStore()
const loading = ref(true)
const stats = ref<{ label: string; value: number; icon: string; to: string }[]>([])

const greeting = computed(() => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
})

const today = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

const modules = computed(() =>
  [
    { title: 'Pacientes', text: 'Registro y ficha clínica continua del paciente.', icon: 'pi pi-users', to: '/pacientes', permission: P.patientRead },
    { title: 'Personal clínico', text: 'Odontólogos, asistentes, horarios y consultorios.', icon: 'pi pi-id-card', to: '/personal', permission: P.practitionerRead },
    { title: 'Consultorios', text: 'Espacios de atención del centro odontológico.', icon: 'pi pi-building', to: '/consultorios', permission: P.officeRead },
    { title: 'Usuarios', text: 'Cuentas, roles y permisos del sistema.', icon: 'pi pi-user-edit', to: '/usuarios', permission: P.usersRead },
    { title: 'Agenda', text: 'Citas por profesional y consultorio.', icon: 'pi pi-calendar', to: '/agenda', soon: true },
    { title: 'Dentigrama', text: 'Estado bucal por pieza con nomenclatura FDI.', icon: 'pi pi-th-large', to: '/dentigrama', soon: true },
  ].filter((m) => auth.can(m.permission)),
)

const quickActions = computed(() =>
  [
    { label: 'Nuevo paciente', icon: 'pi pi-user-plus', to: '/pacientes/nuevo', permission: P.patientWrite },
    { label: 'Registrar profesional', icon: 'pi pi-id-card', to: '/personal/nuevo', permission: P.practitionerWrite },
    { label: 'Crear usuario', icon: 'pi pi-user-edit', to: '/usuarios/nuevo', permission: P.usersManage },
  ].filter((a) => auth.can(a.permission)),
)

onMounted(async () => {
  // Cada indicador se pide solo si el usuario tiene permiso; un fallo no bloquea el resto.
  const tasks: Promise<void>[] = []
  const result: typeof stats.value = []
  if (auth.can(P.patientRead)) tasks.push(recordsApi.search({ status: 'ACTIVE', size: 1 }).then((p) =>
    void result.push({ label: 'Pacientes activos', value: p.totalElements, icon: 'pi pi-users', to: '/pacientes' })))
  if (auth.can(P.practitionerRead)) tasks.push(practiceApi.practitioners({ status: 'ACTIVE', size: 1 }).then((p) =>
    void result.push({ label: 'Personal activo', value: p.totalElements, icon: 'pi pi-id-card', to: '/personal' })))
  if (auth.can(P.officeRead)) tasks.push(practiceApi.offices(true).then((o) =>
    void result.push({ label: 'Consultorios', value: o.length, icon: 'pi pi-building', to: '/consultorios' })))
  if (auth.can(P.usersRead)) tasks.push(identityApi.users(0, 1).then((p) =>
    void result.push({ label: 'Usuarios', value: p.totalElements, icon: 'pi pi-user-edit', to: '/usuarios' })))
  await Promise.allSettled(tasks)
  const order = ['Pacientes activos', 'Personal activo', 'Consultorios', 'Usuarios']
  stats.value = result.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
  loading.value = false
})
</script>

<template>
  <div class="page">
    <header class="hero">
      <span class="eyebrow">{{ today }}</span>
      <h1 class="hello serif">{{ greeting }}, {{ auth.me?.user.name }}.</h1>
      <p class="muted">Este es el resumen de su consultorio · {{ auth.roleLabel }}</p>
    </header>

    <div class="stats">
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="card stat"><Skeleton height="3rem" /></div>
      </template>
      <RouterLink v-for="s in stats" v-else :key="s.label" :to="s.to" class="card stat">
        <span class="stat-icon"><i :class="s.icon" /></span>
        <span>
          <strong>{{ s.value }}</strong>
          <small>{{ s.label }}</small>
        </span>
      </RouterLink>
    </div>

    <div class="split">
      <section class="card">
        <h2 class="card-title">Módulos principales</h2>
        <div class="modules">
          <RouterLink v-for="m in modules" :key="m.title" :to="m.to" class="module">
            <span class="module-icon"><i :class="m.icon" /></span>
            <span>
              <strong>{{ m.title }} <span v-if="m.soon" class="soon">Pronto</span></strong>
              <small>{{ m.text }}</small>
            </span>
            <i class="pi pi-angle-right muted" />
          </RouterLink>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">Acciones rápidas</h2>
        <div v-if="quickActions.length" class="actions">
          <RouterLink v-for="a in quickActions" :key="a.to" :to="a.to" class="action">
            <i :class="a.icon" /> <span>{{ a.label }}</span>
          </RouterLink>
        </div>
        <p v-else class="empty">Su rol no tiene acciones de registro disponibles.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.hero { padding: 0.5rem 0 0.25rem; }
.hello { font-size: clamp(1.9rem, 3vw, 2.5rem); line-height: 1.15; margin: 0.5rem 0 0.4rem; }
.hero p { margin: 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 1rem; }
.stat { display: flex; align-items: center; gap: 1rem; color: inherit; transition: border-color 0.15s, transform 0.15s; }
.stat:hover { border-color: var(--app-primary); transform: translateY(-1px); }
.stat strong { display: block; font-family: var(--font-serif); font-weight: 500; font-size: 2rem; line-height: 1.05; color: var(--app-heading); }
.stat small { color: var(--app-muted); }
.stat-icon, .module-icon {
  width: 44px; height: 44px; border-radius: 12px; background: var(--app-primary-soft); color: var(--app-accent);
  display: grid; place-items: center; font-size: 1.2rem; flex-shrink: 0;
}
.modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }
.module { display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem; border: 1px solid var(--app-border); border-radius: 10px; color: inherit; }
.module:hover { border-color: var(--app-primary); background: var(--app-hover); }
.module > span:nth-child(2) { flex: 1; }
.module strong { display: block; }
.module small { color: var(--app-muted); }
.soon { font-size: 0.65rem; font-weight: 500; padding: 0.1rem 0.4rem; border-radius: 999px; background: var(--app-surface-2); color: var(--app-muted); vertical-align: middle; }
.actions { display: flex; flex-direction: column; gap: 0.5rem; }
.action { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.9rem; border-radius: 10px; background: var(--app-surface-2); color: var(--app-text); font-weight: 500; }
.action:hover { background: var(--app-primary-soft); color: var(--app-accent); }
</style>
