import * as stylex from '@stylexjs/stylex'

/**
 * Astryx 테마 토큰 별칭. 값(라이트/다크 포함)은 테마가 정한다.
 * features/는 `@astryxdesign/*`를 직접 import 하지 않으므로 여기서 이름만 붙인다.
 */
export const colors = stylex.defineConsts({
  bg: 'var(--color-background-body)',
  surface: 'var(--color-background-surface)',
  muted: 'var(--color-background-muted)',
  text: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  border: 'var(--color-border)',
  borderStrong: 'var(--color-border-emphasized)',
  accent: 'var(--color-accent)',
  error: 'var(--color-text-error)',
  onAccent: 'var(--color-on-accent)',
})

export const space = stylex.defineConsts({
  s1: 'var(--spacing-1)',
  s2: 'var(--spacing-2)',
  s3: 'var(--spacing-3)',
  s4: 'var(--spacing-4)',
})

export const radius = stylex.defineConsts({
  element: 'var(--radius-element)',
  container: 'var(--radius-container)',
})
