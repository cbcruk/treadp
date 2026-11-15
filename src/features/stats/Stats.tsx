import { endSpeed, fmtDur, fmtN, fmtPace, totals } from '../../domain/math'
import type { Session } from '../../domain/types'
import { Card, Grid, Text, VStack } from '../../ui'

export function Stats({ session }: { session: Session }) {
  const all = session.sections.flatMap((s) => s.segs)
  const t = totals(all)
  const max = Math.max(0, ...all.map((s) => Math.max(s.from || 0, endSpeed(s) || 0)))
  const items: [string, string][] = [
    ['총 시간', fmtDur(t.min)],
    ['거리', `${t.km.toFixed(2)} km`],
    ['평균 페이스', `${fmtPace(t.avg)}/km`],
    ['최고 속도', max ? `${fmtN(max)} km/h` : '-'],
  ]
  return (
    <Grid columns={{ minWidth: 140, repeat: 'fit' }} gap={2}>
      {items.map(([k, v]) => (
        <Card key={k} variant="muted" padding={3}>
          <VStack gap={0.5}>
            <Text type="supporting">{k}</Text>
            <Text type="large" weight="semibold" hasTabularNumbers>
              {v}
            </Text>
          </VStack>
        </Card>
      ))}
    </Grid>
  )
}
