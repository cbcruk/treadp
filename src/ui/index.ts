// 디자인 시스템 어댑터. features/는 여기서만 UI를 가져온다 (`@astryxdesign/*` 직접 import는 lint로 금지).
// Astryx 컴포넌트는 그대로 다시 내보내고, 앱에 맞춘 조합(단축키 표시, 확인 대화상자 등)만 여기서 만든다.
// Astryx를 걷어낼 때는 이 폴더만 바꾸면 된다.

export { Card } from '@astryxdesign/core/Card'
export { HStack } from '@astryxdesign/core/HStack'
export { VStack } from '@astryxdesign/core/VStack'
export { Grid } from '@astryxdesign/core/Grid'
export { Divider } from '@astryxdesign/core/Divider'
export { Heading } from '@astryxdesign/core/Heading'
export { Text } from '@astryxdesign/core/Text'
export { Code } from '@astryxdesign/core/Code'
export { CodeBlock } from '@astryxdesign/core/CodeBlock'
export { Collapsible } from '@astryxdesign/core/Collapsible'
export { EmptyState } from '@astryxdesign/core/EmptyState'
export { List, ListItem } from '@astryxdesign/core/List'
export { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
export {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@astryxdesign/core/Table'
export { Token } from '@astryxdesign/core/Token'
export { Badge } from '@astryxdesign/core/Badge'
export { Tooltip } from '@astryxdesign/core/Tooltip'
export { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'

export { Button } from '@astryxdesign/core/Button'
export { IconButton } from '@astryxdesign/core/IconButton'
export { ButtonGroup } from '@astryxdesign/core/ButtonGroup'
export { Toolbar } from '@astryxdesign/core/Toolbar'
export { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
export { TextInput } from '@astryxdesign/core/TextInput'
export { NumberInput } from '@astryxdesign/core/NumberInput'
export { DateInput } from '@astryxdesign/core/DateInput'
export type { ISODateString } from '@astryxdesign/core/Calendar'
export { TextArea } from '@astryxdesign/core/TextArea'
export { CheckboxInput } from '@astryxdesign/core/CheckboxInput'

export { AppProviders } from './AppProviders'
export { AppDialog } from './AppDialog'
export { useConfirm } from './confirm-context'
export { useToast } from './toast'
export { HotkeyHint, HotkeyKbd } from './HotkeyHint'
export { useHotkeyLabel } from './useHotkeyLabel'
export { LiveInput, type LiveInputProps } from './LiveInput'
export * as icons from './icons'

/** Astryx 테마의 색상(hue) 이름. Token/Badge/Card 색과 피아노롤 묶음 색에 함께 쓴다 */
export type Hue = 'gray' | 'blue' | 'orange' | 'green' | 'purple' | 'pink'
