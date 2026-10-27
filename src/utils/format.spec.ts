import { describe, expect, it } from 'vitest'
import { describeAudit, formatDate, toIsoDate } from './format'

describe('describeAudit', () => {
  it('traduce campos actualizados', () => expect(describeAudit('UPDATE', 'fields=phone,allergies')).toBe('Campos: teléfono, alergias'))
  it('traduce consentimientos', () =>
    expect(describeAudit('CONSENT', 'TRATAMIENTO_DATOS=true')).toBe('Tratamiento de datos personales: otorgado'))
  it('traduce cambios de estado', () => expect(describeAudit('STATUS_CHANGED', 'ACTIVE->INACTIVE')).toBe('Activo → Inactivo'))
  it('sin detalle devuelve vacío', () => expect(describeAudit('READ', null)).toBe(''))
})

describe('fechas', () => {
  it('no corre la fecha por zona horaria', () => {
    expect(toIsoDate(new Date(1994, 2, 15))).toBe('1994-03-15')
    expect(formatDate('1994-03-15')).toContain('1994')
  })
})
