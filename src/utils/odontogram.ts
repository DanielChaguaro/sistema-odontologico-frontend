import type { Dentition, FindingScope, FindingType, FindingView, ToothSurface } from '@/types/api'

/**
 * Dentigrama (RF-03): notación FDI, disposición de las arcadas y simbología del odontograma del
 * MSP Ecuador (formulario 033): rojo = patología o procedimiento por realizar, azul = realizado.
 */

/** Tokens CSS: el tono se ajusta al tema sin perder la convención rojo/azul. */
export const RED = 'var(--msp-red)'
export const BLUE = 'var(--msp-blue)'

export type SymbolKind = 'fill' | 'x' | 'x-circle' | 'triangle' | 'circle' | 'asterisk' | 'bridge' | 'removable'

export interface FindingInfo { label: string; short: string; scope: FindingScope; color: string; symbol: SymbolKind; group: 'pending' | 'done' }

export const findingCatalog: Record<FindingType, FindingInfo> = {
  CARIES: { label: 'Caries', short: 'Caries', scope: 'SURFACE', color: RED, symbol: 'fill', group: 'pending' },
  SELLANTE_NECESARIO: { label: 'Sellante necesario', short: 'Sellante', scope: 'TOOTH', color: RED, symbol: 'asterisk', group: 'pending' },
  EXTRACCION_INDICADA: { label: 'Extracción indicada', short: 'Extracción', scope: 'TOOTH', color: RED, symbol: 'x', group: 'pending' },
  ENDODONCIA_NECESARIA: { label: 'Endodoncia por realizar', short: 'Endodoncia', scope: 'TOOTH', color: RED, symbol: 'triangle', group: 'pending' },
  CORONA_NECESARIA: { label: 'Corona por realizar', short: 'Corona', scope: 'TOOTH', color: RED, symbol: 'circle', group: 'pending' },
  PROTESIS_FIJA_NECESARIA: { label: 'Prótesis fija por realizar', short: 'P. fija', scope: 'TOOTH', color: RED, symbol: 'bridge', group: 'pending' },
  PROTESIS_REMOVIBLE_NECESARIA: { label: 'Prótesis removible por realizar', short: 'P. removible', scope: 'TOOTH', color: RED, symbol: 'removable', group: 'pending' },
  OBTURACION: { label: 'Obturación', short: 'Obturación', scope: 'SURFACE', color: BLUE, symbol: 'fill', group: 'done' },
  SELLANTE_REALIZADO: { label: 'Sellante realizado', short: 'Sellante', scope: 'TOOTH', color: BLUE, symbol: 'asterisk', group: 'done' },
  PERDIDA_POR_CARIES: { label: 'Pérdida por caries', short: 'Pérdida caries', scope: 'TOOTH', color: BLUE, symbol: 'x', group: 'done' },
  PERDIDA_OTRA_CAUSA: { label: 'Pérdida por otra causa', short: 'Pérdida otra', scope: 'TOOTH', color: BLUE, symbol: 'x-circle', group: 'done' },
  ENDODONCIA_REALIZADA: { label: 'Endodoncia realizada', short: 'Endodoncia', scope: 'TOOTH', color: BLUE, symbol: 'triangle', group: 'done' },
  CORONA_REALIZADA: { label: 'Corona realizada', short: 'Corona', scope: 'TOOTH', color: BLUE, symbol: 'circle', group: 'done' },
  PROTESIS_FIJA_REALIZADA: { label: 'Prótesis fija realizada', short: 'P. fija', scope: 'TOOTH', color: BLUE, symbol: 'bridge', group: 'done' },
  PROTESIS_REMOVIBLE_REALIZADA: { label: 'Prótesis removible realizada', short: 'P. removible', scope: 'TOOTH', color: BLUE, symbol: 'removable', group: 'done' },
}

export const FINDING_TYPES = Object.keys(findingCatalog) as FindingType[]

export const isLoss = (type: FindingType) => type === 'PERDIDA_POR_CARIES' || type === 'PERDIDA_OTRA_CAUSA'

export const surfaceLabels: Record<ToothSurface, string> = {
  VESTIBULAR: 'Vestibular', LINGUAL: 'Lingual / palatino', MESIAL: 'Mesial', DISTAL: 'Distal', OCLUSAL: 'Oclusal / incisal',
}

export const dentitionLabels: Record<Dentition, string> = { PERMANENT: 'Permanente', TEMPORARY: 'Temporal', MIXED: 'Mixta' }

/** Dentición sugerida por edad: temporal antes de los 6 años, mixta hasta los 12. */
export const suggestedDentition = (age: number): Dentition => (age < 6 ? 'TEMPORARY' : age <= 12 ? 'MIXED' : 'PERMANENT')

// ---------- Notación FDI ----------

export const isPermanent = (fdi: number) => { const q = Math.floor(fdi / 10), p = fdi % 10; return q >= 1 && q <= 4 && p >= 1 && p <= 8 }
export const isPrimary = (fdi: number) => { const q = Math.floor(fdi / 10), p = fdi % 10; return q >= 5 && q <= 8 && p >= 1 && p <= 5 }
export const quadrant = (fdi: number) => Math.floor(fdi / 10)
/** Arcada superior: cuadrantes 1, 2, 5 y 6. */
export const isUpper = (fdi: number) => [1, 2, 5, 6].includes(quadrant(fdi))
/** Lado derecho del paciente (se dibuja a la izquierda del dentigrama): cuadrantes 1, 4, 5 y 8. */
export const isPatientRight = (fdi: number) => [1, 4, 5, 8].includes(quadrant(fdi))

const permanentNames = ['', 'Incisivo central', 'Incisivo lateral', 'Canino', 'Primer premolar', 'Segundo premolar', 'Primer molar', 'Segundo molar', 'Tercer molar']
const primaryNames = ['', 'Incisivo central temporal', 'Incisivo lateral temporal', 'Canino temporal', 'Primer molar temporal', 'Segundo molar temporal']
const quadrantNames = ['', 'superior derecho', 'superior izquierdo', 'inferior izquierdo', 'inferior derecho']

export function toothName(fdi: number): string {
  const q = quadrant(fdi), p = fdi % 10
  const name = isPrimary(fdi) ? primaryNames[p] : permanentNames[p]
  return `${name} ${quadrantNames[q > 4 ? q - 4 : q]}`
}

const range = (from: number, to: number) => {
  const step = from <= to ? 1 : -1
  return Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + i * step)
}

/** Filas del dentigrama vistas de frente: lado derecho del paciente a la izquierda; dos mitades por fila. */
export interface ArchRow { key: string; left: number[]; right: number[]; upper: boolean; primary: boolean }

const ROWS = {
  permanentUpper: { key: 'pu', left: range(18, 11), right: range(21, 28), upper: true, primary: false },
  primaryUpper: { key: 'tu', left: range(55, 51), right: range(61, 65), upper: true, primary: true },
  primaryLower: { key: 'tl', left: range(85, 81), right: range(71, 75), upper: false, primary: true },
  permanentLower: { key: 'pl', left: range(48, 41), right: range(31, 38), upper: false, primary: false },
} satisfies Record<string, ArchRow>

export function archRows(dentition: Dentition): ArchRow[] {
  if (dentition === 'PERMANENT') return [ROWS.permanentUpper, ROWS.permanentLower]
  if (dentition === 'TEMPORARY') return [ROWS.primaryUpper, ROWS.primaryLower]
  return [ROWS.permanentUpper, ROWS.primaryUpper, ROWS.primaryLower, ROWS.permanentLower]
}

export const belongsTo = (fdi: number, dentition: Dentition) =>
  dentition === 'PERMANENT' ? isPermanent(fdi) : dentition === 'TEMPORARY' ? isPrimary(fdi) : isPermanent(fdi) || isPrimary(fdi)

// ---------- Caras del diagrama de cinco secciones ----------

export type Region = 'top' | 'bottom' | 'left' | 'right' | 'center'

/**
 * Cara anatómica de cada región del cuadro. Vestibular queda hacia afuera de la arcada (arriba en la
 * superior, abajo en la inferior) y mesial hacia la línea media.
 */
export function regionSurface(fdi: number, region: Region): ToothSurface {
  if (region === 'center') return 'OCLUSAL'
  if (region === 'top') return isUpper(fdi) ? 'VESTIBULAR' : 'LINGUAL'
  if (region === 'bottom') return isUpper(fdi) ? 'LINGUAL' : 'VESTIBULAR'
  const towardMidline = isPatientRight(fdi) ? 'right' : 'left'
  return region === towardMidline ? 'MESIAL' : 'DISTAL'
}

// ---------- Estado y comparación ----------

export function findingsByTooth(findings: FindingView[]): Map<number, FindingView[]> {
  const map = new Map<number, FindingView[]>()
  for (const f of findings) map.set(f.fdiCode, [...(map.get(f.fdiCode) ?? []), f])
  return map
}

export interface StateDiff { added: FindingView[]; removed: FindingView[]; changedTeeth: Set<number> }

/** Diferencias entre el estado bucal de dos consultas: hallazgos nuevos y hallazgos que dejaron de estar presentes. */
export function diffStates(before: FindingView[], after: FindingView[]): StateDiff {
  const beforeIds = new Set(before.map((f) => f.id))
  const afterIds = new Set(after.map((f) => f.id))
  const added = after.filter((f) => !beforeIds.has(f.id))
  const removed = before.filter((f) => !afterIds.has(f.id))
  return { added, removed, changedTeeth: new Set([...added, ...removed].map((f) => f.fdiCode)) }
}

/** Indicadores del resumen inferior del dentigrama (como en el prototipo de la tesis). */
export function summarize(findings: FindingView[], dentition: Dentition) {
  const teeth = new Set(findingsByTooth(findings).keys())
  const count = (types: FindingType[]) => new Set(findings.filter((f) => types.includes(f.type)).map((f) => f.fdiCode)).size
  const total = archRows(dentition).reduce((n, row) => n + row.left.length + row.right.length, 0)
  return [
    { label: 'Sin hallazgos', value: total - teeth.size },
    { label: 'Con caries', value: count(['CARIES']) },
    { label: 'Obturadas', value: count(['OBTURACION']) },
    { label: 'Endodoncias', value: count(['ENDODONCIA_NECESARIA', 'ENDODONCIA_REALIZADA']) },
    { label: 'Extracción indicada', value: count(['EXTRACCION_INDICADA']) },
    { label: 'Ausentes', value: count(['PERDIDA_POR_CARIES', 'PERDIDA_OTRA_CAUSA']) },
  ]
}

export function describeFinding(f: Pick<FindingView, 'type' | 'surface'>): string {
  const info = findingCatalog[f.type]
  return f.surface ? `${info.label} · ${surfaceLabels[f.surface]}` : info.label
}
