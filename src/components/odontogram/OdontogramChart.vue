<script setup lang="ts">
import { computed } from 'vue'
import type { Dentition, FindingView } from '@/types/api'
import { archRows, findingsByTooth, type Region } from '@/utils/odontogram'
import ToothGlyph from './ToothGlyph.vue'

/** Dentigrama completo en SVG (vista de frente, lado derecho del paciente a la izquierda). */
const props = withDefaults(defineProps<{
  dentition: Dentition
  findings: FindingView[]
  selectedFdi?: number | null
  changedTeeth?: Set<number>
  interactive?: boolean
}>(), { selectedFdi: null, changedTeeth: () => new Set(), interactive: false })

const emit = defineEmits<{ toothClick: [fdi: number, region: Region] }>()

const SIZE = 34
const GAP = 8
const MIDLINE = 22
const PAD = 14
const LABEL = 16
const ARCH_GAP = 22
const HALF = 8 * SIZE + 7 * GAP
const width = 2 * HALF + MIDLINE + 2 * PAD
const midX = width / 2

const byTooth = computed(() => findingsByTooth(props.findings))

interface PlacedTooth { fdi: number; x: number; y: number; labelY: number }

const layout = computed(() => {
  const teeth: PlacedTooth[] = []
  const rows = archRows(props.dentition)
  let y = PAD
  let occlusalY = 0
  rows.forEach((row, index) => {
    if (!row.upper && rows[index - 1]?.upper) {
      occlusalY = y + ARCH_GAP / 2 - 6
      y += ARCH_GAP
    }
    const toothY = row.upper ? y + LABEL : y + 6
    const labelY = row.upper ? y + 11 : toothY + SIZE + 14
    // Distancia a la línea media: 0 = pieza más cercana (11, 21, 51...).
    row.left.forEach((fdi, i) => {
      const d = row.left.length - 1 - i
      teeth.push({ fdi, x: midX - MIDLINE / 2 - (d + 1) * SIZE - d * GAP, y: toothY, labelY })
    })
    row.right.forEach((fdi, d) => teeth.push({ fdi, x: midX + MIDLINE / 2 + d * (SIZE + GAP), y: toothY, labelY }))
    y += LABEL + SIZE + 12
  })
  return { teeth, height: y + PAD - 6, occlusalY }
})
</script>

<template>
  <div class="chart-scroll">
    <svg :viewBox="`0 0 ${width} ${layout.height}`" :style="{ minWidth: `${width * 0.85}px` }" class="chart" role="img"
         :aria-label="`Dentigrama de dentición ${dentition.toLowerCase()}`">
      <line :x1="midX" :x2="midX" :y1="PAD - 4" :y2="layout.height - PAD + 4" class="axis" />
      <line :x1="PAD" :x2="width - PAD" :y1="layout.occlusalY" :y2="layout.occlusalY" class="axis" />
      <text :x="PAD" :y="layout.occlusalY - 4" class="side">Derecha</text>
      <text :x="width - PAD" :y="layout.occlusalY - 4" class="side" text-anchor="end">Izquierda</text>

      <template v-for="t in layout.teeth" :key="t.fdi">
        <text :x="t.x + SIZE / 2" :y="t.labelY" text-anchor="middle" :class="['label', { active: t.fdi === selectedFdi }]">{{ t.fdi }}</text>
        <ToothGlyph :fdi="t.fdi" :x="t.x" :y="t.y" :size="SIZE" :findings="byTooth.get(t.fdi) ?? []" :interactive="interactive"
                    :selected="t.fdi === selectedFdi" :changed="changedTeeth.has(t.fdi)"
                    @region-click="(region) => emit('toothClick', t.fdi, region)" />
      </template>
    </svg>
  </div>
</template>

<style scoped>
.chart-scroll { overflow-x: auto; }
.chart { width: 100%; height: auto; display: block; user-select: none; }
.axis { stroke: var(--app-border); stroke-dasharray: 3 4; }
.label { font-size: 11px; fill: var(--app-muted); font-weight: 500; }
.label.active { fill: var(--app-accent); font-weight: 700; }
.side { font-size: 10px; fill: var(--app-muted); text-transform: uppercase; letter-spacing: 0.05em; }
</style>
