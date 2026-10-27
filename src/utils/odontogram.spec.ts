import { describe, expect, it } from 'vitest'
import type { FindingView } from '@/types/api'
import { archRows, belongsTo, diffStates, regionSurface, suggestedDentition, summarize, toothName } from './odontogram'

const finding = (id: string, fdiCode: number, type: FindingView['type'] = 'CARIES'): FindingView => ({
  id, fdiCode, type, surface: type === 'CARIES' ? 'OCLUSAL' : null, scope: type === 'CARIES' ? 'SURFACE' : 'TOOTH', notes: null,
  status: 'ACTIVE', consultationId: 'c1', consultationDate: null, resolvedConsultationId: null, resolvedAt: null, annulReason: null,
  createdBy: 'x', createdAt: '2026-01-01T09:00:00',
})

describe('notación FDI', () => {
  it('32 piezas permanentes y 20 temporales', () => {
    const count = (d: Parameters<typeof archRows>[0]) => archRows(d).reduce((n, r) => n + r.left.length + r.right.length, 0)
    expect(count('PERMANENT')).toBe(32)
    expect(count('TEMPORARY')).toBe(20)
    expect(count('MIXED')).toBe(52)
  })
  it('el lado derecho del paciente se dibuja a la izquierda', () => {
    const [upper] = archRows('PERMANENT')
    expect(upper!.left[0]).toBe(18)
    expect(upper!.right[0]).toBe(21)
  })
  it('valida la pieza según la dentición', () => {
    expect(belongsTo(75, 'PERMANENT')).toBe(false)
    expect(belongsTo(75, 'MIXED')).toBe(true)
    expect(belongsTo(19, 'MIXED')).toBe(false)
  })
  it('nombra la pieza', () => expect(toothName(36)).toBe('Primer molar inferior izquierdo'))
  it('sugiere dentición por edad', () => {
    expect(suggestedDentition(4)).toBe('TEMPORARY')
    expect(suggestedDentition(9)).toBe('MIXED')
    expect(suggestedDentition(30)).toBe('PERMANENT')
  })
})

describe('caras del diagrama', () => {
  it('vestibular hacia afuera de cada arcada', () => {
    expect(regionSurface(16, 'top')).toBe('VESTIBULAR')
    expect(regionSurface(46, 'top')).toBe('LINGUAL')
    expect(regionSurface(46, 'bottom')).toBe('VESTIBULAR')
  })
  it('mesial hacia la línea media', () => {
    expect(regionSurface(16, 'right')).toBe('MESIAL')
    expect(regionSurface(26, 'left')).toBe('MESIAL')
    expect(regionSurface(36, 'right')).toBe('DISTAL')
    expect(regionSurface(85, 'right')).toBe('MESIAL')
  })
})

describe('comparación entre consultas', () => {
  it('detecta hallazgos nuevos y resueltos', () => {
    const caries = finding('a', 36)
    const filling = finding('b', 36, 'OBTURACION')
    const crown = finding('c', 11, 'CORONA_REALIZADA')
    const diff = diffStates([caries, crown], [filling, crown])
    expect(diff.added).toEqual([filling])
    expect(diff.removed).toEqual([caries])
    expect([...diff.changedTeeth]).toEqual([36])
  })
  it('resume por pieza, no por hallazgo', () => {
    const summary = summarize([finding('a', 36), { ...finding('b', 36), surface: 'MESIAL' }, finding('c', 46, 'PERDIDA_POR_CARIES')], 'PERMANENT')
    expect(summary.find((s) => s.label === 'Con caries')!.value).toBe(1)
    expect(summary.find((s) => s.label === 'Sin hallazgos')!.value).toBe(30)
  })
})
