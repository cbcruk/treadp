import { createActor } from 'xstate'
import { describe, expect, it } from 'vite-plus/test'
import { DEFAULT_PATTERNS, sessionFromPatterns, type Session } from '../domain/types'
import { editorMachine, type EditorEvent } from './editorMachine'

const start = (session: Session = sessionFromPatterns(DEFAULT_PATTERNS, '2026-11-15')) =>
  createActor(editorMachine, { input: { session } }).start()

type Actor = ReturnType<typeof start>
const send = (a: Actor, ...events: EditorEvent[]) => {
  for (const e of events) a.send(e)
  return a.getSnapshot()
}
const shape = (s: Session) => s.sections.map((x) => x.segs.map((g) => g.from))
const base = () => start().getSnapshot().context.session

describe('editorMachine: 편집', () => {
  it('addPattern: 끝에 묶음 추가 + 선택, undo/redo', () => {
    const a = start()
    const s1 = send(a, { type: 'addPattern', pattern: DEFAULT_PATTERNS[2] }).context
    expect(s1.session.sections).toHaveLength(4)
    expect(s1.sel).toEqual({ type: 'sec', si: 3 })
    expect(send(a, { type: 'undo' }).context.session).toEqual(base())
    expect(send(a, { type: 'redo' }).context.session).toEqual(s1.session)
  })

  it('moveClip: 묶음 경계를 넘고, 빈 묶음은 사라진다', () => {
    const a = start()
    let c = send(
      a,
      { type: 'select', sel: { type: 'clip', si: 0, gi: 0 } },
      { type: 'moveClip', dir: 1 },
    ).context
    expect(shape(c.session)).toEqual([[6, 11, 12, 12.5, 13, 13.5], [6]])
    expect(c.sel).toEqual({ type: 'clip', si: 0, gi: 0 })
    c = send(a, { type: 'moveClip', dir: 1 }).context
    expect(shape(c.session)[0].slice(0, 2)).toEqual([11, 6])
  })

  it('변화 없는 편집은 기록하지 않음', () => {
    const a = start()
    const c = send(
      a,
      { type: 'select', sel: { type: 'clip', si: 0, gi: 0 } },
      { type: 'moveClip', dir: -1 },
    ).context
    expect(c.history.past).toHaveLength(0)
    expect(a.getSnapshot().can({ type: 'undo' })).toBe(false)
  })

  it('splitHere / mergePrev 왕복', () => {
    const a = start()
    const c1 = send(
      a,
      { type: 'select', sel: { type: 'clip', si: 1, gi: 2 } },
      { type: 'splitHere' },
    ).context
    expect(shape(c1.session)).toEqual([[6], [11, 12], [12.5, 13, 13.5], [6]])
    expect(c1.session.sections[2].name).toBe('묶음 4')
    const c2 = send(
      a,
      { type: 'select', sel: { type: 'sec', si: 2 } },
      { type: 'mergePrev' },
    ).context
    expect(shape(c2.session)).toEqual(shape(base()))
  })

  it('deleteSel: 마지막 구간을 지우면 묶음도 사라진다', () => {
    const c = send(
      start(),
      { type: 'select', sel: { type: 'clip', si: 2, gi: 0 } },
      { type: 'deleteSel' },
    ).context
    expect(c.session.sections).toHaveLength(2)
    expect(c.sel).toBeNull()
  })

  it('nudge: 점진 구간은 양 끝을 같이 움직이고 시간은 하한을 지킨다', () => {
    const c = send(
      start(),
      { type: 'select', sel: { type: 'clip', si: 0, gi: 0 } },
      { type: 'nudge', dv: 0.5, dt: -20, minMin: 1 },
    ).context
    expect(c.session.sections[0].segs[0]).toEqual({ from: 6.5, to: 11.5, min: 1 })
  })

  it('setMemo는 기록하지 않는다', () => {
    expect(send(start(), { type: 'setMemo', memo: 'x' }).context.history.past).toHaveLength(0)
  })
})

describe('editorMachine: gesture', () => {
  it('여러 미리보기는 undo 한 번으로 묶인다', () => {
    const a = start()
    const s = send(
      a,
      { type: 'gestureBegin' },
      { type: 'previewSeg', si: 0, gi: 0, patch: { from: 7 } },
      { type: 'previewSeg', si: 0, gi: 0, patch: { from: 8 } },
      { type: 'gestureEnd' },
    )
    expect(s.value).toBe('idle')
    expect(s.context.session.sections[0].segs[0].from).toBe(8)
    expect(s.context.history.past).toHaveLength(1)
    expect(send(a, { type: 'undo' }).context.session).toEqual(base())
  })

  it('변화 없이 끝나면 기록하지 않고, cancel은 원복', () => {
    expect(
      send(start(), { type: 'gestureBegin' }, { type: 'gestureEnd' }).context.history.past,
    ).toHaveLength(0)
    const c = send(
      start(),
      { type: 'gestureBegin' },
      { type: 'previewSeg', si: 0, gi: 0, patch: { min: 99 } },
      { type: 'gestureCancel' },
    ).context
    expect(c.session).toEqual(base())
  })

  it('gesture 중에는 편집/undo를 무시하고, idle에서는 미리보기를 무시한다', () => {
    const a = start()
    send(a, { type: 'addPattern', pattern: DEFAULT_PATTERNS[2] })
    const before = send(a, { type: 'gestureBegin' })
    expect(before.value).toBe('gesture')
    expect(before.can({ type: 'undo' })).toBe(false)
    const during = send(a, { type: 'undo' }, { type: 'addPattern', pattern: DEFAULT_PATTERNS[0] })
    expect(during.context.session).toEqual(before.context.session)
    send(a, { type: 'gestureEnd' })
    const idle = send(a, { type: 'previewSeg', si: 0, gi: 0, patch: { from: 20 } })
    expect(idle.context.session.sections[0].segs[0].from).toBe(6)
  })

  it('previewAppend: 빈 세션이면 메인 묶음을 만든다', () => {
    const c = send(
      start({ version: 1, date: 'd', memo: '', sections: [] }),
      { type: 'gestureBegin' },
      { type: 'previewAppend', seg: { from: 10, to: null, min: 5 } },
      { type: 'gestureEnd' },
    ).context
    expect(c.session.sections).toEqual([
      { name: '메인', color: 1, segs: [{ from: 10, to: null, min: 5 }] },
    ])
    expect(c.sel).toEqual({ type: 'clip', si: 0, gi: 0 })
  })

  it('gestureEnd에서 정리: to===from이면 일정 속도로, 시간 하한 0.5', () => {
    const c = send(
      start(),
      { type: 'gestureBegin' },
      { type: 'previewSeg', si: 0, gi: 0, patch: { from: 11, min: 0.1 } },
      { type: 'gestureEnd' },
    ).context
    expect(c.session.sections[0].segs[0]).toEqual({ from: 11, to: null, min: 0.5 })
  })
})
