import { Kbd } from '@astryxdesign/core/Kbd'
import { useHotkeyHint, type AppHotkey } from '@tanstack/react-hotkeys'
import * as stylex from '@stylexjs/stylex'
import { Fragment } from 'react'

/** TanStack 키 이름 → Astryx Kbd 키 이름 ('Mod+Shift+Z' → 'mod+shift+Z'). 글자는 Kbd가 대문자로 보여준다 */
const KEY: Record<string, string> = {
  Mod: 'mod',
  Control: 'ctrl',
  Alt: 'alt',
  Shift: 'shift',
  Meta: 'meta',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Escape: 'escape',
  Enter: 'enter',
  Backspace: 'backspace',
  Tab: 'tab',
  Delete: '⌦',
  '[Minus]': '-',
  '[Equal]': '=',
}
const toKeys = (step: string) =>
  step
    .split(/\+(?=.)/)
    .map((k) => KEY[k] ?? k)
    .join('+')
    .replace(/\+\+$/, '+plus')

export function HotkeyKbd({ hotkey }: { hotkey: AppHotkey['hotkey'] }) {
  if (!hotkey) return null
  const steps = Array.isArray(hotkey) ? hotkey : [hotkey]
  return (
    <>
      {steps.map((step, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <Kbd keys={toKeys(String(step))} />
        </Fragment>
      ))}
    </>
  )
}

/**
 * 수정 키(⌘/Ctrl, ⌥/Alt 등)를 누르고 있는 동안에만 보이는 단축키 배지.
 * 단축키가 지금 실행 가능할 때만(활성 스코프, enabled) 나타난다.
 */
export function HotkeyHint({ hotkey }: { hotkey: AppHotkey }) {
  const show = useHotkeyHint(hotkey)
  if (!show || !hotkey.hotkey) return null
  return (
    <span data-hint {...stylex.props(s.hint)}>
      <HotkeyKbd hotkey={hotkey.hotkey} />
    </span>
  )
}

const s = stylex.create({ hint: { marginInlineStart: 'var(--spacing-1)' } })
