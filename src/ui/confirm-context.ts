import { createContext, useContext } from 'react'

export type ConfirmOptions = {
  title: string
  description?: string
  actionLabel: string
  /** 되돌릴 수 없는 동작: 빨간 버튼 */
  destructive?: boolean
}

export const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false)

export const useConfirm = () => useContext(ConfirmCtx)
