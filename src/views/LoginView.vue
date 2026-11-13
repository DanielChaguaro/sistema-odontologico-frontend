<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import BrandMark from '@/components/BrandMark.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'
import { toApiError } from '@/api/http'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(route.query.expired ? 'Su sesión expiró. Inicie sesión nuevamente.' : '')

async function submit() {
  if (!username.value.trim() || !password.value) {
    error.value = 'Ingrese su usuario y contraseña.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    router.replace(redirect)
  } catch (e) {
    error.value = toApiError(e).message
  } finally {
    loading.value = false
  }
}

/** Arcada decorativa: 14 piezas sobre una semielipse, orientadas según la tangente. */
const arch = Array.from({ length: 14 }, (_, i) => {
  const t = Math.PI * (0.06 + (0.88 * i) / 13)
  const x = 210 - Math.cos(t) * 170
  const y = 40 + Math.sin(t) * 150
  const angle = (Math.atan2(Math.cos(t) * 150, -Math.sin(t) * 170) * 180) / Math.PI + 90
  const width = 18 + Math.sin(t) * 10
  return { x, y, angle, width }
})
</script>

<template>
  <div class="login">
    <section class="hero">
      <BrandMark />
      <div class="hero-copy">
        <span class="eyebrow">Plataforma DoctorKyn · Odontología</span>
        <h1 class="serif">Cada pieza dental,<br />en un solo registro.</h1>
        <p>Dentigrama digital, historia clínica, agenda y reportes integrados al ecosistema clínico de su consultorio.</p>
      </div>
      <svg class="arch" viewBox="0 0 420 220" aria-hidden="true">
        <rect v-for="(t, i) in arch" :key="i" :x="t.x - t.width / 2" :y="t.y - 13" :width="t.width" height="26" rx="8"
              :transform="`rotate(${t.angle} ${t.x} ${t.y})`" />
      </svg>
      <p class="hero-foot">Acceso exclusivo para cuentas habilitadas.</p>
    </section>

    <section class="panel">
      <div class="panel-tools"><ThemeToggle /></div>
      <div class="form-wrap">
        <span class="eyebrow">Bienvenido</span>
        <h2>Iniciar sesión</h2>
        <p class="muted lead">Ingrese con las credenciales de su cuenta.</p>

        <form class="form-card" novalidate @submit.prevent="submit">
          <Message v-if="error" severity="error" :closable="false" class="msg">{{ error }}</Message>
          <div class="field">
            <label for="username">Usuario</label>
            <InputText id="username" v-model="username" autocomplete="username" autofocus fluid />
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <Password input-id="password" v-model="password" :feedback="false" toggle-mask autocomplete="current-password" fluid />
          </div>
          <Button type="submit" label="Ingresar" icon="pi pi-arrow-right" icon-pos="right" :loading="loading" fluid class="submit" />
        </form>

        <p class="note"><i class="pi pi-lock" /> No hay registro público. Si olvidó su contraseña o su cuenta requiere acciones adicionales, consulte al administrador del consultorio.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 47fr) minmax(0, 53fr); background: var(--app-bg); }

.hero {
  background: var(--brand-gradient); color: #d9ecea; padding: 2rem; display: flex; flex-direction: column;
  justify-content: space-between; position: relative; overflow: hidden;
}
.hero::after {
  content: ''; position: absolute; inset: auto -20% -35% auto; width: 70%; aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle, rgba(127, 209, 197, 0.12), transparent 65%); pointer-events: none;
}
.hero-copy { max-width: 30rem; position: relative; z-index: 1; }
.hero .eyebrow { color: var(--brand-mint); }
.hero h1 { color: #f6fbfa; font-size: clamp(2.2rem, 3.6vw, 3.1rem); line-height: 1.12; margin: 1rem 0 1.25rem; }
.hero p { font-size: 0.95rem; line-height: 1.6; color: #cfe4e1; margin: 0; }
.hero-foot { font-size: 0.78rem; color: var(--brand-mint) !important; position: relative; z-index: 1; }
.arch { position: absolute; right: -4%; bottom: 9%; width: 58%; max-width: 440px; opacity: 0.5; }
.arch rect { fill: none; stroke: var(--brand-mint); stroke-width: 1.2; stroke-opacity: 0.45; }

.panel { position: relative; display: grid; place-items: center; padding: 2rem 1.25rem; }
.panel-tools { position: absolute; top: 1rem; right: 1rem; }
.form-wrap { width: 100%; max-width: 380px; }
.form-wrap h2 { font-size: 1.6rem; font-weight: 700; margin: 0.6rem 0 0.4rem; letter-spacing: -0.01em; }
.lead { margin: 0 0 1.5rem; }
.form-card {
  display: flex; flex-direction: column; gap: 1.1rem; padding: 1.4rem 1.25rem; border-radius: 12px;
  background: var(--app-surface); border: 1px solid var(--app-border); box-shadow: var(--app-shadow);
}
.submit { margin-top: 0.2rem; }
.msg { margin: 0; }
.note { display: flex; gap: 0.5rem; font-size: 0.75rem; line-height: 1.5; color: var(--app-muted); margin: 1rem 0 0; }
.note .pi { font-size: 0.75rem; margin-top: 0.2rem; }

@media (max-width: 900px) {
  .login { grid-template-columns: 1fr; }
  .hero { min-height: 15rem; padding: 1.5rem; }
  .hero-copy p, .arch { display: none; }
  .hero h1 { font-size: 1.9rem; margin-bottom: 0; }
}
</style>
