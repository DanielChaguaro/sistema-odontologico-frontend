<template>
  <div class="card msg">
    <i class="pi pi-compass" />
    <h1>Página no encontrada</h1>
    <p class="muted">La dirección no existe o fue movida.</p>
    <RouterLink to="/">Volver al inicio</RouterLink>
  </div>
</template>

<style scoped>
.msg { text-align: center; padding: 3rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
.msg .pi { font-size: 2rem; color: var(--app-muted); }
</style>
