import { fmtMin, fmtN, fmtPace, r1, totals } from './math'
import type { OutputOpts, Segment, Session } from './types'

/** 한 구간 → "6~11 10분" / "12 15분". 출력할 수 없는 구간은 null. */
export function segLine(s: Segment): string | null {
  if (s.from == null || !s.min) return null
  const sp = s.to != null && s.to !== s.from ? `${fmtN(s.from)}~${fmtN(s.to)}` : fmtN(s.from)
  return `${sp} ${fmtMin(r1(s.min))}`
}

/**
 * Claude에 붙여넣을 텍스트. 형식은 계약이므로 바꾸지 않는다 (tests/fixtures/legacy.json).
 */
export function toText(session: Pick<Session, 'memo' | 'sections'>, opts: OutputOpts): string {
  const lines: string[] = []
  const memo = session.memo.trim()
  if (memo) lines.push(memo, '')
  session.sections
    .filter((sec) => sec.segs.some(segLine))
    .forEach((sec, i) => {
      if (i > 0) lines.push('---')
      if (opts.names && sec.name.trim()) lines.push(`[${sec.name.trim()}]`)
      for (const l of sec.segs.map(segLine)) if (l) lines.push(l)
    })
  if (opts.summary) {
    const t = totals(session.sections.flatMap((s) => s.segs))
    lines.push(
      '',
      `총 ${fmtN(t.min)}분 · ${t.km.toFixed(2)}km · 평균 ${t.avg.toFixed(1)}km/h (${fmtPace(t.avg)}/km)`,
    )
  }
  return lines.join('\n')
}
