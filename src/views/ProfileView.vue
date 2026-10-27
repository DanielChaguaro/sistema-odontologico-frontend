<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Tag from 'primevue/tag'
import PageHeader from '@/components/PageHeader.vue'
import { practiceApi } from '@/api/practice'
import { useAuthStore } from '@/stores/auth'
import type { PractitionerView } from '@/types/api'
import { dayLabels, shortTime, staffTypeLabels } from '@/utils/format'

const auth = useAuthStore()
const practitioner = ref<PractitionerView | null>(null)
const specialties = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    const [mine, catalogs] = await Promise.all([practiceApi.me(), practiceApi.catalogs()])
    practitioner.value = mine
    specialties.value = Object.fromEntries(catalogs.specialties.map((s) => [s.code, s.label]))
  } catch {
    practitioner.value = null // La cuenta no está vinculada a un profesional: es un caso normal.
  }
})
</script>

<template>
  <div class="page">
    <PageHeader title="Mi perfil" subtitle="Datos de su cuenta y permisos efectivos" />

    <div class="split">
      <section class="card">
        <h2 class="card-title"><i class="pi pi-user" /> Cuenta</h2>
        <dl class="data-list">
          <div><dt>Nombre</dt><dd>{{ auth.displayName }}</dd></div>
          <div><dt>Usuario</dt><dd>{{ auth.me?.user.userName }}</dd></div>
          <div><dt>Correo</dt><dd>{{ auth.me?.user.email }}</dd></div>
          <div><dt>Rol</dt><dd>{{ auth.roleLabel }}</dd></div>
          <div class="wide">
            <dt>Permisos efectivos</dt>
            <dd class="chips">
              <Tag v-if="auth.isSuperAdmin" value="Todos (administrador de plataforma)" severity="warn" />
              <Tag v-for="p in auth.me?.permissions" :key="p" :value="p" severity="secondary" class="mono" />
            </dd>
          </div>
        </dl>
      </section>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-id-card" /> Perfil profesional</h2>
        <template v-if="practitioner">
          <dl class="data-list">
            <div><dt>Tipo</dt><dd>{{ staffTypeLabels[practitioner.staffType] }}</dd></div>
            <div v-if="practitioner.specialty"><dt>Especialidad</dt><dd>{{ specialties[practitioner.specialty] ?? practitioner.specialty }}</dd></div>
            <div v-if="practitioner.professionalRegistration"><dt>Registro profesional</dt><dd class="mono">{{ practitioner.professionalRegistration }}</dd></div>
            <div class="wide"><dt>Consultorios</dt><dd>{{ practitioner.offices.map((o) => o.name).join(', ') || '—' }}</dd></div>
            <div class="wide">
              <dt>Horario</dt>
              <dd>
                <div v-for="b in practitioner.schedule" :key="b.id">{{ dayLabels[b.dayOfWeek] }} {{ shortTime(b.startTime) }}–{{ shortTime(b.endTime) }} · {{ b.officeName }}</div>
                <span v-if="!practitioner.schedule.length" class="empty">Sin horario configurado</span>
              </dd>
            </div>
          </dl>
        </template>
        <p v-else class="empty">Su cuenta no está vinculada a un profesional del consultorio.</p>
      </section>
    </div>
  </div>
</template>
