import { describe, it, expect } from 'vitest'

describe('Date utilities', () => {
  it('parses ISO date strings correctly', () => {
    const d = new Date('2024-01-15T00:00:00Z')
    expect(d.getFullYear()).toBe(2024)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(15)
  })

  it('isoformat slice gives MM-DD', () => {
    const dateStr = '2024-06-20'
    expect(dateStr.slice(5)).toBe('06-20')
  })
})

describe('Number formatting', () => {
  it('toLocaleString returns a string', () => {
    expect(typeof (12345).toLocaleString()).toBe('string')
  })

  it('toFixed rounds correctly', () => {
    expect((3.14159).toFixed(2)).toBe('3.14')
    expect((0).toFixed(2)).toBe('0.00')
  })
})

describe('Nullish coalescing', () => {
  it('falls back on null', () => {
    const val: string | null = null
    expect(val ?? 'fallback').toBe('fallback')
  })

  it('falls back on undefined', () => {
    const val: string | undefined = undefined
    expect(val ?? 'default').toBe('default')
  })

  it('does not fall back on 0 or empty string', () => {
    const zero: number | null = 0
    const empty: string | null = ''
    expect(zero ?? -1).toBe(0)
    expect(empty ?? 'nope').toBe('')
  })
})

describe('Array operations used in reports', () => {
  it('reduce sums row_count correctly', () => {
    const datasets = [{ row_count: 100 }, { row_count: 250 }, { row_count: undefined }]
    const total = datasets.reduce((s, d) => s + (d.row_count ?? 0), 0)
    expect(total).toBe(350)
  })

  it('filter removes inactive items', () => {
    const users = [
      { is_active: true },
      { is_active: false },
      { is_active: true },
    ]
    expect(users.filter((u) => u.is_active)).toHaveLength(2)
  })
})
