// 순서가 중요하다: reset → 컴포넌트 → 테마(astryx-themes가 theme.css를 가져온다)
import '@astryxdesign/core/reset.css'
import '@astryxdesign/core/astryx.css'
import { InternationalizationProvider } from '@astryxdesign/core/i18n'
import koKR from '@astryxdesign/core/locales/ko-KR.generated.js'
import { Theme } from '@astryxdesign/core/theme'
import type { ReactNode } from 'react'
import { defaultThemeSlug, themes } from '../astryx-themes'
import { ConfirmProvider } from './confirm'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <InternationalizationProvider locale="ko-KR" messages={{ 'ko-KR': koKR }}>
      <Theme theme={themes[defaultThemeSlug]}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </Theme>
    </InternationalizationProvider>
  )
}
