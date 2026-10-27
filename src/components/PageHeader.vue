<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; crumbs?: { label: string; to?: string }[] }>()
</script>

<template>
  <div class="page-header">
    <div>
      <div v-if="crumbs?.length" class="breadcrumb">
        <template v-for="(crumb, i) in crumbs" :key="i">
          <RouterLink v-if="crumb.to" :to="crumb.to">{{ crumb.label }}</RouterLink>
          <span v-else>{{ crumb.label }}</span>
          <span v-if="i < crumbs.length - 1"> › </span>
        </template>
      </div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <div class="actions"><slot name="actions" /></div>
  </div>
</template>
