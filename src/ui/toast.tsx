import { Button } from '@astryxdesign/core/Button'
import { useToast as useAstryxToast } from '@astryxdesign/core/Toast'

type Action = { label: string; onClick: () => void }

/** 짧은 알림. action을 주면 오른쪽에 버튼(예: 되돌리기)이 붙는다 */
export function useToast() {
  const show = useAstryxToast()
  return (body: string, action?: Action) => {
    const dismiss = show({
      body,
      autoHideDuration: action ? 5000 : 2500,
      endContent: action && (
        <Button
          size="sm"
          variant="ghost"
          label={action.label}
          onClick={() => {
            action.onClick()
            dismiss()
          }}
        />
      ),
    })
  }
}
