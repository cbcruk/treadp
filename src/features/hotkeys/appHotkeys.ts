import { defineAppHotkeys } from '@tanstack/react-hotkeys'

// 텍스트 입력 중에는 브라우저 기본 동작(텍스트 undo 등)에 양보한다 (레거시와 동일).
// Mod 조합은 기본값이 '입력 중에도 실행'이라 명시한다.
const notInInputs = { ignoreInputs: true } as const

/**
 * 앱의 모든 단축키. id는 사용자 재지정 저장 키이므로 바꾸지 않는다.
 * - 명령(Undo 등)은 Mod: macOS ⌘, Windows/Linux Ctrl
 * - 위치가 의미 있는 쌍(줌 -/=)만 물리 키 코드 [Code]
 */
export const appHotkeys = defineAppHotkeys({
  'edit.undo': {
    hotkey: 'Mod+Z',
    meta: { name: '실행 취소', group: '편집' },
    options: notInInputs,
  },
  'edit.redo': {
    hotkey: 'Mod+Shift+Z',
    meta: { name: '다시 실행', group: '편집' },
    options: notInInputs,
  },
  'edit.redoAlt': {
    hotkey: 'Mod+Y',
    meta: { name: '다시 실행 (보조)', group: '편집' },
    options: notInInputs,
  },
  'sel.clear': { hotkey: 'Escape', meta: { name: '선택 해제', group: '선택' } },
  'sel.delete': { hotkey: 'Delete', meta: { name: '선택 삭제', group: '선택' } },
  'sel.deleteAlt': { hotkey: 'Backspace', meta: { name: '선택 삭제 (보조)', group: '선택' } },
  'clip.duplicate': {
    hotkey: 'Mod+D',
    meta: { name: '구간 복제', group: '구간' },
    options: notInInputs,
  },
  'clip.faster': { hotkey: 'ArrowUp', meta: { name: '속도 올리기', group: '구간' } },
  'clip.slower': { hotkey: 'ArrowDown', meta: { name: '속도 내리기', group: '구간' } },
  'clip.longer': { hotkey: 'ArrowRight', meta: { name: '시간 늘리기', group: '구간' } },
  'clip.shorter': { hotkey: 'ArrowLeft', meta: { name: '시간 줄이기', group: '구간' } },
  'clip.moveBack': { hotkey: 'Alt+ArrowLeft', meta: { name: '앞으로 이동', group: '구간' } },
  'clip.moveForward': { hotkey: 'Alt+ArrowRight', meta: { name: '뒤로 이동', group: '구간' } },
  'nav.first': {
    hotkey: ['G', 'G'],
    meta: { name: '처음 구간으로', group: '이동' },
    options: { timeout: 800 },
  },
  'nav.last': { hotkey: 'Shift+G', meta: { name: '마지막 구간으로', group: '이동' } },
  'view.zoomOut': { hotkey: '[Minus]', meta: { name: '축소', group: '보기' } },
  'view.zoomIn': { hotkey: '[Equal]', meta: { name: '확대', group: '보기' } },
  'help.shortcuts': { hotkey: '?', meta: { name: '단축키 목록', group: '도움말' } },
})

declare module '@tanstack/react-hotkeys' {
  interface Register {
    appHotkeys: typeof appHotkeys
  }
}
