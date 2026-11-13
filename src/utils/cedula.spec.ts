import { describe, expect, it } from 'vitest'
import { isValidCedula } from './cedula'

describe('isValidCedula', () => {
  it.each(['1710034065', '0923456784', '0102030400'])('acepta %s', (value) => {
    expect(isValidCedula(value)).toBe(true)
  })

  it.each(['1710034066', '2510034065', '1790034065', '171003406', '17A0034065', '', null])('rechaza %s', (value) => {
    expect(isValidCedula(value)).toBe(false)
  })
})
