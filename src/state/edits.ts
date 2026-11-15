import { cleanupSession } from '../domain/edit'
import { endSpeed } from '../domain/math'
import { PALETTE_SIZE, type Pattern, type Segment, type Session } from '../domain/types'

export type Sel = { type: 'clip'; si: number; gi: number } | { type: 'sec'; si: number } | null

/** idle에서만 받는 편집. 한 이벤트 = undo 한 번. */
export type EditEvent =
  | { type: 'replace'; session: Session }
  | { type: 'addPattern'; pattern: Pattern }
  | { type: 'moveClip'; dir: -1 | 1 }
  | { type: 'dupClip' }
  | { type: 'deleteSel' }
  | { type: 'addNext' }
  | { type: 'splitHere' }
  | { type: 'cycleColor' }
  | { type: 'dupSection' }
  | { type: 'mergePrev' }
  | { type: 'nudge'; dv: number; dt: number; minMin: number }

/** gesture 상태에서만 받는 미리보기. 기록은 gestureEnd에서 한 번. */
export type PreviewEvent =
  | { type: 'previewSeg'; si: number; gi: number; patch: Partial<Segment> }
  | { type: 'previewReorder'; from: number; to: number }
  | { type: 'previewAppend'; seg: Segment }
  | { type: 'previewSectionName'; si: number; name: string }

export type Edited = { session: Session; sel: Sel }

export function validSel(session: Session, sel: Sel): Sel {
  if (!sel) return null
  const sec = session.sections[sel.si]
  if (!sec) return null
  if (sel.type === 'clip' && !sec.segs[sel.gi]) return null
  return sel
}

export const sameSession = (a: Session, b: Session) => JSON.stringify(a) === JSON.stringify(b)

export function moveClip(session: Session, si: number, gi: number, dir: -1 | 1): Sel {
  const secs = session.sections
  const sec = secs[si]
  const [seg] = sec.segs.splice(gi, 1)
  let nsi = si
  let ngi = gi + dir
  if (ngi < 0) {
    if (si === 0) ngi = 0
    else {
      nsi = si - 1
      ngi = secs[nsi].segs.length
    }
  } else if (ngi > sec.segs.length) {
    if (si === secs.length - 1) ngi = sec.segs.length
    else {
      nsi = si + 1
      ngi = 0
    }
  }
  secs[nsi].segs.splice(ngi, 0, seg)
  if (!sec.segs.length && nsi !== si) {
    secs.splice(si, 1)
    if (nsi > si) nsi--
  }
  return { type: 'clip', si: nsi, gi: ngi }
}

/** 복제본에 fn을 적용하고 정리한다. fn은 새 선택을 반환. */
function mutate(session: Session, sel: Sel, fn: (s: Session, sel: Sel) => Sel): Edited {
  const next = structuredClone(session)
  let nextSel = fn(next, sel)
  if (cleanupSession(next)) nextSel = null
  return { session: next, sel: validSel(next, nextSel) }
}

const clipSel = (sel: Sel) => (sel?.type === 'clip' ? sel : null)

/** 편집 적용. 적용할 대상이 없으면 null. */
export function applyEdit(session: Session, sel: Sel, e: EditEvent): Edited | null {
  const c = clipSel(sel)
  switch (e.type) {
    case 'replace':
      return mutate(session, sel, (s) => {
        Object.assign(s, structuredClone(e.session))
        return null
      })

    case 'addPattern':
      return mutate(session, sel, (s) => {
        s.sections.push({
          name: e.pattern.name,
          color: e.pattern.color ?? s.sections.length,
          segs: structuredClone(e.pattern.segs),
        })
        return { type: 'sec', si: s.sections.length - 1 }
      })

    case 'moveClip':
      return c && mutate(session, sel, (s) => moveClip(s, c.si, c.gi, e.dir))

    case 'dupClip':
      return (
        c &&
        mutate(session, sel, (s) => {
          const segs = s.sections[c.si].segs
          segs.splice(c.gi + 1, 0, structuredClone(segs[c.gi]))
          return { ...c, gi: c.gi + 1 }
        })
      )

    case 'addNext':
      return (
        c &&
        mutate(session, sel, (s) => {
          const segs = s.sections[c.si].segs
          const cur = segs[c.gi]
          segs.splice(c.gi + 1, 0, { from: endSpeed(cur) + 0.5, to: null, min: cur.min })
          return { ...c, gi: c.gi + 1 }
        })
      )

    case 'splitHere':
      if (!c || c.gi === 0) return null
      return mutate(session, sel, (s) => {
        const rest = s.sections[c.si].segs.splice(c.gi)
        const n = s.sections.length
        s.sections.splice(c.si + 1, 0, { name: `묶음 ${n + 1}`, color: n, segs: rest })
        return { type: 'clip', si: c.si + 1, gi: 0 }
      })

    case 'deleteSel':
      if (!sel) return null
      return mutate(session, sel, (s) => {
        if (sel.type === 'sec') {
          s.sections.splice(sel.si, 1)
          return null
        }
        const segs = s.sections[sel.si].segs
        segs.splice(sel.gi, 1)
        return segs.length ? { ...sel, gi: Math.min(sel.gi, segs.length - 1) } : null
      })

    case 'cycleColor':
      if (!sel) return null
      return mutate(session, sel, (s) => {
        const sec = s.sections[sel.si]
        sec.color = ((sec.color ?? sel.si) + 1) % PALETTE_SIZE
        return sel
      })

    case 'dupSection':
      if (!sel) return null
      return mutate(session, sel, (s) => {
        s.sections.splice(sel.si + 1, 0, structuredClone(s.sections[sel.si]))
        return { type: 'sec', si: sel.si + 1 }
      })

    case 'mergePrev':
      if (!sel || sel.si === 0) return null
      return mutate(session, sel, (s) => {
        const [sec] = s.sections.splice(sel.si, 1)
        s.sections[sel.si - 1].segs.push(...sec.segs)
        return { type: 'sec', si: sel.si - 1 }
      })

    case 'nudge':
      return (
        c &&
        mutate(session, sel, (s) => {
          const seg = s.sections[c.si].segs[c.gi]
          seg.from += e.dv
          if (seg.to != null) seg.to += e.dv
          seg.min = Math.max(e.minMin, seg.min + e.dt)
          return c
        })
      )
  }
}

/** 미리보기 적용 (정리하지 않음: 드래그/입력 중 값은 gestureEnd에서 정리) */
export function applyPreview(session: Session, sel: Sel, e: PreviewEvent): Edited {
  const s = structuredClone(session)
  let next: Sel = sel
  switch (e.type) {
    case 'previewSeg': {
      const segs = s.sections[e.si]?.segs
      if (segs?.[e.gi]) segs[e.gi] = { ...segs[e.gi], ...e.patch }
      break
    }
    case 'previewReorder': {
      const [moved] = s.sections.splice(e.from, 1)
      s.sections.splice(e.to, 0, moved)
      next = { type: 'sec', si: e.to }
      break
    }
    case 'previewAppend': {
      if (!s.sections.length) s.sections.push({ name: '메인', color: 1, segs: [] })
      const si = s.sections.length - 1
      s.sections[si].segs.push(e.seg)
      next = { type: 'clip', si, gi: s.sections[si].segs.length - 1 }
      break
    }
    case 'previewSectionName': {
      const sec = s.sections[e.si]
      if (sec) sec.name = e.name
      break
    }
  }
  return { session: s, sel: validSel(s, next) }
}
