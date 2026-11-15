import { fmtN, fmtPace, totals } from '../../domain/math'
import type { Session } from '../../domain/types'
import {
  Button,
  Card,
  EmptyState,
  Heading,
  HStack,
  IconButton,
  icons,
  List,
  ListItem,
  VStack,
} from '../../ui'

type Props = {
  history: Session[]
  onLoad: (s: Session) => void
  onDelete: (index: number) => void
}

export function HistoryPanel({ history, onLoad, onDelete }: Props) {
  return (
    <Card>
      <VStack gap={2}>
        <Heading level={4} accessibilityLevel={2}>
          저장된 기록
        </Heading>
        {!history.length ? (
          <EmptyState
            isCompact
            icon={<icons.History />}
            title="아직 기록이 없습니다"
            description='"복사 + 저장"을 누르면 여기에 쌓입니다.'
          />
        ) : (
          <List hasDividers density="compact" edge="flush">
            {history.slice(0, 20).map((h, i) => {
              const t = totals(h.sections.flatMap((s) => s.segs))
              return (
                <ListItem
                  key={`${h.date}-${i}`}
                  label={h.memo ? `${h.date} · ${h.memo}` : h.date}
                  description={`${fmtN(t.min)}분 · ${t.km.toFixed(2)}km · ${fmtPace(t.avg)}/km`}
                  endContent={
                    <HStack gap={1}>
                      <Button size="sm" label="불러오기" onClick={() => onLoad(h)} />
                      <IconButton
                        size="sm"
                        variant="ghost"
                        icon={<icons.X />}
                        label="삭제"
                        tooltip="기록 삭제"
                        onClick={() => onDelete(i)}
                      />
                    </HStack>
                  }
                />
              )
            })}
          </List>
        )}
      </VStack>
    </Card>
  )
}
