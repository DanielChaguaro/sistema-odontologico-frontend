<template>
  <div class="card msg">
    <i class="pi pi-lock" />
    <h1>No tiene permiso para ver esta sección</h1>
    <p class="muted">Si necesita acceso, solicítelo al administrador del consultorio.</p>
    <RouterLink to="/">Volver al inicio</RouterLink>
  </div>
</template>

<style scoped>
.msg { text-align: center; padding: 3rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
.msg .pi { font-size: 2rem; color: var(--app-muted); }
</style>
