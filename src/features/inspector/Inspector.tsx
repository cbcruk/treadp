import { useHotkey } from '@tanstack/react-hotkeys'
import { fmtN, fmtPace, fmtPaceRange, r1, segKm, totals } from '../../domain/math'
import type { Opts, Section, Segment, Session } from '../../domain/types'
import type { EditorEvent, Sel } from '../../state/editorMachine'
import {
  Button,
  ButtonGroup,
  Divider,
  HotkeyHint,
  HotkeyKbd,
  HStack,
  IconButton,
  icons,
  LiveInput,
  NumberInput,
  Text,
  Token,
  useHotkeyLabel,
} from '../../ui'
import { appHotkeys } from '../hotkeys/appHotkeys'
import { secHue } from '../piano-roll/colors'

type Props = {
  session: Session
  sel: Sel
  opts: Opts
  send: (e: EditorEvent) => void
  onSaveAsPattern: (sec: Section, si: number) => void
}

export function Inspector({ session, sel, opts, send, onSaveAsPattern }: Props) {
  const label = useHotkeyLabel()
  const isClip = sel?.type === 'clip'
  const nudge = (dv: number, dt: number) => send({ type: 'nudge', dv, dt, minMin: opts.snapT })

  // 선택이 있을 때만 켠다. 꺼진 화살표/Backspace는 브라우저 기본 동작(스크롤 등)으로 돌아간다
  useHotkey(appHotkeys['sel.clear'], () => send({ type: 'select', sel: null }), { enabled: !!sel })
  useHotkey(appHotkeys['sel.delete'], () => send({ type: 'deleteSel' }), { enabled: !!sel })
  useHotkey(appHotkeys['sel.deleteAlt'], () => send({ type: 'deleteSel' }), { enabled: !!sel })
  useHotkey(appHotkeys['clip.duplicate'], () => send({ type: 'dupClip' }), { enabled: isClip })
  useHotkey(appHotkeys['clip.faster'], () => nudge(opts.snapV, 0), { enabled: isClip })
  useHotkey(appHotkeys['clip.slower'], () => nudge(-opts.snapV, 0), { enabled: isClip })
  useHotkey(appHotkeys['clip.longer'], () => nudge(0, opts.snapT), { enabled: isClip })
  useHotkey(appHotkeys['clip.shorter'], () => nudge(0, -opts.snapT), { enabled: isClip })
  useHotkey(appHotkeys['clip.moveBack'], () => send({ type: 'moveClip', dir: -1 }), {
    enabled: isClip,
  })
  useHotkey(appHotkeys['clip.moveForward'], () => send({ type: 'moveClip', dir: 1 }), {
    enabled: isClip,
  })

  const key = (hk: (typeof appHotkeys)[keyof typeof appHotkeys], what: string) => {
    const l = label(hk)
    return l ? (
      <>
        {' '}
        <HotkeyKbd hotkey={hk.hotkey} /> {what}
      </>
    ) : null
  }
  const titled = (name: string, hk: (typeof appHotkeys)[keyof typeof appHotkeys]) =>
    label(hk) ? `${name} (${label(hk)})` : name

  // 이름 입력: 포커스 동안의 변경을 undo 한 번으로 묶는다
  const live = {
    onBegin: () => send({ type: 'gestureBegin' }),
    onCommit: () => {
      send({ type: 'gestureEnd' })
      send({ type: 'gestureBegin' })
    },
    onEnd: () => send({ type: 'gestureEnd' }),
  }

  if (!sel) {
    return (
      <Text type="supporting" display="block">
        블록 위아래로 끌기: 속도 · 오른쪽 끝 끌기: 시간 · 선택 후 ○ 손잡이: 시작/끝 속도 따로(점진
        가속) · 위쪽 띠 끌기: 묶음 순서 · 빈 곳 드래그: 구간 추가 ·
        {key(appHotkeys['sel.delete'], '삭제')}
        {key(appHotkeys['clip.faster'], '속도')}
        {key(appHotkeys['clip.longer'], '시간')}
        {key(appHotkeys['clip.duplicate'], '복제')}
        {key(appHotkeys['edit.undo'], '취소')}
        {key(appHotkeys['help.shortcuts'], '단축키 목록')}
      </Text>
    )
  }

  const sec = session.sections[sel.si]
  const tag = <Token label={sec.name || '묶음'} color={secHue(sec, sel.si)} />

  if (sel.type === 'clip') {
    const s = sec.segs[sel.gi]
    const { si, gi } = sel
    // 숫자 입력은 Enter/blur/스텝에서 확정된다: 확정 한 번 = undo 한 번
    const commit = (patch: Partial<Segment>) => {
      send({ type: 'gestureBegin' })
      send({ type: 'previewSeg', si, gi, patch })
      send({ type: 'gestureEnd' })
    }
    return (
      <HStack gap={2} wrap="wrap" vAlign="end">
        {tag}
        <NumberInput
          size="sm"
          width={128}
          label="시작 속도"
          units="km/h"
          step={0.1}
          min={0.5}
          value={s.from}
          onChange={(from) => commit({ from })}
        />
        <NumberInput
          size="sm"
          width={128}
          label="끝 속도"
          units="km/h"
          placeholder="일정"
          step={0.1}
          min={0.5}
          hasClear
          value={s.to}
          onChange={(to) => commit({ to })}
        />
        <NumberInput
          size="sm"
          width={104}
          label="시간"
          units="분"
          step={opts.snapT}
          min={opts.snapT}
          value={r1(s.min)}
          onChange={(min) => commit({ min })}
        />
        <Text type="supporting" hasTabularNumbers>
          {segKm(s).toFixed(2)}km · {fmtPaceRange(s)}
        </Text>
        <Divider orientation="vertical" />
        <HStack gap={1} wrap="wrap">
          <ButtonGroup label="순서" size="sm">
            <IconButton
              label="앞으로"
              icon={<icons.ChevronLeft />}
              tooltip={titled('앞으로', appHotkeys['clip.moveBack'])}
              onClick={() => send({ type: 'moveClip', dir: -1 })}
            />
            <IconButton
              label="뒤로"
              icon={<icons.ChevronRight />}
              tooltip={titled('뒤로', appHotkeys['clip.moveForward'])}
              onClick={() => send({ type: 'moveClip', dir: 1 })}
            />
          </ButtonGroup>
          <Button
            size="sm"
            icon={<icons.Copy />}
            label="복제"
            tooltip={titled('복제', appHotkeys['clip.duplicate'])}
            onClick={() => send({ type: 'dupClip' })}
          >
            복제
            <HotkeyHint hotkey={appHotkeys['clip.duplicate']} />
          </Button>
          <Button
            size="sm"
            icon={<icons.Plus />}
            label="+0.5 다음"
            tooltip="0.5 km/h 빠른 구간을 뒤에 추가"
            onClick={() => send({ type: 'addNext' })}
          />
          <Button
            size="sm"
            icon={<icons.Scissors />}
            label="여기서 나누기"
            tooltip="이 블록부터 새 묶음(---)으로"
            isDisabled={gi === 0}
            onClick={() => send({ type: 'splitHere' })}
          />
          <Button
            size="sm"
            variant="destructive"
            icon={<icons.Trash2 />}
            label="삭제"
            tooltip={titled('삭제', appHotkeys['sel.delete'])}
            onClick={() => send({ type: 'deleteSel' })}
          />
        </HStack>
      </HStack>
    )
  }

  const t = totals(sec.segs)
  return (
    <HStack gap={2} wrap="wrap" vAlign="end">
      <LiveInput
        {...live}
        size="sm"
        width={160}
        label="묶음 이름"
        value={sec.name}
        onLive={(v) => send({ type: 'previewSectionName', si: sel.si, name: v })}
      />
      <Text type="supporting" hasTabularNumbers>
        {sec.segs.length}구간 · {fmtN(t.min)}분 · {t.km.toFixed(2)}km · {fmtPace(t.avg)}/km
      </Text>
      <Divider orientation="vertical" />
      <HStack gap={1} wrap="wrap">
        <Button
          size="sm"
          icon={<icons.Palette />}
          label="색"
          tooltip="색 바꾸기"
          onClick={() => send({ type: 'cycleColor' })}
        />
        <Button
          size="sm"
          icon={<icons.BookmarkPlus />}
          label="패턴으로 저장"
          onClick={() => onSaveAsPattern(sec, sel.si)}
        />
        <Button
          size="sm"
          icon={<icons.Copy />}
          label="복제"
          onClick={() => send({ type: 'dupSection' })}
        />
        <Button
          size="sm"
          icon={<icons.Merge />}
          label="앞과 합치기"
          tooltip="앞 묶음과 합치기"
          isDisabled={sel.si === 0}
          onClick={() => send({ type: 'mergePrev' })}
        />
        <Button
          size="sm"
          variant="destructive"
          icon={<icons.Trash2 />}
          label="삭제"
          onClick={() => send({ type: 'deleteSel' })}
        />
      </HStack>
    </HStack>
  )
}
