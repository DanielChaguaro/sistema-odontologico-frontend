<script setup lang="ts">
/** Etiqueta + control + mensaje de error/ayuda con el mismo aspecto en todos los formularios. */
defineProps<{ label: string; for?: string; required?: boolean; error?: string; hint?: string }>()
</script>

<template>
  <div class="field">
    <label :for="$props.for">{{ label }}<span v-if="required" class="req">*</span></label>
    <slot />
    <small v-if="error" class="error">{{ error }}</small>
    <small v-else-if="hint" class="hint">{{ hint }}</small>
  </div>
</template>
