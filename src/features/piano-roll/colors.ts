import type { Hue } from '../../ui'

/**
 * 묶음/패턴 색. 저장 데이터의 color 인덱스 순서이므로 순서를 바꾸지 않는다.
 * Astryx 테마의 색상(hue) 이름이라 Token/Badge 색과 피아노롤 색이 같은 계열이 된다.
 */
export const HUES: readonly Hue[] = ['gray', 'blue', 'orange', 'green', 'purple', 'pink']

/** color 인덱스가 없으면 위치로 고른다 */
export const secHue = (sec: { color?: number }, si: number): Hue =>
  HUES[(sec.color ?? si) % HUES.length]

export type SecColors = {
  /** 묶음 띠 바탕 (Token 바탕과 같다) */
  soft: string
  text: string
  fill: string
  /** 블록 테두리, 속도 아래 영역 */
  strong: string
}

export function secColors(sec: { color?: number }, si: number): SecColors {
  const h = secHue(sec, si)
  return {
    soft: `var(--color-background-${h})`,
    text: `var(--color-text-${h})`,
    // 회색의 border 토큰은 다크 모드에서 바탕과 거의 같아서, 다크에서만 진한 쪽을 쓴다.
    // 캔버스는 프로브로 색을 계산하므로 light-dark()도 그대로 풀린다
    fill:
      h === 'gray'
        ? 'light-dark(var(--color-border-gray), var(--color-icon-gray))'
        : `var(--color-border-${h})`,
    strong: `var(--color-icon-${h})`,
  }
}
