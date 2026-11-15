import { expect, test, type Page } from '@playwright/test'

// 참고: Playwright의 press('Shift+/')는 key '/'를 보낸다. 실제 US 키보드처럼 key '?'를 보내려고 press('?')를 쓴다.

const output = (page: Page) => page.getByTestId('output')

/** 앱이 그려지고 단축키가 등록될 때까지(커밋 이후 프레임) 기다린다 */
async function open(page: Page) {
  await page.goto('/')
  await expect(output(page)).not.toBeEmpty()
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  )
}
const dialog = (page: Page) => page.getByRole('dialog', { name: '키보드 단축키' })
const expectLastLine = (page: Page, line: string) =>
  expect
    .poll(async () => (await output(page).innerText()).replaceAll('\u200b', '').split('\n').at(-1))
    .toBe(line)

test('G G / Shift+G로 처음·마지막 구간 선택, 화살표로 편집', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Shift+G')
  await page.keyboard.press('ArrowUp')
  await expectLastLine(page, '6.5 5분')

  await page.keyboard.press('g')
  await page.keyboard.press('g')
  await page.keyboard.press('ArrowUp')
  await expect.poll(() => output(page).innerText()).toMatch(/^6.5~11.5 10분/)
})

test('단축키 목록: ? 로 열고, 열린 동안 페이지 단축키는 멈춘다', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Shift+G') // 마지막 구간 선택
  await page.keyboard.press('?')
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByText('실행 취소')).toBeVisible()

  // exclusive 스코프: 화살표가 페이지로 가지 않는다
  await page.keyboard.press('ArrowUp')
  await expectLastLine(page, '6 5분')

  // 같은 키(?)로 닫고, 다시 열어서 Escape로 닫는다
  await page.keyboard.press('?')
  await expect(dialog(page)).toBeHidden()
  await page.getByRole('button', { name: '단축키', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()

  await page.keyboard.press('ArrowUp')
  await expectLastLine(page, '6.5 5분')
})

test('재지정: 녹화 → 충돌 거부 → 새 키 적용 → 새로고침 후 유지', async ({ page }) => {
  await open(page)
  await page.keyboard.press('?')
  const rec = dialog(page).getByRole('button', { name: '속도 올리기 단축키 변경' })

  // 이미 쓰는 키(Mod+Z)는 거부되고 녹화는 계속된다
  await rec.click()
  await page.keyboard.press('Control+z')
  await expect(dialog(page).getByText('"실행 취소"에서 사용 중')).toBeVisible()
  await expect(rec).toHaveAttribute('aria-pressed', 'true')

  // 비어 있는 키(K)로 변경
  await page.keyboard.press('k')
  await expect(rec).toHaveAttribute('aria-pressed', 'false', { timeout: 3000 })
  await expect(rec).toHaveText('K')
  await expect(dialog(page).getByRole('button', { name: '기본값', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.reload()
  await expect(output(page)).not.toBeEmpty()
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  )
  await page.keyboard.press('Shift+G')
  await page.keyboard.press('ArrowUp') // 이전 키는 더 이상 동작하지 않는다
  await expectLastLine(page, '6 5분')
  await page.keyboard.press('k')
  await expectLastLine(page, '6.5 5분')

  await page.keyboard.press('?')
  await dialog(page).getByRole('button', { name: '모두 기본값으로' }).click()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await page.keyboard.press('ArrowUp')
  await expectLastLine(page, '7 5분')
})

test('수정 키를 누르고 있는 동안 힌트가 보인다', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Control+z') // 비활성: 아무 일 없음
  await page.keyboard.press('Shift+G') // 구간 선택 → 복제 버튼 표시
  const dup = page.getByRole('button', { name: /^복제/ }).first()
  await expect(dup.locator('[data-hint]')).toHaveCount(0)
  await page.keyboard.down('Control')
  await expect(dup.locator('[data-hint]')).toHaveText(/D/)
  await page.keyboard.up('Control')
  await expect(dup.locator('[data-hint]')).toHaveCount(0)
})

test('입력 필드에서는 Mod+Z/화살표가 페이지 단축키로 가지 않는다', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Shift+G')
  const speed = page.getByLabel('시작 속도')
  await speed.focus()
  await page.keyboard.press('ArrowUp') // number input 자체의 증가
  await expect(speed).toHaveValue('6.1')
  await page.keyboard.press('Control+z') // 브라우저 텍스트 undo, 앱 undo 아님
  await speed.blur()
  await expect(page.getByRole('button', { name: '실행 취소' })).toBeVisible()
})
