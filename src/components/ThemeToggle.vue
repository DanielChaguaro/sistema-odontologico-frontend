<script setup lang="ts">
import Button from 'primevue/button'
import { useTheme } from '@/composables/useTheme'

const theme = useTheme()
</script>

<template>
  <Button :icon="theme.isDark.value ? 'pi pi-sun' : 'pi pi-moon'" text rounded severity="secondary"
          :aria-label="theme.isDark.value ? 'Usar tema claro' : 'Usar tema oscuro'"
          v-tooltip.bottom="theme.isDark.value ? 'Tema claro' : 'Tema oscuro'" @click="theme.toggle()" />
</template>
