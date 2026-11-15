import {
  DEFAULT_OPTS,
  type Opts,
  type Pattern,
  type Section,
  type Segment,
  type Session,
} from './types'

/** 레거시와 같은 키. 바꾸면 기존 데이터를 잃는다. */
export const KEYS = {
  draft: 'treadp:draft',
  history: 'treadp:history',
  patterns: 'treadp:patterns',
  opts: 'treadp:opts',
  /** 사용자가 바꾼 단축키만 (id → 키 | null). 형식은 TanStack Hotkeys의 CustomHotkeys. */
  hotkeys: 'treadp:hotkeys',
} as const

const HISTORY_LIMIT = 100

function readRaw(key: string): unknown {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : undefined
  } catch {
    return undefined
  }
}

function writeRaw(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 저장 실패는 무시: 메모리 상태로 계속 동작 */
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function toSegment(v: unknown): Segment | null {
  if (!isObj(v)) return null
  const from = num(v.from)
  const min = num(v.min)
  if (from == null || min == null) return null
  return { from, to: num(v.to), min }
}

function toSegs(v: unknown): Segment[] {
  return Array.isArray(v) ? v.map(toSegment).filter((s): s is Segment => s != null) : []
}

function toSection(v: unknown): Section | null {
  if (!isObj(v)) return null
  const sec: Section = { name: typeof v.name === 'string' ? v.name : '', segs: toSegs(v.segs) }
  const color = num(v.color)
  if (color != null) sec.color = color
  return sec
}

/**
 * 저장된 세션을 현재 버전으로 올린다.
 * v0(레거시, version 필드 없음) → v1: `version: 1` 추가만. 의미 변경 없음.
 */
export function migrateSession(v: unknown): Session | null {
  if (!isObj(v) || !Array.isArray(v.sections)) return null
  return {
    version: 1,
    date: typeof v.date === 'string' ? v.date : '',
    memo: typeof v.memo === 'string' ? v.memo : '',
    sections: v.sections.map(toSection).filter((s): s is Section => s != null),
  }
}

export function migratePattern(v: unknown): Pattern | null {
  const sec = toSection(v)
  return sec && sec.segs.length ? sec : null
}

export const storage = {
  readDraft(): Session | null {
    return migrateSession(readRaw(KEYS.draft))
  },
  writeDraft(s: Session) {
    writeRaw(KEYS.draft, s)
  },

  readHistory(): Session[] {
    const raw = readRaw(KEYS.history)
    return Array.isArray(raw) ? raw.map(migrateSession).filter((s): s is Session => s != null) : []
  },
  writeHistory(list: Session[]) {
    writeRaw(KEYS.history, list.slice(0, HISTORY_LIMIT))
  },

  /** 저장된 적 없으면 null (기본 패턴 사용). 빈 배열은 사용자가 모두 지운 상태. */
  readPatterns(): Pattern[] | null {
    const raw = readRaw(KEYS.patterns)
    if (!Array.isArray(raw)) return null
    return raw.map(migratePattern).filter((p): p is Pattern => p != null)
  },
  writePatterns(list: Pattern[]) {
    writeRaw(KEYS.patterns, list)
  },

  readOpts(): Opts {
    const raw = readRaw(KEYS.opts)
    if (!isObj(raw)) return { ...DEFAULT_OPTS }
    return {
      summary: typeof raw.summary === 'boolean' ? raw.summary : DEFAULT_OPTS.summary,
      names: typeof raw.names === 'boolean' ? raw.names : DEFAULT_OPTS.names,
      px: num(raw.px) ?? DEFAULT_OPTS.px,
      snapT: num(raw.snapT) ?? DEFAULT_OPTS.snapT,
      snapV: num(raw.snapV) ?? DEFAULT_OPTS.snapV,
    }
  },
  writeOpts(o: Opts) {
    writeRaw(KEYS.opts, o)
  },

  /** 알 수 없는 id나 잘못된 값은 HotkeysProvider가 무시하므로 모양만 확인한다. */
  readHotkeys(): Record<string, unknown> {
    const raw = readRaw(KEYS.hotkeys)
    return isObj(raw) ? raw : {}
  },
  writeHotkeys(custom: Record<string, unknown>) {
    writeRaw(KEYS.hotkeys, custom)
  },
}

/** "복사 + 저장": 같은 날짜는 교체, 날짜 내림차순, 최대 100개. */
export function upsertHistory(list: Session[], entry: Session): Session[] {
  const next = list.filter((h) => h.date !== entry.date)
  next.unshift(structuredClone(entry))
  next.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return next.slice(0, HISTORY_LIMIT)
}
