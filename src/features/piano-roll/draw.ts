import { endSpeed, fmtMin, fmtN, r1, totals } from '../../domain/math'
import type { Segment, Session } from '../../domain/types'
import { secColors } from './colors'
import { KNOB_R, LANE, ROW, TOP, clipShape, knobs, type ClipBox, type Layout } from './geometry'

export type Theme = {
  color: (cssVar: string) => string
  font: string
  dispose: () => void
}

/**
 * 'var(--x)' → 실제 색. 테마 토큰은 `light-dark(…)` 같은 값이라 캔버스가 바로 못 읽는다.
 * el 안에 보이지 않는 요소를 두고 color로 계산시켜, 현재 테마·모드에서 확정된 rgb를 얻는다.
 * 결과는 캐시하므로, 테마/모드가 바뀌면 dispose하고 다시 만든다.
 */
export function readTheme(el: Element): Theme {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  el.append(probe)
  const cs = getComputedStyle(probe)
  const cache = new Map<string, string>()
  return {
    font: getComputedStyle(el).fontFamily,
    dispose: () => probe.remove(),
    color: (v) => {
      let out = cache.get(v)
      if (out == null) {
        probe.style.color = ''
        probe.style.color = v
        out = cs.color || v
        cache.set(v, out)
      }
      return out
    },
  }
}

export type Tokens = {
  roll: string
  rollAlt: string
  line: string
  line2: string
  card: string
  text: string
  muted: string
}

export type Scene = {
  L: Layout
  session: Session
  sel: { type: string; si: number; gi?: number } | null
  draft: Segment | null
  /** 보이는 영역의 왼쪽 (콘텐츠 px) */
  scrollX: number
  viewW: number
}

/** 캔버스 크기를 CSS 크기 × devicePixelRatio로 맞추고, CSS px 좌표계로 그릴 컨텍스트를 준다 */
export function prepare(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1
  const w = Math.max(1, Math.round(cssW * dpr))
  const h = Math.max(1, Math.round(cssH * dpr))
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  return ctx
}

const font = (t: Theme, size: number, weight = 400) => `${weight} ${size}px ${t.font}`

export function drawGutter(ctx: CanvasRenderingContext2D, L: Layout, t: Theme, k: Tokens) {
  ctx.fillStyle = t.color(k.muted)
  ctx.font = font(t, 10)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  for (let v = Math.ceil(L.vMin); v <= L.vMax; v++) ctx.fillText(String(v), 34, L.y(v) + 3.5)
  ctx.fillText('분', 34, TOP - 5)
}

export function drawRoll(ctx: CanvasRenderingContext2D, sc: Scene, t: Theme, k: Tokens) {
  const { L, session, sel, draft, scrollX, viewW } = sc
  const { px, vMin, vMax, rollH, y, total } = L
  const bottom = TOP + rollH
  const c = t.color

  ctx.save()
  ctx.translate(-scrollX, 0)
  const left = scrollX
  const right = scrollX + viewW

  for (let v = vMin; v < vMax; v += 1) {
    ctx.fillStyle = c(v % 2 ? k.rollAlt : k.roll)
    ctx.fillRect(left, y(v + 1), viewW, 2 * ROW)
  }
  for (let v = vMin; v <= vMax; v += 0.5) {
    const major = Number.isInteger(v)
    hLine(ctx, left, right, y(v), c(major ? k.line2 : k.line), major ? 1 : 0.5)
  }
  ctx.fillStyle = c(k.card)
  ctx.fillRect(left, 0, viewW, TOP)
  const labelEvery = px >= 10 ? 5 : 10
  ctx.font = font(t, 10)
  ctx.textAlign = 'left'
  for (let m = Math.max(0, Math.floor(left / px)); m <= right / px; m++) {
    const x = m * px
    const major = m % labelEvery === 0
    if (px >= 6 || major) {
      ctx.globalAlpha = major ? 1 : 0.6
      vLine(ctx, x, major ? LANE + 4 : LANE + 11, bottom, c(k.line), major ? 1 : 0.5)
      ctx.globalAlpha = 1
    }
    if (major) {
      ctx.fillStyle = c(k.muted)
      ctx.fillText(String(m), x + 3, LANE + 12)
    }
  }
  hLine(ctx, left, right, TOP, c(k.line2), 1)

  if (!draft) {
    ctx.fillStyle = c(k.muted)
    ctx.font = font(t, 11)
    ctx.fillText('← 여기를 드래그해서 구간 추가', total * px + 10, TOP + 16)
  }

  for (const { si, sec, t0, t1 } of L.secs) {
    const col = secColors(sec, si)
    const x0 = t0 * px
    const w = (t1 - t0) * px
    const isSel = sel?.si === si
    roundRect(ctx, x0 + 1, 3, Math.max(0, w - 2), LANE - 6, 5)
    ctx.fillStyle = c(col.soft)
    ctx.fill()
    if (isSel) stroke(ctx, c(k.text), 2)
    if (w > 30) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(x0 + 1, 3, Math.max(0, w - 2), LANE - 6)
      ctx.clip()
      ctx.fillStyle = c(col.text)
      ctx.font = font(t, 12, 600)
      const name = sec.name || '묶음'
      ctx.fillText(name, x0 + 8, LANE / 2 + 4)
      if (w > 110) {
        const tt = totals(sec.segs)
        const nameW = ctx.measureText(name).width
        ctx.font = font(t, 12, 400)
        ctx.globalAlpha = 0.85
        ctx.fillText(` ${fmtN(tt.min)}분 · ${tt.km.toFixed(1)}km`, x0 + 8 + nameW, LANE / 2 + 4)
        ctx.globalAlpha = 1
      }
      ctx.restore()
    }
    if (si > 0) {
      ctx.setLineDash([4, 3])
      vLine(ctx, x0, TOP, bottom, c(k.muted), 1)
      ctx.setLineDash([])
    }
    if (isSel) {
      ctx.globalAlpha = 0.06
      ctx.fillStyle = c(col.strong)
      ctx.fillRect(x0, TOP, w, rollH)
      ctx.globalAlpha = 1
    }
  }

  ctx.globalAlpha = 0.08
  for (const { si, s: seg, t0, t1 } of L.clips) {
    ctx.beginPath()
    ctx.moveTo(t0 * px, bottom)
    ctx.lineTo(t0 * px, y(seg.from))
    ctx.lineTo(t1 * px, y(endSpeed(seg)))
    ctx.lineTo(t1 * px, bottom)
    ctx.closePath()
    ctx.fillStyle = c(secColors(session.sections[si], si).strong)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  for (const clip of L.clips) {
    const isSel = sel?.type === 'clip' && sel.si === clip.si && sel.gi === clip.gi
    const col = secColors(session.sections[clip.si], clip.si)
    drawClip(ctx, L, clip, c(col.fill), c(col.strong), isSel, false, t, k)
  }
  if (draft) {
    const ghost: ClipBox = { si: 0, gi: -1, s: draft, t0: total, t1: total + draft.min }
    drawClip(ctx, L, ghost, c(k.line2), c(k.muted), false, true, t, k)
  }
  ctx.restore()
}

function drawClip(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  clip: ClipBox,
  color: string,
  edge: string,
  isSel: boolean,
  ghost: boolean,
  t: Theme,
  k: Tokens,
) {
  const sh = clipShape(L, clip)
  const { x0, x1, y0, y1, h, w } = sh
  const seg = clip.s
  ctx.beginPath()
  ctx.moveTo(x0, y0 - h)
  ctx.lineTo(x1, y1 - h)
  ctx.lineTo(x1, y1 + h)
  ctx.lineTo(x0, y0 + h)
  ctx.closePath()
  ctx.globalAlpha = ghost ? 0.6 : 1
  ctx.fillStyle = color
  ctx.fill()
  if (isSel) stroke(ctx, t.color(k.text), 2)
  else stroke(ctx, edge, 1)
  ctx.globalAlpha = 1

  if (w > 34) {
    ctx.fillStyle = t.color(k.text)
    ctx.font = font(t, 11)
    ctx.textAlign = 'left'
    const sp = seg.to != null ? `${fmtN(seg.from)}→${fmtN(seg.to)}` : fmtN(seg.from)
    ctx.fillText(sp + (w > 70 ? ` · ${fmtMin(r1(seg.min))}` : ''), x0 + 3, Math.min(y0, y1) - h - 4)
  }
  if (isSel) {
    const kn = knobs(sh)
    for (const p of [kn.knob0, kn.knob1]) {
      if (!p) continue
      ctx.beginPath()
      ctx.arc(p.x, p.y, KNOB_R, 0, Math.PI * 2)
      ctx.fillStyle = t.color(k.card)
      ctx.fill()
      stroke(ctx, t.color(k.text), 2)
    }
  }
}

function hLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  color: string,
  width: number,
) {
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1, y)
  stroke(ctx, color, width)
}

function vLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  color: string,
  width: number,
) {
  ctx.beginPath()
  ctx.moveTo(x, y0)
  ctx.lineTo(x, y1)
  stroke(ctx, color, width)
}

function stroke(ctx: CanvasRenderingContext2D, color: string, width: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
}
