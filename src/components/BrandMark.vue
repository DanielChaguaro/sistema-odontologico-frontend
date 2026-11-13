<script setup lang="ts">
/** Logotipo: diente en un recuadro menta, con el nombre del sistema al lado. */
withDefaults(defineProps<{ size?: number; showName?: boolean }>(), { size: 36, showName: true })
</script>

<template>
  <span class="brand-mark">
    <span class="tile" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7.5 3.5c-2.4 0-4 1.9-4 4.4 0 2.3 1 3.6 1.6 5.6.6 2.1.9 6.9 2.6 6.9 1.6 0 1.6-4.4 2.4-5.9.4-.8 1.1-.9 1.9-.9s1.5.1 1.9.9c.8 1.5.8 5.9 2.4 5.9 1.7 0 2-4.8 2.6-6.9.6-2 1.6-3.3 1.6-5.6 0-2.5-1.6-4.4-4-4.4-1.8 0-2.7 1-4.5 1s-2.7-1-4.5-1Z" />
      </svg>
    </span>
    <span v-if="showName" class="name">Sistema<br />Odontológico</span>
  </span>
</template>

<style scoped>
.brand-mark { display: inline-flex; align-items: center; gap: 0.65rem; }
.tile {
  display: grid; place-items: center; flex-shrink: 0; border-radius: 9px; color: #f4fffd;
  background: linear-gradient(150deg, #73c3b8, var(--brand-tile)); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}
.tile svg { width: 62%; height: 62%; }
.name { font-weight: 600; font-size: 0.95rem; line-height: 1.15; color: #f2f7f6; }
</style>
