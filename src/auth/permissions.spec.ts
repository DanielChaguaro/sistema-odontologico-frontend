import { describe, expect, it } from 'vitest'
import { hasPermission, P } from './permissions'

describe('hasPermission', () => {
  const granted = new Set<string>([P.patientRead])

  it('permite rutas sin permiso requerido', () => expect(hasPermission(granted, false, undefined)).toBe(true))
  it('usa los permisos efectivos del usuario', () => {
    expect(hasPermission(granted, false, P.patientRead)).toBe(true)
    expect(hasPermission(granted, false, P.patientWrite)).toBe(false)
  })
  it('acepta cualquiera de una lista', () => expect(hasPermission(granted, false, [P.patientWrite, P.patientRead])).toBe(true))
  it('el super administrador pasa todas las verificaciones', () => expect(hasPermission(new Set(), true, P.usersManage)).toBe(true))
})
