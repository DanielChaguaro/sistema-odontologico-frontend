import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    /** Permiso (o cualquiera de varios) requerido para entrar. */
    permission?: string | string[]
    title?: string
  }
}

const soon = (title: string, path: string, icon: string): RouteRecordRaw => ({
  path,
  component: () => import('@/views/ComingSoonView.vue'),
  props: { title, icon },
  meta: { title },
})

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true, title: 'Iniciar sesión' } },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Inicio' } },

      { path: 'pacientes', name: 'patients', component: () => import('@/views/patients/PatientListView.vue'), meta: { permission: P.patientRead, title: 'Pacientes' } },
      { path: 'pacientes/nuevo', name: 'patient-new', component: () => import('@/views/patients/PatientFormView.vue'), meta: { permission: P.patientWrite, title: 'Nuevo paciente' } },
      { path: 'pacientes/:id', name: 'patient', component: () => import('@/views/patients/PatientDetailView.vue'), props: true, meta: { permission: P.patientRead, title: 'Ficha del paciente' } },
      { path: 'pacientes/:id/editar', name: 'patient-edit', component: () => import('@/views/patients/PatientFormView.vue'), props: true, meta: { permission: P.patientWrite, title: 'Editar paciente' } },

      { path: 'personal', name: 'practitioners', component: () => import('@/views/practitioners/PractitionerListView.vue'), meta: { permission: P.practitionerRead, title: 'Personal clínico' } },
      { path: 'personal/nuevo', name: 'practitioner-new', component: () => import('@/views/practitioners/PractitionerFormView.vue'), meta: { permission: P.practitionerWrite, title: 'Nuevo profesional' } },
      { path: 'personal/:id', name: 'practitioner', component: () => import('@/views/practitioners/PractitionerDetailView.vue'), props: true, meta: { permission: P.practitionerRead, title: 'Profesional' } },
      { path: 'personal/:id/editar', name: 'practitioner-edit', component: () => import('@/views/practitioners/PractitionerFormView.vue'), props: true, meta: { permission: P.practitionerWrite, title: 'Editar profesional' } },

      { path: 'consultorios', name: 'offices', component: () => import('@/views/offices/OfficeListView.vue'), meta: { permission: P.officeRead, title: 'Consultorios' } },

      { path: 'usuarios', name: 'users', component: () => import('@/views/users/UserListView.vue'), meta: { permission: P.usersRead, title: 'Usuarios' } },
      { path: 'usuarios/nuevo', name: 'user-new', component: () => import('@/views/users/UserFormView.vue'), meta: { permission: P.usersManage, title: 'Crear usuario' } },
      { path: 'usuarios/:id', name: 'user', component: () => import('@/views/users/UserDetailView.vue'), props: true, meta: { permission: P.usersRead, title: 'Usuario' } },
      { path: 'roles', name: 'roles', component: () => import('@/views/users/RolesView.vue'), meta: { permission: P.profilesRead, title: 'Roles y permisos' } },

      { path: 'mi-perfil', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { title: 'Mi perfil' } },
      soon('Agenda odontológica', 'agenda', 'pi pi-calendar'),
      { path: 'dentigrama', name: 'odontogram', component: () => import('@/views/odontogram/OdontogramView.vue'), meta: { permission: P.odontogramRead, title: 'Dentigrama digital' } },
      soon('Tratamientos', 'tratamientos', 'pi pi-briefcase'),
      soon('Presupuestos', 'presupuestos', 'pi pi-file'),
      soon('Reportes', 'reportes', 'pi pi-chart-bar'),
      { path: 'sin-permiso', name: 'forbidden', component: () => import('@/views/ForbiddenView.vue'), meta: { title: 'Sin permiso' } },
      { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue'), meta: { title: 'No encontrado' } },
    ],
  },
]

export const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()
  if (to.meta.public) return auth.isAuthenticated && to.name === 'login' ? { name: 'home' } : true
  if (!auth.isAuthenticated) return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  if (!auth.can(to.meta.permission)) return { name: 'forbidden' }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Sistema Odontológico` : 'Sistema Odontológico'
})
