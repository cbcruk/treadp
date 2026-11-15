import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmCtx, type ConfirmOptions } from './confirm-context'

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

/** window.confirm 대신 Astryx AlertDialog. 열린 동안 페이지 단축키는 멈춘다 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const ask = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })),
    [],
  )
  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }
  return (
    <ConfirmCtx value={ask}>
      {children}
      {pending && (
        <HotkeysProvider scope="confirm" exclusive>
          <AlertDialog
            isOpen
            // AppDialog와 같은 이유로 한 틱 미룬다 (Escape가 페이지 단축키로 새지 않게)
            onOpenChange={(open) => {
              if (!open) setTimeout(() => close(false))
            }}
            title={pending.title}
            description={pending.description ?? ''}
            actionLabel={pending.actionLabel}
            actionVariant={pending.destructive ? 'destructive' : 'primary'}
            cancelLabel="취소"
            onAction={() => close(true)}
          />
        </HotkeysProvider>
      )}
    </ConfirmCtx>
  )
}
