import { expect, test, type Page } from '@playwright/test'
import legacy from '../tests/fixtures/legacy.json' with { type: 'json' }
import {
  LANE,
  ROW,
  TOP,
  clipShape,
  knobs,
  layout,
  resizeRect,
  speedRange,
} from '../src/features/piano-roll/geometry'
import { DEFAULT_PATTERNS, sessionFromPatterns, type Session } from '../src/domain/types'

const PX = 14 // 기본 줌: 1분당 px
const PX_OUT = 11 // 축소 한 번: round(14 / 1.25)

/** 기본 데이터(75분)는 기본 줌에서 화면 밖까지 이어지므로, 끝부분을 다룰 때 한 단계 축소한다. */
const zoomOut = (page: Page) => page.getByRole('button', { name: '축소' }).click()

const output = (page: Page) => page.getByTestId('output')
/**
 * 출력 텍스트. 줄마다 요소가 따로 있어서 textContent에는 줄바꿈이 없으므로 innerText를 쓰고,
 * 빈 줄에 들어가는 폭 없는 공백(U+200B)은 지운다.
 */
const outText = async (page: Page) => (await output(page).innerText()).replaceAll('\u200b', '')
const out = (page: Page) => expect.poll(() => outText(page))

/**
 * 피아노롤은 캔버스라 요소로 찾을 수 없다. 앱과 같은 geometry로 화면 좌표를 계산한다.
 * 세션/줌은 앱이 저장한 localStorage에서 읽는다 (아직 저장 전이면 기본 패턴).
 */
async function roll(page: Page) {
  const { draft, opts } = await page.evaluate(() => ({
    draft: localStorage.getItem('treadp:draft'),
    opts: localStorage.getItem('treadp:opts'),
  }))
  const session: Session = draft ? JSON.parse(draft) : sessionFromPatterns(DEFAULT_PATTERNS)
  const px: number = opts ? JSON.parse(opts).px : PX
  const box = (await page.getByTestId('roll').boundingBox())!
  const scrollX = await page.getByTestId('roll-scroller').evaluate((el) => el.scrollLeft)
  const L = layout(session, px, speedRange(session), box.width)
  const toPage = (x: number, y: number) => ({ x: box.x + x - scrollX, y: box.y + y })
  return {
    L,
    box,
    toPage,
    clip(si: number, gi: number, role: 'clip' | 'resize' | 'knob1' = 'clip') {
      const c = L.clips.find((c) => c.si === si && c.gi === gi)!
      const sh = clipShape(L, c)
      if (role === 'resize') {
        const r = resizeRect(sh)
        return toPage(r.x + r.w / 2, r.y + r.h / 2)
      }
      if (role === 'knob1') return toPage(knobs(sh).knob1!.x, knobs(sh).knob1!.y)
      return toPage((sh.x0 + sh.x1) / 2, (sh.y0 + sh.y1) / 2)
    },
    sec(si: number) {
      const s = L.secs.find((s) => s.si === si)!
      return toPage(((s.t0 + s.t1) / 2) * px, LANE / 2)
    },
    /** 마지막 구간 오른쪽 빈 곳 (드래그해서 구간 추가) */
    drawZone: () => toPage(L.total * px, TOP),
  }
}

async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 3 })
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 3 })
  await page.mouse.up()
}

const defaultText = legacy.format.find(
  (f) => f.name === 'defaultDraft' && !f.opts.summary && !f.opts.names,
)!.text

test('기본 화면의 출력이 레거시와 같다', async ({ page }) => {
  await page.goto('/')
  await out(page).toBe(defaultText)
})

test('레거시 localStorage(v0)를 그대로 연다', async ({ page }) => {
  const f = legacy.format.find(
    (x) => x.name === 'withMemoAndFractions' && x.opts.summary && x.opts.names,
  )!
  await page.addInitScript(
    ([draft, opts]) => {
      localStorage.setItem('treadp:draft', draft)
      localStorage.setItem('treadp:opts', opts)
    },
    [
      JSON.stringify(f.session),
      JSON.stringify({ ...f.opts, px: 14, snapT: 1, snapV: 0.5 }),
    ] as const,
  )
  await page.goto('/')
  await out(page).toBe(f.text)
})

test('드래그 4종 + undo/redo', async ({ page }) => {
  await page.goto('/')

  // 1) 블록 세로 드래그: +1 km/h → 웜업 6~11 → 7~12
  await drag(page, (await roll(page)).clip(0, 0), 0, -2 * ROW)
  await out(page).toMatch(/^7~12 10분/)

  // 2) 오른쪽 끝 드래그: +2분 → 12분
  await drag(page, (await roll(page)).clip(0, 0, 'resize'), 2 * PX, 0)
  await out(page).toMatch(/^7~12 12분/)

  // 3) ○ 손잡이(끝 속도): 선택된 상태에서 knob1을 -1 km/h → 7~11
  await drag(page, (await roll(page)).clip(0, 0, 'knob1'), 0, 2 * ROW)
  await out(page).toMatch(/^7~11 12분/)

  // 4) 묶음 띠 드래그: 쿨다운(마지막)을 맨 앞으로
  await zoomOut(page)
  const r = await roll(page)
  const band = r.sec(2)
  await drag(page, band, r.box.x + 5 - band.x, 0)
  await out(page).toMatch(/^6 5분\n---\n7~11 12분/)

  // undo 4번 → 원래대로, redo 1번 → 세로 드래그 결과
  const undo = page.getByRole('button', { name: '실행 취소' })
  for (let i = 0; i < 4; i++) await undo.click()
  await out(page).toBe(defaultText)
  await expect(undo).toBeDisabled()
  await page.getByRole('button', { name: '다시 실행' }).click()
  await out(page).toMatch(/^7~12 10분/)
})

test('빈 곳 드래그로 구간 추가, 키보드 단축키', async ({ page }) => {
  await page.goto('/')
  await zoomOut(page)
  const zone = (await roll(page)).drawZone()
  // 마지막 구간(5분)의 시간을 이어받지 않고 드래그 길이(3분)로, 세로 이동 없음 → 일정 속도
  await drag(page, { x: zone.x + 20, y: zone.y + 4 * ROW * 2 }, 3 * PX_OUT, 0)
  await out(page).toMatch(/\n\d+(\.\d+)? 3분$/)

  // 추가된 구간이 선택됨 → ↑ 두 번(+1), → 한 번(+1분), ⌘D 복제
  const before = (await outText(page)).split('\n').at(-1)!
  const v = parseFloat(before)
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Control+d')
  await out(page).toMatch(new RegExp(`\\n${v + 1} 4분\\n${v + 1} 4분$`))
  await page.keyboard.press('Delete')
  await page.keyboard.press('Control+z')
  await out(page).toMatch(new RegExp(`\\n${v + 1} 4분\\n${v + 1} 4분$`))
})

test('텍스트 가져오기 → 복사 + 저장 → 기록에서 불러오기', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const input = legacy.parse.find((p) => p.name === 'userSample')!.input
  await page.getByText('텍스트로 가져오기').click()
  await page.getByLabel('가져올 텍스트').fill(input)
  await page.getByRole('button', { name: '가져오기', exact: true }).click()
  await out(page).toBe(input)

  await page.getByRole('button', { name: '복사 + 저장' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(input)

  await page.getByRole('button', { name: '비우기' }).click()
  await out(page).toBe('메모(선택)')
  await page.getByRole('button', { name: '불러오기', exact: true }).click()
  await out(page).toBe(input)
})

test('편집한 내용이 새로고침 후에도 남는다 (draft 저장)', async ({ page }) => {
  await page.goto('/')
  await drag(page, (await roll(page)).clip(0, 0), 0, -2 * ROW)
  await out(page).toMatch(/^7~12 10분/)
  await page.reload()
  await out(page).toMatch(/^7~12 10분/)
})

test('패턴을 추가하면 피아노롤이 맨 오른쪽으로 스크롤된다', async ({ page }) => {
  await page.goto('/')
  const scroller = page.getByTestId('roll-scroller')
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0)
  await page.getByTestId('pattern-add').filter({ hasText: '쿨다운' }).click()
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft))
    .toBeLessThanOrEqual(1)
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
})

test('창 크기가 바뀌면 피아노롤 폭이 따라간다', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '축소' }).click()
  await page.getByRole('button', { name: '축소' }).click() // 전체가 화면 안에 들어오도록
  const canvas = page.getByTestId('roll')
  const w0 = (await canvas.boundingBox())!.width
  await page.setViewportSize({ width: 700, height: 900 })
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeLessThan(w0)
  // 캔버스 해상도도 따라간다 (devicePixelRatio 배)
  const { w, cw, dpr } = await canvas.evaluate((el: HTMLCanvasElement) => ({
    w: el.width,
    cw: el.clientWidth,
    dpr: devicePixelRatio,
  }))
  expect(w).toBe(Math.round(cw * dpr))
})

test('캔버스에 실제로 그려진다 (구간 블록 색)', async ({ page }) => {
  await page.goto('/')
  const r = await roll(page)
  const p = r.clip(0, 0)
  const pixel = (x: number, y: number) =>
    page.getByTestId('roll').evaluate(
      (el: HTMLCanvasElement, [x, y]) => {
        const d = devicePixelRatio
        return [
          ...el
            .getContext('2d')!
            .getImageData(x * d, y * d, 1, 1)
            .data.slice(0, 3),
        ]
      },
      [x, y] as const,
    )
  // 블록 가운데와, 같은 x에서 블록 위 30px(빈 곳)의 색이 다르다
  const block = await pixel(p.x - r.box.x, p.y - r.box.y)
  const empty = await pixel(p.x - r.box.x, p.y - r.box.y - 30)
  const diff = block.reduce((sum, v, i) => sum + Math.abs(v - empty[i]), 0)
  expect(diff).toBeGreaterThan(30)
  await expect(page.getByRole('img', { name: /피아노롤: 웜업/ })).toBeVisible()
})
