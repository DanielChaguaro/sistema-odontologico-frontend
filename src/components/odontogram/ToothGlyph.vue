<script setup lang="ts">
import { computed } from 'vue'
import type { FindingType, ToothSurface } from '@/types/api'
import { findingCatalog, isLoss, isUpper, regionSurface, surfaceLabels, type Region } from '@/utils/odontogram'

/** Una pieza dental: cuadro de cinco caras con los símbolos del odontograma MSP superpuestos. */
const props = withDefaults(defineProps<{
  fdi: number
  findings: { type: FindingType; surface: ToothSurface | null }[]
  x?: number
  y?: number
  size?: number
  interactive?: boolean
  selected?: boolean
  changed?: boolean
}>(), { x: 0, y: 0, size: 34, interactive: false, selected: false, changed: false })

const emit = defineEmits<{ regionClick: [region: Region] }>()

const s = computed(() => props.size)
const q = computed(() => props.size / 4)

const regions = computed(() => {
  const S = s.value, Q = q.value
  const polygons: Record<Exclude<Region, 'center'>, string> = {
    top: `0,0 ${S},0 ${S - Q},${Q} ${Q},${Q}`,
    bottom: `0,${S} ${S},${S} ${S - Q},${S - Q} ${Q},${S - Q}`,
    left: `0,0 ${Q},${Q} ${Q},${S - Q} 0,${S}`,
    right: `${S},0 ${S - Q},${Q} ${S - Q},${S - Q} ${S},${S}`,
  }
  return (['top', 'bottom', 'left', 'right', 'center'] as Region[]).map((region) => ({
    region,
    surface: regionSurface(props.fdi, region),
    points: region === 'center' ? null : polygons[region],
  }))
})

/** Color de cada cara: la caries (pendiente) prevalece sobre la obturación al dibujar. */
const surfaceFill = computed(() => {
  const fill: Partial<Record<ToothSurface, string>> = {}
  for (const f of props.findings) {
    if (!f.surface) continue
    if (!fill[f.surface] || f.type === 'CARIES') fill[f.surface] = findingCatalog[f.type].color
  }
  return fill
})

const lost = computed(() => props.findings.some((f) => isLoss(f.type)))
const symbols = computed(() => props.findings.filter((f) => !f.surface).map((f) => ({ type: f.type, ...findingCatalog[f.type] })))
/** Las prótesis se dibujan del lado del plano oclusal: debajo en la arcada superior, encima en la inferior. */
const prosthesisY = computed(() => (isUpper(props.fdi) ? s.value + 5 : -5))

const regionFill = (surface: ToothSurface) => surfaceFill.value[surface] ?? (lost.value ? 'var(--tooth-lost)' : 'var(--tooth-face)')
const asteriskArms = [0, 60, 120].map((deg) => (deg * Math.PI) / 180)
</script>

<template>
  <g :transform="`translate(${x},${y})`" :class="['tooth', { interactive, selected, lost }]">
    <title>Pieza {{ fdi }}</title>
    <rect v-if="selected || changed" :x="-4" :y="-4" :width="s + 8" :height="s + 8" rx="5"
          :class="selected ? 'selection' : 'changed'" />

    <template v-for="r in regions" :key="r.region">
      <polygon v-if="r.points" :points="r.points" :style="{ fill: regionFill(r.surface) }" class="face" @click="emit('regionClick', r.region)">
        <title>Pieza {{ fdi }} · {{ surfaceLabels[r.surface] }}</title>
      </polygon>
      <rect v-else :x="q" :y="q" :width="s / 2" :height="s / 2" :style="{ fill: regionFill(r.surface) }" class="face" @click="emit('regionClick', r.region)">
        <title>Pieza {{ fdi }} · {{ surfaceLabels[r.surface] }}</title>
      </rect>
    </template>

    <g class="symbols" pointer-events="none">
      <template v-for="sym in symbols" :key="sym.type">
        <g v-if="sym.symbol === 'x' || sym.symbol === 'x-circle'" :style="{ stroke: sym.color }" stroke-width="2.6" stroke-linecap="round">
          <line x1="3" y1="3" :x2="s - 3" :y2="s - 3" />
          <line :x1="s - 3" y1="3" x2="3" :y2="s - 3" />
          <circle v-if="sym.symbol === 'x-circle'" :cx="s / 2" :cy="s / 2" :r="s * 0.6" fill="none" stroke-width="2" />
        </g>
        <polygon v-else-if="sym.symbol === 'triangle'" :points="`${s / 2},${s * 0.12} ${s * 0.9},${s * 0.86} ${s * 0.1},${s * 0.86}`"
                 fill="none" :style="{ stroke: sym.color }" stroke-width="2.2" stroke-linejoin="round" />
        <circle v-else-if="sym.symbol === 'circle'" :cx="s / 2" :cy="s / 2" :r="s * 0.6" fill="none" :style="{ stroke: sym.color }" stroke-width="2.2" />
        <g v-else-if="sym.symbol === 'asterisk'" :style="{ stroke: sym.color }" stroke-width="2.4" stroke-linecap="round">
          <line v-for="(a, i) in asteriskArms" :key="i" :x1="s / 2 - Math.cos(a) * s * 0.18" :y1="s / 2 - Math.sin(a) * s * 0.18"
                :x2="s / 2 + Math.cos(a) * s * 0.18" :y2="s / 2 + Math.sin(a) * s * 0.18" />
        </g>
        <line v-else-if="sym.symbol === 'bridge' || sym.symbol === 'removable'" :x1="-3" :x2="s + 3" :y1="prosthesisY" :y2="prosthesisY"
              :style="{ stroke: sym.color }" stroke-width="3" :stroke-dasharray="sym.symbol === 'removable' ? '4 3' : undefined" />
      </template>
    </g>
  </g>
</template>

<style scoped>
.face { stroke: var(--tooth-stroke); stroke-width: 1; transition: filter 0.1s; }
.tooth.interactive .face { cursor: pointer; }
.tooth.interactive .face:hover { filter: brightness(0.88); stroke: var(--app-accent); stroke-width: 1.5; }
.selection { fill: var(--app-primary-soft); stroke: var(--app-accent); stroke-width: 2; }
.changed { fill: color-mix(in srgb, var(--app-warning) 14%, transparent); stroke: var(--app-warning); stroke-width: 2; stroke-dasharray: 4 2; }
</style>
