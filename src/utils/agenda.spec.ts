import { describe, expect, it } from 'vitest'
import { addDays, dayOfWeek, hhmm, layoutDay, minutesOfDay, monthGrid, parseLocal, startOfWeek, toLocalIso } from './agenda'

const at = (start: string, end: string) => ({ startAt: `2026-11-09T${start}:00`, endAt: `2026-11-09T${end}:00` })

describe('fechas locales de la agenda', () => {
  it('convierte sin desplazar la zona horaria', () => {
    const date = parseLocal('2026-11-09T09:30:00')
    expect(date.getHours()).toBe(9)
    expect(toLocalIso(date)).toBe('2026-11-09T09:30:00')
    expect(hhmm('2026-11-09T09:30:00')).toBe('09:30')
    expect(minutesOfDay('2026-11-09T09:30:00')).toBe(570)
  })

  it('la semana empieza en lunes', () => {
    expect(startOfWeek(new Date(2026, 10, 15)).getDate()).toBe(9) // domingo 15 -> lunes 9
    expect(startOfWeek(new Date(2026, 10, 9)).getDate()).toBe(9)
    expect(dayOfWeek(new Date(2026, 10, 9))).toBe('MONDAY')
    expect(addDays(new Date(2026, 10, 30), 1).getMonth()).toBe(11)
  })

  it('el mes se muestra en seis semanas completas', () => {
    const grid = monthGrid(new Date(2026, 10, 20))
    expect(grid).toHaveLength(42)
    expect(dayOfWeek(grid[0]!)).toBe('MONDAY')
    expect(grid[0]!.getDate()).toBe(26) // lunes 26 de octubre
  })
})

describe('layoutDay', () => {
  it('citas que no se cruzan ocupan todo el ancho', () => {
    const placed = layoutDay([at('09:00', '09:30'), at('09:30', '10:00')])
    expect(placed.map((p) => [p.lane, p.lanes])).toEqual([[0, 1], [0, 1]])
  })

  it('citas simultáneas se reparten en carriles y reutilizan los libres', () => {
    const placed = layoutDay([at('09:00', '10:00'), at('09:15', '09:45'), at('09:45', '10:30'), at('11:00', '11:30')])
    expect(placed.map((p) => [p.lane, p.lanes])).toEqual([[0, 2], [1, 2], [1, 2], [0, 1]])
  })
})
