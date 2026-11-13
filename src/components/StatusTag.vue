<script setup lang="ts">
import Tag from 'primevue/tag'

defineProps<{ active: boolean; activeLabel?: string; inactiveLabel?: string }>()
</script>

<template>
  <Tag :severity="active ? 'success' : 'secondary'" :value="active ? (activeLabel ?? 'Activo') : (inactiveLabel ?? 'Inactivo')" rounded />
</template>
