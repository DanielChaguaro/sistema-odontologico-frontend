<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import Button from 'primevue/button'
import { P } from '@/auth/permissions'
import { useAuthStore } from '@/stores/auth'
import BrandMark from '@/components/BrandMark.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

interface NavItem { label: string; icon: string; to: string; permission?: string | string[]; soon?: boolean }

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const mobileOpen = ref(false)
const userMenu = ref<InstanceType<typeof Menu>>()

const sections: { title?: string; items: NavItem[] }[] = [
  { items: [{ label: 'Inicio', icon: 'pi pi-home', to: '/' }] },
  {
    title: 'Atención clínica',
    items: [
      { label: 'Pacientes', icon: 'pi pi-users', to: '/pacientes', permission: P.patientRead },
      { label: 'Agenda', icon: 'pi pi-calendar', to: '/agenda', soon: true },
      { label: 'Dentigrama', icon: 'pi pi-th-large', to: '/dentigrama', soon: true },
      { label: 'Tratamientos', icon: 'pi pi-briefcase', to: '/tratamientos', soon: true },
      { label: 'Presupuestos', icon: 'pi pi-file', to: '/presupuestos', soon: true },
    ],
  },
  {
    title: 'Consultorio',
    items: [
      { label: 'Personal clínico', icon: 'pi pi-id-card', to: '/personal', permission: P.practitionerRead },
      { label: 'Consultorios', icon: 'pi pi-building', to: '/consultorios', permission: P.officeRead },
      { label: 'Reportes', icon: 'pi pi-chart-bar', to: '/reportes', soon: true },
    ],
  },
  {
    title: 'Administración',
    items: [
      { label: 'Usuarios', icon: 'pi pi-user-edit', to: '/usuarios', permission: P.usersRead },
      { label: 'Roles y permisos', icon: 'pi pi-shield', to: '/roles', permission: P.profilesRead },
    ],
  },
]

const visibleSections = computed(() =>
  sections
    .map((s) => ({ ...s, items: s.items.filter((i) => auth.can(i.permission)) }))
    .filter((s) => s.items.length > 0),
)

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

const userMenuItems = [
  { label: 'Mi perfil', icon: 'pi pi-user', command: () => router.push('/mi-perfil') },
  { separator: true },
  { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: logout },
]

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

watch(() => route.fullPath, () => (mobileOpen.value = false))
</script>

<template>
  <div class="layout" :class="{ 'mobile-open': mobileOpen }">
    <aside class="sidebar">
      <RouterLink to="/" class="brand">
        <BrandMark />
      </RouterLink>
      <p class="brand-sub">Integrado a DoctorKyn</p>

      <nav class="nav">
        <div v-for="(section, index) in visibleSections" :key="index" class="nav-section">
          <p v-if="section.title" class="nav-title">{{ section.title }}</p>
          <RouterLink v-for="item in section.items" :key="item.to" :to="item.to" class="nav-item" :class="{ active: isActive(item.to) }">
            <i :class="item.icon" />
            <span>{{ item.label }}</span>
            <span v-if="item.soon" class="soon">Pronto</span>
          </RouterLink>
        </div>
      </nav>

      <div class="nav-footer">
        <RouterLink to="/mi-perfil" class="nav-item" :class="{ active: isActive('/mi-perfil') }"><i class="pi pi-cog" /><span>Mi perfil</span></RouterLink>
        <button type="button" class="nav-item as-button" @click="logout"><i class="pi pi-sign-out" /><span>Cerrar sesión</span></button>
      </div>
    </aside>
    <div class="backdrop" @click="mobileOpen = false" />

    <div class="main">
      <header class="topbar">
        <Button class="menu-toggle" icon="pi pi-bars" text rounded aria-label="Abrir menú" @click="mobileOpen = !mobileOpen" />
        <div class="spacer" />
        <ThemeToggle />
        <button type="button" class="user-chip" aria-haspopup="true" @click="userMenu?.toggle($event)">
          <Avatar :label="auth.userInitials" shape="circle" class="user-avatar" />
          <span class="user-text">
            <strong>{{ auth.displayName || auth.me?.user.userName }}</strong>
            <small>{{ auth.roleLabel }}</small>
          </span>
          <i class="pi pi-angle-down muted" />
        </button>
        <Menu ref="userMenu" :model="userMenuItems" popup />
      </header>

      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; display: flex; }
.sidebar {
  width: var(--app-sidebar-width); flex-shrink: 0; background: var(--brand-gradient); color: #d6e9e6;
  display: flex; flex-direction: column; padding: 1.25rem 0.85rem 1rem; position: sticky; top: 0; height: 100vh; z-index: 30;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.06);
}
.brand { padding: 0 0.5rem; color: inherit; }
.brand-sub { margin: 0.6rem 0 1.4rem; padding: 0 0.55rem; font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brand-mint); }
.nav { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; scrollbar-color: rgba(255,255,255,0.15) transparent; }
.nav-title { margin: 0 0 0.3rem; padding: 0 0.75rem; font-size: 0.66rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(214, 233, 230, 0.55); }
.nav-item {
  display: flex; align-items: center; gap: 0.7rem; padding: 0.55rem 0.75rem; border-radius: 9px; color: #d6e9e6; font-weight: 500;
  width: 100%; font-size: 0.88rem; position: relative; transition: background-color 0.15s, color 0.15s;
}
.nav-item:hover { background: rgba(255, 255, 255, 0.07); color: #ffffff; }
.nav-item.active { background: rgba(127, 209, 197, 0.16); color: #ffffff; }
.nav-item.active::before {
  content: ''; position: absolute; left: -0.85rem; top: 22%; bottom: 22%; width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-mint);
}
.nav-item .pi { font-size: 0.95rem; width: 1.1rem; opacity: 0.9; }
.nav-item.active .pi { color: var(--brand-mint); opacity: 1; }
.nav-item .soon { margin-left: auto; font-size: 0.6rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.12rem 0.45rem; border-radius: 999px; background: rgba(255,255,255,0.08); color: rgba(214,233,230,0.7); }
.as-button { border: 0; background: none; cursor: pointer; font-family: inherit; text-align: left; }
.nav-footer { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.15rem; }

.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.topbar {
  height: 64px; background: color-mix(in srgb, var(--app-bg) 82%, transparent); backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--app-border); display: flex; align-items: center; padding: 0 1.5rem; gap: 0.5rem;
  position: sticky; top: 0; z-index: 20;
}
.spacer { flex: 1; }
.user-chip { display: flex; align-items: center; gap: 0.6rem; border: 0; background: none; cursor: pointer; padding: 0.3rem 0.5rem; border-radius: 10px; font-family: inherit; color: var(--app-text); }
.user-chip:hover { background: var(--app-hover); }
.user-avatar { background: var(--app-primary-soft); color: var(--app-accent); font-weight: 600; }
.user-text { display: flex; flex-direction: column; text-align: left; line-height: 1.2; }
.user-text strong { font-size: 0.85rem; color: var(--app-heading); }
.user-text small { font-size: 0.75rem; color: var(--app-muted); }
.content { padding: 2rem 1.75rem; max-width: 1440px; width: 100%; margin: 0 auto; }
.menu-toggle { display: none; }
.backdrop { display: none; }

@media (max-width: 960px) {
  .sidebar { position: fixed; left: 0; transform: translateX(-100%); transition: transform 0.2s ease; box-shadow: 0 0 40px rgba(0,0,0,0.35); }
  .mobile-open .sidebar { transform: translateX(0); }
  .mobile-open .backdrop { display: block; position: fixed; inset: 0; background: rgba(4, 12, 13, 0.5); z-index: 25; }
  .menu-toggle { display: inline-flex; }
  .topbar { padding: 0 0.75rem; }
  .content { padding: 1.25rem 1rem; }
  .user-text { display: none; }
}
</style>
