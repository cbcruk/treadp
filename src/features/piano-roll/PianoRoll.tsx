import {
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
  type Ref,
} from 'react'
import * as stylex from '@stylexjs/stylex'
import { useHotkey } from '@tanstack/react-hotkeys'
import { cleanupSeg } from '../../domain/edit'
import { endSpeed, fmtN, snapTo, totals } from '../../domain/math'
import type { Opts, Segment, Session } from '../../domain/types'
import type { EditorEvent, Sel } from '../../state/editorMachine'
import { colors, radius } from '../../ui/tokens.stylex'
import { appHotkeys } from '../hotkeys/appHotkeys'
import {
  drawGutter,
  drawRoll,
  prepare,
  readTheme,
  type Scene,
  type Theme,
  type Tokens,
} from './draw'
import {
  CURSOR,
  ROW,
  hitTest,
  layout,
  reorderTarget,
  speedRange,
  type Layout,
  type Role,
  type SpeedRange,
} from './geometry'

const TOKENS: Tokens = {
  roll: 'var(--color-background-surface)',
  rollAlt: 'var(--color-background-body)',
  line: 'var(--color-border)',
  line2: 'var(--color-border-emphasized)',
  card: 'var(--color-background-surface)',
  text: 'var(--color-text-primary)',
  muted: 'var(--color-text-secondary)',
}

const GUTTER_W = 40

type Drag = {
  /** pan: 터치로 빈 곳을 끌면 직접 스크롤한다 (캔버스는 touch-action: none) */
  role: Role | 'pan'
  si: number
  gi: number
  x: number
  y: number
  moved: boolean
  orig?: Segment
  v?: number
  lx?: number
  ly?: number
}

type Props = {
  session: Session
  sel: Sel
  opts: Opts
  send: (e: EditorEvent) => void
  ref?: Ref<PianoRollHandle>
}

export type PianoRollHandle = {
  /** 맨 오른쪽으로 스크롤. 새 구간이 그려진 뒤(flushSync 이후)에 부른다 */
  scrollToEnd: () => void
}

type Painted = Omit<Scene, 'scrollX' | 'viewW'>

export function PianoRoll({ session, sel, opts, send, ref }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gutterRef = useRef<HTMLCanvasElement>(null)
  /** 마지막으로 커밋된 장면. 스크롤/테마 변경 때는 렌더 없이 이것만 다시 칠한다 */
  const scene = useRef<Painted | null>(null)
  const theme = useRef<Theme | null>(null)
  const drag = useRef<Drag | null>(null)
  // 드래그 중에는 세로 범위를 고정해서 블록이 손 밑에서 미끄러지지 않게 한다
  const [frozen, setFrozen] = useState<SpeedRange | null>(null)
  const [draft, setDraft] = useState<Segment | null>(null)
  const [viewW, setViewW] = useState(0)

  // ref만 읽으므로 한 번 만들어 두고 스크롤/테마 리스너에서도 쓴다
  const paint = useCallback(() => {
    const sc = scene.current
    const el = scrollerRef.current
    if (!sc || !el) return
    theme.current ??= readTheme(el)
    const th = theme.current
    const H = sc.L.H + 8
    const cv = canvasRef.current
    if (cv) {
      const ctx = prepare(cv, el.clientWidth, H)
      if (ctx) drawRoll(ctx, { ...sc, scrollX: el.scrollLeft, viewW: el.clientWidth }, th, TOKENS)
    }
    const gv = gutterRef.current
    if (gv) {
      const ctx = prepare(gv, GUTTER_W - 1, H)
      if (ctx) drawGutter(ctx, sc.L, th, TOKENS)
    }
  }, [])

  // 스크롤 영역 폭 추적 + 다크 모드 전환 시 다시 칠하기: 요소가 붙을 때 시작하고 떨어질 때 정리한다
  // (React 19 ref cleanup). 콜백이 매 렌더 새로 만들어지면 재구독되므로 고정한다
  const attachScroller = useCallback(
    (el: HTMLDivElement) => {
      scrollerRef.current = el
      const ro = new ResizeObserver(() => setViewW(el.clientWidth))
      ro.observe(el)
      const mq = matchMedia('(prefers-color-scheme: dark)')
      const retheme = () => {
        theme.current?.dispose()
        theme.current = null
        paint()
      }
      mq.addEventListener('change', retheme)
      return () => {
        ro.disconnect()
        mq.removeEventListener('change', retheme)
        theme.current?.dispose()
        theme.current = null
        scrollerRef.current = null
      }
    },
    [paint],
  )

  useImperativeHandle(ref, () => ({
    scrollToEnd: () => {
      const el = scrollerRef.current
      if (el) el.scrollLeft = el.scrollWidth
    },
  }))

  const L = layout(session, opts.px, frozen ?? speedRange(session), viewW)
  const { px, clips, secs } = L

  const jumpTo = (which: 'first' | 'last') => {
    const c = which === 'first' ? clips[0] : clips.at(-1)
    if (!c) return
    send({ type: 'select', sel: { type: 'clip', si: c.si, gi: c.gi } })
    const el = scrollerRef.current
    if (el) el.scrollLeft = which === 'first' ? 0 : Math.max(0, c.t1 * px - el.clientWidth + 40)
  }
  const hasClips = clips.length > 0
  useHotkey(appHotkeys['nav.first'], () => jumpTo('first'), { enabled: hasClips })
  useHotkey(appHotkeys['nav.last'], () => jumpTo('last'), { enabled: hasClips })

  /** 포인터 위치 → 콘텐츠 좌표 (x: 0분 기준, 스크롤 반영) */
  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: e.clientX - r.left + (scrollerRef.current?.scrollLeft ?? 0),
      y: e.clientY - r.top,
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const p = at(e)
    const hit = hitTest(L, sel, p.x, p.y)
    const base = { x: e.clientX, y: e.clientY, moved: false }
    if (!hit) {
      send({ type: 'select', sel: null })
      if (e.pointerType === 'touch') {
        drag.current = { role: 'pan', si: -1, gi: -1, ...base, lx: e.clientX, ly: e.clientY }
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      return
    }
    const { role, si, gi } = hit
    const d: Drag = { role, si, gi, ...base }
    setFrozen(speedRange(session))
    send({ type: 'gestureBegin' })
    if (role === 'sec') {
      send({ type: 'select', sel: { type: 'sec', si } })
    } else if (role === 'draw') {
      const v = Math.max(0.5, snapTo(L.vAt(p.y), opts.snapV))
      const last = session.sections.flatMap((s) => s.segs).at(-1)
      setDraft({ from: v, to: null, min: last?.min || 5 })
      d.v = v
    } else {
      d.orig = structuredClone(session.sections[si].segs[gi])
      send({ type: 'select', sel: { type: 'clip', si, gi } })
    }
    drag.current = d
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d) {
      const p = at(e)
      const hit = hitTest(L, sel, p.x, p.y)
      e.currentTarget.style.cursor = hit ? CURSOR[hit.role] : ''
      return
    }
    if (d.role === 'pan') {
      const el = scrollerRef.current
      if (el) el.scrollLeft -= e.clientX - (d.lx ?? e.clientX)
      window.scrollBy(0, -(e.clientY - (d.ly ?? e.clientY)))
      d.lx = e.clientX
      d.ly = e.clientY
      return
    }
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 3) return
    d.moved = true
    const dv = snapTo(-dy / (2 * ROW), opts.snapV)
    const o = d.orig
    const seg = (patch: Partial<Segment>) => {
      if (!o) return
      send({ type: 'previewSeg', si: d.si, gi: d.gi, patch: cleanupSeg({ ...o, ...patch }) })
    }
    switch (d.role) {
      case 'clip':
        if (o) seg({ from: o.from + dv, to: o.to != null ? o.to + dv : null })
        break
      case 'knob0':
        if (o) seg({ from: o.from + dv, to: o.to ?? o.from })
        break
      case 'knob1':
        if (o) seg({ to: endSpeed(o) + dv })
        break
      case 'resize':
        if (o) seg({ min: Math.max(opts.snapT, snapTo(o.min + dx / px, opts.snapT)) })
        break
      case 'sec': {
        const target = reorderTarget(secs, d.si, at(e).x / px)
        if (target !== d.si) {
          send({ type: 'previewReorder', from: d.si, to: target })
          d.si = target
        }
        break
      }
      case 'draw':
        setDraft(
          (prev) =>
            prev && {
              ...prev,
              min: Math.max(opts.snapT, snapTo(dx / px, opts.snapT)),
              to: dv !== 0 ? Math.max(0.5, (d.v ?? prev.from) + dv) : null,
            },
        )
        break
    }
  }

  const endDrag = (cancel: boolean) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (d.role === 'pan') return
    if (cancel) {
      send({ type: 'gestureCancel' })
    } else {
      if (d.role === 'draw' && draft) send({ type: 'previewAppend', seg: draft })
      send({ type: 'gestureEnd' })
    }
    setDraft(null)
    setFrozen(null)
  }

  // 커밋마다 새 장면을 기록하고 칠한다. 인라인 ref 콜백은 매 커밋 다시 불리므로
  // useLayoutEffect 없이 "DOM이 붙은 직후" 시점을 얻는다
  const commit = (cv: HTMLCanvasElement | null) => {
    canvasRef.current = cv
    scene.current = { L, session, sel, draft }
    paint()
    return () => {
      canvasRef.current = null
    }
  }

  const H = L.H + 8
  return (
    <div {...stylex.props(s.daw)}>
      <div {...stylex.props(s.gutter)}>
        <canvas ref={gutterRef} aria-hidden {...stylex.props(s.block, s.size(GUTTER_W - 1, H))} />
      </div>
      <div
        data-testid="roll-scroller"
        ref={attachScroller}
        onScroll={paint}
        {...stylex.props(s.scroller)}
      >
        {/* 스크롤 길이만 만드는 받침. 캔버스는 보이는 폭만큼만 sticky로 붙어 있다 */}
        <div {...stylex.props(s.size(L.width, H))}>
          <canvas
            ref={commit}
            data-testid="roll"
            role="img"
            aria-label={describe(session, L)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => endDrag(false)}
            onPointerCancel={() => endDrag(true)}
            onPointerLeave={(e) => {
              if (!drag.current) e.currentTarget.style.cursor = ''
            }}
            {...stylex.props(s.canvas, s.size(viewW, H))}
          />
        </div>
      </div>
    </div>
  )
}

function describe(session: Session, L: Layout) {
  if (!L.clips.length) return '피아노롤: 비어 있음'
  const parts = session.sections.map((sec, i) => {
    const t = totals(sec.segs)
    return `${sec.name || `묶음 ${i + 1}`} ${sec.segs.length}구간 ${fmtN(t.min)}분`
  })
  return `피아노롤: ${parts.join(', ')}`
}

const s = stylex.create({
  daw: {
    display: 'grid',
    gridTemplateColumns: `${GUTTER_W}px 1fr`,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radius.container,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  block: { display: 'block' },
  gutter: {
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  scroller: { overflowX: 'auto', overflowY: 'hidden', minWidth: 0 },
  canvas: {
    display: 'block',
    position: 'sticky',
    left: 0,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // 드래그가 스크롤에 먹히지 않도록. 빈 곳 터치 드래그는 직접 스크롤한다
    touchAction: 'none',
  },
  size: (width: number, height: number) => ({ width, height }),
})
