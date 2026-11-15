/** 한 구간. to=null이면 일정 속도, 값이 있으면 from→to 점진 가속. */
export type Segment = { from: number; to: number | null; min: number }

/** `---`로 나뉘는 묶음. color는 HUES(features/piano-roll/colors.ts) 인덱스. */
export type Section = { name: string; color?: number; segs: Segment[] }

export type Session = { version: 1; date: string; memo: string; sections: Section[] }

export type Pattern = { name: string; color?: number; segs: Segment[] }

export type OutputOpts = { summary: boolean; names: boolean }

export type Opts = OutputOpts & {
  /** 1분당 px (줌) */
  px: number
  /** 시간 스냅(분) */
  snapT: number
  /** 속도 스냅(km/h) */
  snapV: number
}

export const PALETTE_SIZE = 6
export const DEFAULT_NAMES = ['웜업', '메인', '쿨다운'] as const

export const DEFAULT_PATTERNS: Pattern[] = [
  { name: '웜업', color: 0, segs: [{ from: 6, to: 11, min: 10 }] },
  {
    name: '빌드업',
    color: 1,
    segs: [
      { from: 11, to: 11.5, min: 5 },
      { from: 12, to: null, min: 15 },
      { from: 12.5, to: null, min: 15 },
      { from: 13, to: null, min: 15 },
      { from: 13.5, to: null, min: 10 },
    ],
  },
  { name: '쿨다운', color: 3, segs: [{ from: 6, to: null, min: 5 }] },
]

export const DEFAULT_OPTS: Opts = { summary: false, names: false, px: 14, snapT: 1, snapV: 0.5 }

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function blankSession(date = today()): Session {
  return { version: 1, date, memo: '', sections: [] }
}

export function sessionFromPatterns(patterns: Pattern[], date = today()): Session {
  return {
    ...blankSession(date),
    sections: patterns.map((p) => ({
      name: p.name,
      color: p.color,
      segs: structuredClone(p.segs),
    })),
  }
}
