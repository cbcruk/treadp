import { r1 } from './math'
import type { Segment, Session } from './types'

const MIN_SPEED = 0.5
const MIN_MIN = 0.5

/** 드래그 중 매 프레임 적용: 반올림, 하한, from===to면 일정 속도로. */
export function cleanupSeg(s: Segment): Segment {
  const from = Math.max(MIN_SPEED, r1(s.from))
  let to = s.to == null ? null : Math.max(MIN_SPEED, r1(s.to))
  if (to === from) to = null
  return { ...s, from, to }
}

/** 편집 확정 시 적용. 빈 묶음을 제거했으면 true. (session을 직접 수정) */
export function cleanupSession(session: Session): boolean {
  for (const sec of session.sections) {
    sec.segs = sec.segs.map((s) => ({ ...cleanupSeg(s), min: Math.max(MIN_MIN, r1(s.min)) }))
  }
  const before = session.sections.length
  session.sections = session.sections.filter((s) => s.segs.length)
  return session.sections.length !== before
}
