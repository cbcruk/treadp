import {
  useAppHotkeyList,
  useCustomHotkeys,
  useFormatForDisplay,
  useHotkeyRecorder,
  type RecorderRejection,
  type RegisteredAppHotkeyListItem,
} from '@tanstack/react-hotkeys'
import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import {
  AppDialog,
  Button,
  HotkeyKbd,
  HStack,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  useHotkeyLabel,
  VStack,
} from '../../ui'
import { appHotkeys } from './appHotkeys'

/** 단축키 목록 + 재지정. 열려 있는 동안 페이지 단축키는 멈춘다 (Dialog의 exclusive 스코프). */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const items = useAppHotkeyList()
  const { customHotkeys, resetCustomHotkeys } = useCustomHotkeys()
  const groups = new Map<string, RegisteredAppHotkeyListItem[]>()
  for (const it of items) {
    const g = it.appHotkey.meta?.group ?? '기타'
    groups.set(g, [...(groups.get(g) ?? []), it])
  }

  return (
    <AppDialog title="키보드 단축키" onClose={onClose} toggleHotkey={appHotkeys['help.shortcuts']}>
      <Text type="supporting">
        단축키를 눌러 바꿉니다. 두 키를 이어서 누르면 시퀀스가 됩니다. <HotkeyKbd hotkey="Escape" />{' '}
        취소, <HotkeyKbd hotkey="Backspace" /> 할당 해제.
      </Text>
      {[...groups].map(([group, rows]) => (
        <Group key={group} group={group} rows={rows} />
      ))}
      <HStack hAlign="end">
        <Button
          variant="ghost"
          label="모두 기본값으로"
          isDisabled={!Object.keys(customHotkeys).length}
          onClick={resetCustomHotkeys}
        />
      </HStack>
    </AppDialog>
  )
}

function Group({ group, rows }: { group: string; rows: RegisteredAppHotkeyListItem[] }) {
  return (
    <Table density="compact">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>{group}</TableHeaderCell>
          <TableHeaderCell>
            <HStack hAlign="end">단축키</HStack>
          </TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item) => (
          <ShortcutRow key={item.appHotkey.id} item={item} />
        ))}
      </TableBody>
    </Table>
  )
}

/** 지금 실행되지 않는 단축키(마운트 안 됨/다이얼로그 때문에 멈춤)는 흐리게 */
const DIMMED = new Set<RegisteredAppHotkeyListItem['status']>(['inactive', 'suspended'])

const REJECT_REASON: Record<RecorderRejection['reason'], string> = {
  'alt-graph': 'AltGr 조합은 쓸 수 없습니다',
  'missing-code': '이 키는 인식할 수 없습니다',
  whitespace: '공백 키는 쓸 수 없습니다',
  validation: '쓸 수 없는 단축키입니다',
  conflict: '이미 쓰는 단축키입니다',
}

const STATUS_LABEL: Partial<Record<RegisteredAppHotkeyListItem['status'], string>> = {
  disabled: '지금은 꺼짐',
  inactive: '화면에 없음',
  unbound: '할당 없음',
}

function ShortcutRow({ item }: { item: RegisteredAppHotkeyListItem }) {
  const { appHotkey, status, isCustom, registrations } = item
  const id = appHotkey.id
  const label = useHotkeyLabel()
  const formatForDisplay = useFormatForDisplay()
  const { findConflicts, setCustomHotkey, resetCustomHotkey } = useCustomHotkeys()
  const [error, setError] = useState<string | null>(null)

  const recorder = useHotkeyRecorder({
    // 두 단계까지: 'G G' 같은 시퀀스. Enter나 0.8초 대기로 확정
    maxSteps: 2,
    idleTimeoutMs: 800,
    // 지금 등록된 단축키와 겹치는지 (자기 자신의 등록은 제외)
    detectConflicts: { excludeIds: registrations.map((r) => r.id) },
    // 마운트되지 않았거나 비활성인 앱 단축키까지 포함한 충돌
    validate: (hotkey, context) => {
      const [conflict] = findConflicts(id, hotkey, context)
      return conflict ? `"${conflict.meta?.name ?? conflict.id}"에서 사용 중` : true
    },
    onReject: (r) => {
      const who = r.conflicts?.[0]?.registration.options.meta?.name
      setError(r.message ?? (who ? `"${who}"에서 사용 중` : REJECT_REASON[r.reason]))
      // 여러 단계 녹화는 거부된 단계를 그대로 두므로(다음 키가 2단계가 됨), 빈 상태로 다시 시작한다.
      // recorder는 이 콜백이 실행될 때(키 입력 시) 이미 할당돼 있다
      queueMicrotask(() => {
        recorder.stopRecording()
        recorder.startRecording()
      })
    },
    onRecord: (hotkey, context) => {
      const conflicts = setCustomHotkey(id, hotkey, context)
      setError(
        conflicts.length ? `"${conflicts[0].meta?.name ?? conflicts[0].id}"에서 사용 중` : null,
      )
    },
    onClear: () => {
      setCustomHotkey(id, null)
      setError(null)
    },
    onCancel: () => setError(null),
  })

  const current = label(appHotkey)
  const recording = recorder.isRecording
  const steps = recorder.steps.length ? formatForDisplay(recorder.steps) : '키를 누르세요…'

  return (
    <TableRow data-status={status}>
      <TableCell>
        <VStack gap={0.5}>
          <Text color={DIMMED.has(status) ? 'secondary' : 'primary'}>
            {appHotkey.meta?.name}
            {STATUS_LABEL[status] && <Text type="supporting"> · {STATUS_LABEL[status]}</Text>}
          </Text>
          {error && (
            <Text type="supporting" xstyle={s.err}>
              {error}
            </Text>
          )}
        </VStack>
      </TableCell>
      <TableCell>
        <HStack hAlign="end" vAlign="center" gap={1}>
          {isCustom && (
            <Button
              size="sm"
              variant="ghost"
              label="기본값"
              onClick={() => resetCustomHotkey(id)}
            />
          )}
          <Button
            size="sm"
            variant={recording ? 'primary' : 'secondary'}
            aria-pressed={recording}
            label={`${appHotkey.meta?.name} 단축키 변경`}
            onClick={() => {
              setError(null)
              if (recording) recorder.cancelRecording()
              else recorder.startRecording()
            }}
          >
            {recording ? steps : current ? <HotkeyKbd hotkey={appHotkey.hotkey} /> : '—'}
          </Button>
        </HStack>
      </TableCell>
    </TableRow>
  )
}

const s = stylex.create({
  err: { color: 'var(--color-text-error)' },
})
