import { describe, expect, it } from 'vite-plus/test'
import { fmtDur, fmtMin, fmtPace, segKm, totals } from './math'

describe('math', () => {
  it('일정 속도 구간 거리 = 속도 × 시간', () => {
    expect(segKm({ from: 12, to: null, min: 15 })).toBe(3)
  })

  it('점진 구간 거리 = 평균 속도 × 시간', () => {
    expect(segKm({ from: 6, to: 11, min: 10 })).toBeCloseTo(8.5 / 6)
  })

  it('totals: 평균 속도는 총 거리 / 총 시간', () => {
    const t = totals([
      { from: 6, to: 12, min: 30 },
      { from: 12, to: null, min: 30 },
    ])
    expect(t.min).toBe(60)
    expect(t.km).toBeCloseTo(4.5 + 6)
    expect(t.avg).toBeCloseTo(10.5)
  })

  it('포맷', () => {
    expect(fmtPace(12)).toBe('5:00')
    expect(fmtPace(0)).toBe('-')
    expect(fmtDur(65.5)).toBe('1:05:30')
    expect(fmtDur(2.5)).toBe('2:30')
    expect(fmtMin(10)).toBe('10분')
    expect(fmtMin(2.5)).toBe('2분30초')
    expect(fmtMin(0.5)).toBe('30초')
  })
})
