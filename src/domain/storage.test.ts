import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { KEYS, migrateSession, storage, upsertHistory } from './storage'

class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  clear() {
    this.m.clear()
  }
}

beforeEach(() => {
  ;(globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage()
})

describe('storage', () => {
  it('v0 레거시 draft를 v1으로 읽는다 (필드 추가만)', () => {
    const v0 = {
      date: '2026-11-01',
      memo: 'm',
      sections: [{ name: '웜업', color: 0, segs: [{ from: 6, to: 11, min: 10 }] }],
    }
    localStorage.setItem(KEYS.draft, JSON.stringify(v0))
    expect(storage.readDraft()).toEqual({ version: 1, ...v0 })
  })

  it('깨진 JSON이나 잘못된 모양은 null/기본값', () => {
    localStorage.setItem(KEYS.draft, '{nope')
    localStorage.setItem(KEYS.opts, '"x"')
    expect(storage.readDraft()).toBeNull()
    expect(storage.readOpts().px).toBe(14)
    expect(migrateSession({ sections: 'x' })).toBeNull()
  })

  it('localStorage 자체가 없어도 던지지 않는다', () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = undefined
    expect(storage.readHistory()).toEqual([])
    expect(() => storage.writeOpts(storage.readOpts())).not.toThrow()
  })

  it('잘못된 구간은 버리고 나머지는 살린다', () => {
    const s = migrateSession({
      sections: [{ name: 'a', segs: [{ from: 6, min: 5 }, { from: 'x' }] }, null],
    })
    expect(s?.sections).toEqual([{ name: 'a', segs: [{ from: 6, to: null, min: 5 }] }])
  })

  it('패턴: 저장 안 됨 → null, 빈 배열 → 빈 배열', () => {
    expect(storage.readPatterns()).toBeNull()
    storage.writePatterns([])
    expect(storage.readPatterns()).toEqual([])
  })

  it('upsertHistory: 같은 날짜 교체 + 날짜 내림차순', () => {
    const mk = (date: string, memo = '') => ({ version: 1 as const, date, memo, sections: [] })
    const list = upsertHistory([mk('2026-11-10'), mk('2026-11-12', 'old')], mk('2026-11-12', 'new'))
    expect(list.map((h) => `${h.date}${h.memo}`)).toEqual(['2026-11-12new', '2026-11-10'])
  })
})
