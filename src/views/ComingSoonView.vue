<script setup lang="ts">
defineProps<{ title: string; icon: string }>()
</script>

<template>
  <div class="page">
    <div class="card placeholder">
      <span class="icon"><i :class="icon" /></span>
      <h1>{{ title }}</h1>
      <p class="muted">Este módulo forma parte de los siguientes sprints del proyecto y aún no está disponible.</p>
      <RouterLink to="/">Volver al inicio</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.placeholder { text-align: center; padding: 3rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.icon { width: 64px; height: 64px; border-radius: 18px; background: var(--app-primary-soft); color: var(--app-primary); display: grid; place-items: center; font-size: 1.6rem; }
</style>
