import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput'
import { useState } from 'react'

export type LiveInputProps = Omit<
  TextInputProps,
  'value' | 'onChange' | 'onEnter' | 'onFocus' | 'onBlur'
> & {
  value: string
  /** 포커스 시작: 편집 묶음 시작 */
  onBegin?: () => void
  onLive: (text: string) => void
  /** Enter로 확정 (포커스 유지) */
  onCommit?: () => void
  /** 포커스 종료 (확정 포함) */
  onEnd?: () => void
}

/**
 * 입력 중에는 사용자가 친 텍스트를 그대로 보여주고(정리된 값으로 덮어쓰지 않음),
 * 포커스가 없을 때는 외부 값(undo 등)을 따른다.
 */
export function LiveInput({ value, onBegin, onLive, onCommit, onEnd, ...rest }: LiveInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <TextInput
      {...rest}
      value={draft ?? value}
      onFocus={() => {
        setDraft(value)
        onBegin?.()
      }}
      onChange={(v) => {
        setDraft(v)
        onLive(v)
      }}
      onEnter={onCommit}
      onBlur={() => {
        setDraft(null)
        onEnd?.()
      }}
    />
  )
}
