import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import 'primeicons/primeicons.css'
import './styles/main.css'
import App from './App.vue'
import { router } from './router'
import { DentalPreset, esLocale } from './theme'
import { installSessionHandling } from './stores/auth'
import { initTheme } from './composables/useTheme'

initTheme()
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: { preset: DentalPreset, options: { darkModeSelector: '.app-dark', cssLayer: false } },
  locale: esLocale,
  ripple: true,
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)

installSessionHandling(() => {
  const current = router.currentRoute.value
  if (!current.meta.public) router.push({ name: 'login', query: { redirect: current.fullPath, expired: '1' } })
})

app.mount('#app')
