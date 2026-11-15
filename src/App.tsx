import { useHotkey } from '@tanstack/react-hotkeys'
import * as stylex from '@stylexjs/stylex'
import { useActorRef, useSelector } from '@xstate/react'
import { lazy, Suspense, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { toText } from './domain/format'
import { parseText } from './domain/parse'
import { storage, upsertHistory } from './domain/storage'
import {
  DEFAULT_PATTERNS,
  blankSession,
  sessionFromPatterns,
  today,
  type Opts,
  type Pattern,
  type Section,
  type Session,
} from './domain/types'
import { appHotkeys } from './features/hotkeys/appHotkeys'
import { HistoryPanel } from './features/history/HistoryPanel'
import { Inspector } from './features/inspector/Inspector'
import { OutputPanel } from './features/output/OutputPanel'
import { PatternChips } from './features/patterns/PatternChips'
import { PianoRoll, type PianoRollHandle } from './features/piano-roll/PianoRoll'
import { Stats } from './features/stats/Stats'
import { editorMachine } from './state/editorMachine'
import {
  Button,
  ButtonGroup,
  Card,
  Code,
  DateInput,
  Divider,
  Grid,
  Heading,
  HStack,
  IconButton,
  icons,
  type ISODateString,
  SegmentedControl,
  SegmentedControlItem,
  Text,
  TextInput,
  useConfirm,
  useHotkeyLabel,
  useToast,
  VStack,
} from './ui'

// 단축키 목록(Table 등)은 열 때만 불러온다
const ShortcutsDialog = lazy(() =>
  import('./features/hotkeys/ShortcutsDialog').then((m) => ({ default: m.ShortcutsDialog })),
)

const initSession = () => storage.readDraft() ?? sessionFromPatterns(DEFAULT_PATTERNS)

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.style.cssText = 'position:fixed;opacity:0'
    ta.value = text
    document.body.append(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

/** 바뀐 세션만 저장한다 (선택만 바뀐 스냅샷 등은 건너뜀) */
function draftSaver(initial: Session) {
  let last = initial
  return (session: Session) => {
    if (session === last) return
    last = session
    storage.writeDraft(session)
  }
}

export function App() {
  const [initial] = useState(initSession)
  // 세션이 바뀔 때마다 draft 저장: 렌더링과 무관하게 머신 스냅샷을 구독한다
  const [saveDraft] = useState(() => draftSaver(initial))
  const editor = useActorRef(editorMachine, { input: { session: initial } }, (snap) =>
    saveDraft(snap.context.session),
  )
  const snap = useSelector(editor, (s) => s)
  const send = editor.send
  const [opts, setOptsState] = useState<Opts>(storage.readOpts)
  const [patterns, setPatternsState] = useState<Pattern[]>(
    () => storage.readPatterns() ?? structuredClone(DEFAULT_PATTERNS),
  )
  const [history, setHistoryState] = useState<Session[]>(storage.readHistory)
  const roll = useRef<PianoRollHandle>(null)
  const [showKeys, setShowKeys] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()
  const label = useHotkeyLabel()
  const { session, sel } = snap.context

  const setOpts = (o: Opts) => {
    setOptsState(o)
    storage.writeOpts(o)
  }
  const setPatterns = (p: Pattern[]) => {
    setPatternsState(p)
    storage.writePatterns(p)
  }
  const setHistory = (h: Session[]) => {
    setHistoryState(h)
    storage.writeHistory(h)
  }

  const loadSession = (h: Session) =>
    send({ type: 'replace', session: { ...structuredClone(h), date: today() } })

  const undo = { label: '되돌리기', onClick: () => send({ type: 'undo' }) }

  const saveAsPattern = async (sec: Section, si: number) => {
    const name = sec.name || '패턴'
    const p: Pattern = { name, color: sec.color ?? si, segs: structuredClone(sec.segs) }
    const i = patterns.findIndex((x) => x.name === name)
    if (i >= 0) {
      const ok = await confirm({
        title: `"${name}" 패턴을 덮어쓸까요?`,
        description: '같은 이름의 패턴이 지금 묶음의 구간으로 바뀝니다.',
        actionLabel: '덮어쓰기',
      })
      if (!ok) return
      setPatterns(patterns.map((x, j) => (j === i ? p : x)))
    } else {
      setPatterns([...patterns, p])
    }
    toast(`"${name}" 패턴으로 저장했습니다`)
  }

  const text = toText(session, opts)
  // 드래그/입력 중(gesture)에는 undo/redo가 막힌다
  const canUndo = snap.can({ type: 'undo' })
  const canRedo = snap.can({ type: 'redo' })
  const zoom = (dir: 'in' | 'out') =>
    setOpts({
      ...opts,
      px:
        dir === 'in'
          ? Math.min(48, Math.round(opts.px * 1.25))
          : Math.max(4, Math.round(opts.px / 1.25)),
    })

  useHotkey(appHotkeys['edit.undo'], () => send({ type: 'undo' }), { enabled: canUndo })
  useHotkey(appHotkeys['edit.redo'], () => send({ type: 'redo' }), { enabled: canRedo })
  useHotkey(appHotkeys['edit.redoAlt'], () => send({ type: 'redo' }), { enabled: canRedo })
  useHotkey(appHotkeys['view.zoomOut'], () => zoom('out'))
  useHotkey(appHotkeys['view.zoomIn'], () => zoom('in'))
  // 열린 동안에는 다이얼로그 스코프가 같은 키로 닫는다
  useHotkey(appHotkeys['help.shortcuts'], () => setShowKeys(true))
  const titled = (name: string, hk: (typeof appHotkeys)[keyof typeof appHotkeys]) =>
    label(hk) ? `${name} (${label(hk)})` : name

  return (
    <VStack as="main" gap={4} maxWidth={1100} xstyle={s.main}>
      <VStack gap={1}>
        <Heading level={1}>트레드밀 기록</Heading>
        <Text type="supporting">
          패턴을 눌러 이어 붙이고, 피아노롤에서 블록을 끌어 속도와 시간을 다듬으세요. 블록 하나는 한
          구간이고, 위쪽 띠 하나는 <Code>---</Code>로 나뉘는 묶음입니다.
        </Text>
      </VStack>

      <Card>
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap" hAlign="between" vAlign="end">
            <HStack gap={2} wrap="wrap" vAlign="end">
              <DateInput
                label="날짜"
                isLabelHidden
                size="sm"
                format="date"
                value={(session.date || today()) as ISODateString}
                onChange={(date) => date && send({ type: 'setDate', date })}
              />
              <TextInput
                label="메모"
                isLabelHidden
                size="sm"
                width={300}
                placeholder="메모 (예: 오늘도 비슷한 흐름으로 빌드업)"
                value={session.memo}
                onChange={(memo) => send({ type: 'setMemo', memo })}
              />
            </HStack>
            <HStack gap={1}>
              <Button
                size="sm"
                variant="ghost"
                icon={<icons.History />}
                label="지난 기록 불러오기"
                onClick={() => {
                  const h = history[0]
                  if (!h) return toast('저장된 기록이 없습니다')
                  loadSession(h)
                  toast(`${h.date} 기록을 불러왔습니다`, undo)
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                icon={<icons.Eraser />}
                label="비우기"
                onClick={() => {
                  send({ type: 'replace', session: { ...blankSession(), memo: session.memo } })
                  toast('비웠습니다', undo)
                }}
              />
            </HStack>
          </HStack>

          <PatternChips
            patterns={patterns}
            onAdd={(p) => {
              // 새 묶음이 그려진 뒤에 맨 오른쪽으로 스크롤
              flushSync(() => send({ type: 'addPattern', pattern: p }))
              roll.current?.scrollToEnd()
            }}
            onDelete={async (i) => {
              const ok = await confirm({
                title: `"${patterns[i].name}" 패턴을 삭제할까요?`,
                description: '저장된 패턴 목록에서 지웁니다. 이미 추가한 구간은 그대로입니다.',
                actionLabel: '삭제',
                destructive: true,
              })
              if (ok) setPatterns(patterns.filter((_, j) => j !== i))
            }}
            onRestoreDefaults={() => setPatterns(structuredClone(DEFAULT_PATTERNS))}
          />

          {/* Toolbar는 화살표로 버튼 사이를 옮겨 다녀서, 화살표 단축키(속도/시간 조절)와 겹친다 */}
          <HStack gap={2} wrap="wrap" vAlign="center" hAlign="between">
            <HStack gap={2} wrap="wrap" vAlign="center">
              <ButtonGroup label="실행 취소/다시 실행">
                <IconButton
                  label="실행 취소"
                  icon={<icons.Undo2 />}
                  tooltip={titled('실행 취소', appHotkeys['edit.undo'])}
                  isDisabled={!canUndo}
                  onClick={() => send({ type: 'undo' })}
                />
                <IconButton
                  label="다시 실행"
                  icon={<icons.Redo2 />}
                  tooltip={titled('다시 실행', appHotkeys['edit.redo'])}
                  isDisabled={!canRedo}
                  onClick={() => send({ type: 'redo' })}
                />
              </ButtonGroup>
              <ButtonGroup label="확대/축소">
                <IconButton
                  label="축소"
                  icon={<icons.ZoomOut />}
                  tooltip={titled('축소', appHotkeys['view.zoomOut'])}
                  onClick={() => zoom('out')}
                />
                <IconButton
                  label="확대"
                  icon={<icons.ZoomIn />}
                  tooltip={titled('확대', appHotkeys['view.zoomIn'])}
                  onClick={() => zoom('in')}
                />
              </ButtonGroup>
              <Divider orientation="vertical" />
              <Text type="supporting">시간 스냅</Text>
              <SegmentedControl
                label="시간 스냅"
                size="sm"
                value={String(opts.snapT)}
                onChange={(v) => setOpts({ ...opts, snapT: +v })}
              >
                <SegmentedControlItem value="0.5" label="30초" />
                <SegmentedControlItem value="1" label="1분" />
                <SegmentedControlItem value="5" label="5분" />
              </SegmentedControl>
              <Text type="supporting">속도 스냅</Text>
              <SegmentedControl
                label="속도 스냅"
                size="sm"
                value={String(opts.snapV)}
                onChange={(v) => setOpts({ ...opts, snapV: +v })}
              >
                <SegmentedControlItem value="0.1" label="0.1" />
                <SegmentedControlItem value="0.5" label="0.5" />
                <SegmentedControlItem value="1" label="1" />
              </SegmentedControl>
            </HStack>
            <Button
              size="sm"
              variant="ghost"
              icon={<icons.Keyboard />}
              label="단축키"
              tooltip={titled('단축키 목록', appHotkeys['help.shortcuts'])}
              onClick={() => setShowKeys(true)}
            />
          </HStack>

          <PianoRoll session={session} sel={sel} opts={opts} send={send} ref={roll} />
          <Inspector
            session={session}
            sel={sel}
            opts={opts}
            send={send}
            onSaveAsPattern={saveAsPattern}
          />
          <Stats session={session} />
        </VStack>
      </Card>

      <Grid columns={{ minWidth: 360 }} gap={4}>
        <OutputPanel
          text={text}
          opts={opts}
          onOpts={(o) => setOpts({ ...opts, ...o })}
          onCopy={async () => {
            await copyText(text)
            setHistory(upsertHistory(history, session))
            toast('복사했습니다 · 기록 저장됨')
          }}
          onImport={(t) => {
            send({ type: 'replace', session: parseText(t, session.date || today()) })
            toast('가져왔습니다', undo)
          }}
        />
        <HistoryPanel
          history={history}
          onLoad={(h) => {
            loadSession(h)
            toast(`${h.date} 기록을 불러왔습니다`, undo)
          }}
          onDelete={(i) => setHistory(history.filter((_, j) => j !== i))}
        />
      </Grid>
      {showKeys && (
        <Suspense>
          <ShortcutsDialog onClose={() => setShowKeys(false)} />
        </Suspense>
      )}
    </VStack>
  )
}

const s = stylex.create({
  main: {
    marginInline: 'auto',
    paddingTop: 'var(--spacing-5)',
    paddingInline: 'var(--spacing-4)',
    paddingBottom: 'var(--spacing-12)',
  },
})
