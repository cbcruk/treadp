import type { Segment } from './types'

/** 소수 둘째 자리 반올림 */
export const r1 = (n: number) => Math.round(n * 100) / 100
/** 불필요한 0 없이 숫자 표기: 12 → "12", 11.5 → "11.5" */
export const fmtN = (n: number) => String(+(+n).toFixed(2))
export const snapTo = (v: number, step: number) => r1(Math.round(v / step) * step)

export const endSpeed = (s: Segment) => (s.to == null ? s.from : s.to)

/** 구간 거리(km) = 평균 속도 × 시간. 점진 구간은 선형 가속으로 본다. */
export const segKm = (s: Segment) =>
  s.from == null || !s.min ? 0 : ((s.from + endSpeed(s)) / 2) * (s.min / 60)

export type Totals = { min: number; km: number; avg: number }
export function totals(segs: Segment[]): Totals {
  let min = 0
  let km = 0
  for (const s of segs) {
    min += s.min || 0
    km += segKm(s)
  }
  return { min, km, avg: min ? km / (min / 60) : 0 }
}

/** km/h → "m:ss" (분/km) */
export function fmtPace(kmh: number): string {
  if (!kmh) return '-'
  const sec = Math.round(3600 / kmh)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

/** 분 → "m:ss" 또는 "h:mm:ss" */
export function fmtDur(min: number): string {
  const t = Math.round(min * 60)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

/** 분 → "10분", "2분30초", "30초" */
export const fmtMin = (m: number) =>
  Number.isInteger(m)
    ? `${m}분`
    : `${Math.floor(m)}분${Math.round((m % 1) * 60)}초`.replace(/^0분/, '')

export const fmtPaceRange = (s: Segment) =>
  `${s.to != null ? `${fmtPace(s.from)}→${fmtPace(s.to)}` : fmtPace(s.from)}/km`
