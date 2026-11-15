import { describe, expect, it } from 'vite-plus/test'
import legacy from '../../tests/fixtures/legacy.json'
import { toText } from './format'
import { parseText } from './parse'
import type { OutputOpts, Session } from './types'

describe('toText: 레거시 출력 계약', () => {
  it.each(legacy.format.map((f) => [`${f.name} ${JSON.stringify(f.opts)}`, f] as const))(
    '%s',
    (_, f) => {
      expect(toText(f.session as Session, f.opts as OutputOpts)).toBe(f.text)
    },
  )
})

describe('parseText: 레거시 파싱 계약', () => {
  it.each(legacy.parse.map((p) => [p.name, p] as const))('%s', (_, p) => {
    expect(parseText(p.input, '2026-11-15')).toEqual({ version: 1, ...p.parsed })
  })

  it('출력 예시를 그대로 파싱한다', () => {
    const s = parseText('메모(선택)\n\n6~11 10분\n---\n11~11.5 5분\n12 15분\n---\n6 5분', 'd')
    expect(s.memo).toBe('메모(선택)')
    expect(s.sections.map((x) => x.name)).toEqual(['웜업', '메인', '쿨다운'])
    expect(s.sections[1].segs).toEqual([
      { from: 11, to: 11.5, min: 5 },
      { from: 12, to: null, min: 15 },
    ])
  })

  it('초만 있는 구간을 읽는다 (레거시는 "30초"를 3분으로 잘못 읽었음)', () => {
    expect(parseText('13 30초', 'd').sections[0].segs[0].min).toBe(0.5)
    expect(parseText('13 1분45초', 'd').sections[0].segs[0].min).toBe(1.75)
    expect(parseText('13 2 30초', 'd').sections[0].segs[0].min).toBe(2.5)
  })

  it('2분30초를 2.5분으로 읽는다', () => {
    expect(parseText('11 2분30초', 'd').sections[0].segs[0].min).toBe(2.5)
  })
})

describe('왕복: parseText(toText(x)) ≈ x', () => {
  const sessions = legacy.format
    .filter((f) => !f.opts.summary && f.opts.names)
    .map((f) => f.session as Session)

  it.each(sessions.map((s, i) => [i, s] as const))('#%s', (_, s) => {
    const opts = { summary: true, names: true }
    const text = toText(s, opts)
    const back = parseText(text, s.date)
    // 텍스트 수준에서 동일해야 한다 (이름 없는 묶음, 빈 묶음, color는 텍스트에 없으므로 비교 제외)
    expect(toText(back, { summary: true, names: false })).toBe(
      toText(s, { summary: true, names: false }),
    )
    expect(back.memo).toBe(s.memo.trim())
  })
})
