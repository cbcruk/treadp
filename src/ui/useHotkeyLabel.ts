import { useFormatForDisplay, type AppHotkey } from '@tanstack/react-hotkeys'

/** 단축키 표시용 라벨 (플랫폼에 맞게: ⌘Z / Ctrl+Z). 재지정되면 따라 바뀐다. 할당이 없으면 null. */
export function useHotkeyLabel() {
  const formatForDisplay = useFormatForDisplay()
  return (hotkey: AppHotkey) => (hotkey.hotkey ? formatForDisplay(hotkey.hotkey) : null)
}
