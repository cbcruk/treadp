import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { VStack } from '@astryxdesign/core/VStack'
import { HotkeysProvider, useHotkey, type AppHotkey } from '@tanstack/react-hotkeys'
import { useId, type ReactNode } from 'react'

type Props = {
  title: string
  onClose: () => void
  /** 다이얼로그를 연 단축키. 열린 동안 페이지 단축키는 멈추므로, 같은 키로 닫을 수 있게 안에서도 등록한다. */
  toggleHotkey?: AppHotkey
  width?: number
  children: ReactNode
}

/**
 * Astryx Dialog(포커스 가두기, Escape/배경 클릭으로 닫기)를 고유한 exclusive 단축키 스코프로 감싼다.
 * 열려 있는 동안 페이지의 다른 단축키는 멈춘다.
 */
export function AppDialog(props: Props) {
  return (
    <HotkeysProvider scope={`dialog-${useId()}`} exclusive>
      <DialogBody {...props} />
    </HotkeysProvider>
  )
}

// 단축키는 가장 가까운 HotkeysProvider 아래에서 등록돼야 다이얼로그 스코프에 속한다
function DialogBody({ title, onClose, toggleHotkey, width = 560, children }: Props) {
  useHotkey(toggleHotkey, onClose)
  // Astryx는 Escape keydown 처리 중에 바로 닫는다. 그대로 언마운트하면 같은 keydown이 document의
  // 단축키 리스너에 닿을 때 이미 스코프가 사라져 페이지의 Escape(선택 해제)까지 실행된다 → 한 틱 미룬다
  const onOpenChange = (open: boolean) => {
    if (!open) setTimeout(onClose)
  }
  return (
    <Dialog isOpen onOpenChange={onOpenChange} width={width}>
      <DialogHeader title={title} onOpenChange={onOpenChange} />
      <VStack gap={3} padding={4}>
        {children}
      </VStack>
    </Dialog>
  )
}
