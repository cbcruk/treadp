import { DEFAULT_NAMES, type Section, type Session } from './types'

// 시간 부분: "30초"(초만)를 먼저 시도한다. 그렇지 않으면 "30초"가 "3분 0초"로 백트래킹된다 (레거시 버그).
const LINE_RE =
  /^(\d+(?:\.\d+)?)\s*(?:[~\-–→]\s*(\d+(?:\.\d+)?))?\s*(?:km\/h|k)?\s+(?:(\d+)\s*초|(\d+(?:\.\d+)?)\s*(?:분|min|m)?(?:\s*(\d+)\s*초)?)\s*$/i

/**
 * 텍스트 → 세션. 인식하지 못한 줄은 메모로 모으고, `총 …` 요약 줄은 버린다.
 * `toText`의 역함수 (왕복 테스트로 보호).
 */
export function parseText(text: string, date: string): Session {
  const sections: Section[] = [{ name: '', segs: [] }]
  const memo: string[] = []
  const last = () => sections[sections.length - 1]

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (/^-{3,}$/.test(line)) {
      sections.push({ name: '', segs: [] })
      continue
    }
    const nm = line.match(/^\[(.+)\]$/)
    if (nm) {
      last().name = nm[1]
      continue
    }
    const m = line.match(LINE_RE)
    if (m) {
      const from = +m[1]
      const to = m[2] != null ? +m[2] : null
      const min = m[3] != null ? +m[3] / 60 : +m[4] + (m[5] ? +m[5] / 60 : 0)
      last().segs.push({ from, to: to === from ? null : to, min })
    } else if (!/^총 /.test(line)) {
      memo.push(line)
    }
  }

  const kept = sections.filter((s) => s.segs.length)
  const n = kept.length
  kept.forEach((s, i) => {
    if (!s.name) s.name = n === 3 ? DEFAULT_NAMES[i] : n === 1 ? '메인' : `묶음 ${i + 1}`
  })
  return { version: 1, date, memo: memo.join(' '), sections: kept }
}
