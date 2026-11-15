const LIMIT = 200

export type History<T> = { past: T[]; future: T[] }

export const emptyHistory = <T>(): History<T> => ({ past: [], future: [] })

/** 새 편집: 이전 스냅샷을 past에 쌓고 future를 비운다. */
export function record<T>(h: History<T>, snapshot: T): History<T> {
  const past = [...h.past, snapshot]
  if (past.length > LIMIT) past.shift()
  return { past, future: [] }
}

export function undo<T>(h: History<T>, present: T): { history: History<T>; present: T } | null {
  if (!h.past.length) return null
  return {
    present: h.past[h.past.length - 1],
    history: { past: h.past.slice(0, -1), future: [...h.future, present] },
  }
}

export function redo<T>(h: History<T>, present: T): { history: History<T>; present: T } | null {
  if (!h.future.length) return null
  return {
    present: h.future[h.future.length - 1],
    history: { past: [...h.past, present], future: h.future.slice(0, -1) },
  }
}
