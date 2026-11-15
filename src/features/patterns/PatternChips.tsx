import { segLine } from '../../domain/format'
import { fmtN, totals } from '../../domain/math'
import type { Pattern } from '../../domain/types'
import { Button, HStack, Text, Token } from '../../ui'
import { secHue } from '../piano-roll/colors'

type Props = {
  patterns: Pattern[]
  onAdd: (p: Pattern) => void
  onDelete: (index: number) => void
  onRestoreDefaults: () => void
}

export function PatternChips({ patterns, onAdd, onDelete, onRestoreDefaults }: Props) {
  return (
    <HStack gap={2} wrap="wrap" vAlign="center">
      <Text type="supporting">패턴 추가</Text>
      {patterns.map((p, i) => (
        <Token
          key={`${i}-${p.name}`}
          data-testid="pattern-add"
          label={p.name}
          color={secHue(p, i)}
          description={p.segs.map(segLine).join(', ')}
          endContent={<Text type="supporting">{fmtN(totals(p.segs).min)}분</Text>}
          onClick={() => onAdd(p)}
          onRemove={() => onDelete(i)}
        />
      ))}
      {!patterns.length && <Button size="sm" label="기본 패턴 복원" onClick={onRestoreDefaults} />}
    </HStack>
  )
}
