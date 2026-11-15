import { endSpeed } from '../../domain/math'
import type { Section, Segment, Session } from '../../domain/types'

export const LANE = 28 // 묶음 띠 높이
export const RULER = 18 // 분 눈금 높이
export const ROW = 11 // 0.5 km/h당 px
export const TOP = LANE + RULER

export type SpeedRange = { vMin: number; vMax: number }

export function speedRange(session: Session): SpeedRange {
  const vs = session.sections
    .flatMap((s) => s.segs)
    .flatMap((s) => [s.from, endSpeed(s)])
    .filter((v) => v != null)
  const lo = vs.length ? Math.min(...vs) : 6
  const hi = vs.length ? Math.max(...vs) : 14
  return {
    vMin: Math.max(0, Math.min(5, Math.floor(lo) - 1)),
    vMax: Math.max(15, Math.ceil(hi) + 1),
  }
}

export type ClipBox = { si: number; gi: number; s: Segment; t0: number; t1: number }
export type SecBox = { si: number; sec: Section; t0: number; t1: number }

export type Layout = SpeedRange & {
  px: number
  rollH: number
  H: number
  width: number
  total: number
  clips: ClipBox[]
  secs: SecBox[]
  y: (v: number) => number
  vAt: (py: number) => number
}

export function layout(session: Session, px: number, range: SpeedRange, viewW: number): Layout {
  const { vMin, vMax } = range
  const rollH = (vMax - vMin) * 2 * ROW
  const clips: ClipBox[] = []
  const secs: SecBox[] = []
  let t = 0
  session.sections.forEach((sec, si) => {
    const t0 = t
    sec.segs.forEach((s, gi) => {
      clips.push({ si, gi, s, t0: t, t1: t + s.min })
      t += s.min
    })
    secs.push({ si, sec, t0, t1: t })
  })
  return {
    px,
    vMin,
    vMax,
    rollH,
    H: TOP + rollH,
    total: t,
    width: Math.max(viewW || 600, (t + 25) * px),
    clips,
    secs,
    y: (v) => TOP + (vMax - v) * 2 * ROW,
    vAt: (py) => vMax - (py - TOP) / (2 * ROW),
  }
}

/** 포인터 x(분)에 대해 묶음을 옮길 위치: 다른 묶음 중점 중 x보다 왼쪽인 개수 */
export function reorderTarget(secs: SecBox[], cur: number, xMin: number): number {
  return secs.filter((s, i) => i !== cur && (s.t0 + s.t1) / 2 < xMin).length
}

/** 드래그 대상. knob0/knob1은 선택된 구간의 시작/끝 속도 손잡이 */
export type Role = 'clip' | 'knob0' | 'knob1' | 'resize' | 'sec' | 'draw'
export type Hit = { role: Role; si: number; gi: number }

export type ClipShape = {
  x0: number
  x1: number
  y0: number
  y1: number
  /** 띠 두께의 절반 */
  h: number
  w: number
}

/** 구간 블록의 화면 모양 (그리기와 판정이 같은 값을 쓴다) */
export function clipShape(L: Layout, c: Pick<ClipBox, 's' | 't0' | 't1'>): ClipShape {
  const x0 = c.t0 * L.px + 1
  const x1 = c.t1 * L.px - 1
  return { x0, x1, y0: L.y(c.s.from), y1: L.y(endSpeed(c.s)), h: ROW / 2 + 1, w: x1 - x0 }
}

export const KNOB_R = 5
/** 선택된 구간의 손잡이 위치. 끝 손잡이는 블록이 충분히 넓을 때만 */
export function knobs(sh: ClipShape) {
  return {
    knob0: { x: sh.x0 + 6, y: sh.y0 },
    knob1: sh.w > 20 ? { x: sh.x1 - 9, y: sh.y1 } : null,
  }
}

export const resizeRect = (sh: ClipShape) => ({
  x: sh.x1 - 4,
  y: sh.y1 - sh.h - 4,
  w: 8,
  h: 2 * sh.h + 8,
})

const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

/**
 * 콘텐츠 좌표(x: 0 = 0분, y: 0 = 캔버스 위)에서 무엇을 눌렀는지.
 * 그리는 순서의 역순(위에 그려진 것부터)으로 판정한다. 빈 곳이면 null.
 */
export function hitTest(
  L: Layout,
  sel: { type: string; si: number; gi?: number } | null,
  x: number,
  y: number,
): Hit | null {
  for (let i = L.clips.length - 1; i >= 0; i--) {
    const c = L.clips[i]
    const sh = clipShape(L, c)
    const isSel = sel?.type === 'clip' && sel.si === c.si && sel.gi === c.gi
    if (isSel) {
      const k = knobs(sh)
      const near = (p: { x: number; y: number } | null) =>
        p != null && Math.hypot(x - p.x, y - p.y) <= KNOB_R + 1
      if (near(k.knob1)) return { role: 'knob1', si: c.si, gi: c.gi }
      if (near(k.knob0)) return { role: 'knob0', si: c.si, gi: c.gi }
    }
    if (inRect(x, y, resizeRect(sh))) return { role: 'resize', si: c.si, gi: c.gi }
    if (x >= sh.x0 && x <= sh.x1) {
      const yc = sh.w > 0 ? sh.y0 + ((sh.y1 - sh.y0) * (x - sh.x0)) / sh.w : sh.y0
      if (Math.abs(y - yc) <= sh.h) return { role: 'clip', si: c.si, gi: c.gi }
    }
  }
  for (const s of L.secs) {
    const x0 = s.t0 * L.px + 1
    const w = Math.max(0, (s.t1 - s.t0) * L.px - 2)
    if (inRect(x, y, { x: x0, y: 3, w, h: LANE - 6 })) return { role: 'sec', si: s.si, gi: -1 }
  }
  if (x >= L.total * L.px && y >= TOP && y <= TOP + L.rollH) return { role: 'draw', si: -1, gi: -1 }
  return null
}

export const CURSOR: Record<Role, string> = {
  clip: 'ns-resize',
  knob0: 'ns-resize',
  knob1: 'ns-resize',
  resize: 'ew-resize',
  sec: 'grab',
  draw: 'crosshair',
}
