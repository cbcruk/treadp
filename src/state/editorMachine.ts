import { assertEvent, assign, setup } from 'xstate'
import { cleanupSession } from '../domain/edit'
import type { Session } from '../domain/types'
import {
  applyEdit,
  applyPreview,
  sameSession,
  validSel,
  type EditEvent,
  type PreviewEvent,
  type Sel,
} from './edits'
import * as hist from './history'

export type { Sel } from './edits'

export type EditorContext = {
  session: Session
  sel: Sel
  history: hist.History<Session>
  /** gesture 시작 시점 스냅샷. 끝날 때 바뀌었으면 한 번만 기록한다. */
  pre: Session | null
}

export type EditorEvent =
  | { type: 'select'; sel: Sel }
  // 기록하지 않는 메타 필드 (레거시와 동일)
  | { type: 'setDate'; date: string }
  | { type: 'setMemo'; memo: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | EditEvent
  // 드래그/입력: gestureBegin → preview* → gestureEnd | gestureCancel
  | { type: 'gestureBegin' }
  | { type: 'gestureEnd' }
  | { type: 'gestureCancel' }
  | PreviewEvent

const EDITS = [
  'replace',
  'addPattern',
  'moveClip',
  'dupClip',
  'deleteSel',
  'addNext',
  'splitHere',
  'cycleColor',
  'dupSection',
  'mergePrev',
  'nudge',
] as const satisfies readonly EditEvent['type'][]

const PREVIEWS = [
  'previewSeg',
  'previewReorder',
  'previewAppend',
  'previewSectionName',
] as const satisfies readonly PreviewEvent['type'][]

/**
 * 편집기 상태 머신.
 *
 * - idle: 편집 이벤트 하나 = undo 한 번. undo/redo 가능.
 * - gesture: 드래그나 입력 필드 포커스 중. 미리보기만 받고, 끝날 때 한 번 기록한다.
 *   이 동안 들어오는 편집/undo는 무시한다 (제스처 중간 상태가 기록되지 않도록).
 */
export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
    input: {} as { session: Session },
  },
  actions: {
    select: assign(({ context, event }) => {
      assertEvent(event, 'select')
      return { sel: validSel(context.session, event.sel) }
    }),
    setDate: assign(({ context, event }) => {
      assertEvent(event, 'setDate')
      return { session: { ...context.session, date: event.date } }
    }),
    setMemo: assign(({ context, event }) => {
      assertEvent(event, 'setMemo')
      return { session: { ...context.session, memo: event.memo } }
    }),
    edit: assign(({ context, event }) => {
      assertEvent(event, EDITS)
      const r = applyEdit(context.session, context.sel, event)
      if (!r) return {}
      // 바뀐 게 없으면 (예: 맨 앞에서 ◀) 기록하지 않는다
      if (sameSession(r.session, context.session)) return { sel: r.sel }
      return { ...r, history: hist.record(context.history, context.session) }
    }),
    undo: assign(({ context }) => {
      const r = hist.undo(context.history, context.session)
      return r
        ? { session: r.present, history: r.history, sel: validSel(r.present, context.sel) }
        : {}
    }),
    redo: assign(({ context }) => {
      const r = hist.redo(context.history, context.session)
      return r
        ? { session: r.present, history: r.history, sel: validSel(r.present, context.sel) }
        : {}
    }),
    beginGesture: assign({ pre: ({ context }) => context.session }),
    preview: assign(({ context, event }) => {
      assertEvent(event, PREVIEWS)
      return applyPreview(context.session, context.sel, event)
    }),
    commitGesture: assign(({ context }) => {
      const pre = context.pre ?? context.session
      const session = structuredClone(context.session)
      const removed = cleanupSession(session)
      return {
        session,
        sel: removed ? null : validSel(session, context.sel),
        pre: null,
        history: sameSession(session, pre) ? context.history : hist.record(context.history, pre),
      }
    }),
    cancelGesture: assign(({ context }) => {
      const session = context.pre ?? context.session
      return { session, sel: validSel(session, context.sel), pre: null }
    }),
  },
  guards: {
    canUndo: ({ context }) => context.history.past.length > 0,
    canRedo: ({ context }) => context.history.future.length > 0,
  },
}).createMachine({
  id: 'editor',
  context: ({ input }) => ({
    session: input.session,
    sel: null,
    history: hist.emptyHistory(),
    pre: null,
  }),
  on: {
    select: { actions: 'select' },
    setDate: { actions: 'setDate' },
    setMemo: { actions: 'setMemo' },
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        undo: { guard: 'canUndo', actions: 'undo' },
        redo: { guard: 'canRedo', actions: 'redo' },
        gestureBegin: { target: 'gesture', actions: 'beginGesture' },
        replace: { actions: 'edit' },
        addPattern: { actions: 'edit' },
        moveClip: { actions: 'edit' },
        dupClip: { actions: 'edit' },
        deleteSel: { actions: 'edit' },
        addNext: { actions: 'edit' },
        splitHere: { actions: 'edit' },
        cycleColor: { actions: 'edit' },
        dupSection: { actions: 'edit' },
        mergePrev: { actions: 'edit' },
        nudge: { actions: 'edit' },
      },
    },
    gesture: {
      on: {
        previewSeg: { actions: 'preview' },
        previewReorder: { actions: 'preview' },
        previewAppend: { actions: 'preview' },
        previewSectionName: { actions: 'preview' },
        gestureEnd: { target: 'idle', actions: 'commitGesture' },
        gestureCancel: { target: 'idle', actions: 'cancelGesture' },
      },
    },
  },
})
