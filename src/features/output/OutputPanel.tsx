import { useState } from 'react'
import type { OutputOpts } from '../../domain/types'
import {
  Button,
  Card,
  CheckboxInput,
  Code,
  CodeBlock,
  Collapsible,
  Heading,
  HStack,
  icons,
  Text,
  TextArea,
  VStack,
} from '../../ui'

type Props = {
  text: string
  opts: OutputOpts
  onOpts: (o: OutputOpts) => void
  onCopy: () => void
  onImport: (text: string) => void
}

export function OutputPanel({ text, opts, onOpts, onCopy, onImport }: Props) {
  const [importText, setImportText] = useState('')
  return (
    <Card>
      <VStack gap={3}>
        <HStack gap={2} hAlign="between" vAlign="center" wrap="wrap">
          <Heading level={4} accessibilityLevel={2}>
            Claude에 붙여넣을 텍스트
          </Heading>
          <Button
            variant="primary"
            icon={<icons.ClipboardCopy />}
            label="복사 + 저장"
            tooltip="클립보드에 복사하고 기록에 저장"
            onClick={onCopy}
          />
        </HStack>
        <HStack gap={4} wrap="wrap">
          <CheckboxInput
            size="sm"
            label="요약 포함"
            value={opts.summary}
            onChange={(summary) => onOpts({ ...opts, summary })}
          />
          <CheckboxInput
            size="sm"
            label="묶음 이름 포함"
            value={opts.names}
            onChange={(names) => onOpts({ ...opts, names })}
          />
        </HStack>
        <CodeBlock data-testid="output" code={text} width="100%" isWrapped hasCopyButton={false} />
        <Collapsible trigger="텍스트로 가져오기" defaultIsOpen={false}>
          <VStack gap={2}>
            <Text type="supporting">
              기존 형식(<Code>6~11 10분</Code>, <Code>12 15분</Code>, <Code>---</Code>)을 붙여넣으면
              피아노롤로 변환합니다.
            </Text>
            <TextArea
              label="가져올 텍스트"
              isLabelHidden
              rows={7}
              placeholder={'6~11 10분\n---\n12 15분'}
              value={importText}
              onChange={setImportText}
            />
            <HStack>
              <Button
                label="가져오기"
                isDisabled={!importText.trim()}
                onClick={() => onImport(importText)}
              />
            </HStack>
          </VStack>
        </Collapsible>
      </VStack>
    </Card>
  )
}
