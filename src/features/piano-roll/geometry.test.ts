import { describe, expect, it } from 'vite-plus/test'
import { clipShape, hitTest, knobs, LANE, layout, reorderTarget, speedRange, TOP } from './geometry'

const session = {
  version: 1 as const,
  date: '',
  memo: '',
  sections: [
    { name: 'a', segs: [{ from: 6, to: 11, min: 10 }] },
    {
      name: 'b',
      segs: [
        { from: 12, to: null, min: 5 },
        { from: 16, to: null, min: 5 },
      ],
    },
  ],
}

describe('geometry', () => {
  it('speedRange: 최소 5..15를 포함하고 여유 1을 둔다', () => {
    expect(speedRange(session)).toEqual({ vMin: 5, vMax: 17 })
    expect(speedRange({ ...session, sections: [] })).toEqual({ vMin: 5, vMax: 15 })
  })

  it('layout: 구간 시간을 누적한다', () => {
    const L = layout(session, 10, speedRange(session), 0)
    expect(L.clips.map((c) => [c.t0, c.t1])).toEqual([
      [0, 10],
      [10, 15],
      [15, 20],
    ])
    expect(L.secs.map((s) => [s.t0, s.t1])).toEqual([
      [0, 10],
      [10, 20],
    ])
    expect(L.width).toBe(600) // 뷰포트 폭을 모르면 600 (레거시와 동일)
    expect(layout(session, 30, speedRange(session), 0).width).toBe(1350)
    expect(L.vAt(L.y(12.5))).toBeCloseTo(12.5)
  })

  it('reorderTarget', () => {
    const L = layout(session, 10, speedRange(session), 0)
    expect(reorderTarget(L.secs, 0, 16)).toBe(1) // a를 b 중점(15) 너머로
    expect(reorderTarget(L.secs, 1, 2)).toBe(0) // b를 a 중점(5) 앞으로
  })
})

describe('hitTest', () => {
  // a: 6→11 (0~10분), b: 12 (10~15분), 16 (15~20분). px=10
  const L = layout(session, 10, speedRange(session), 0)
  const at = (x: number, y: number, sel: Parameters<typeof hitTest>[1] = null) =>
    hitTest(L, sel, x, y)
  const mid = (i: number) => {
    const sh = clipShape(L, L.clips[i])
    return { x: (sh.x0 + sh.x1) / 2, y: (sh.y0 + sh.y1) / 2, sh }
  }

  it('점진 구간은 기울어진 띠를 따라 판정한다', () => {
    const { x, y } = mid(0)
    expect(at(x, y)).toEqual({ role: 'clip', si: 0, gi: 0 })
    // 같은 x에서 띠 두께(±h)를 벗어나면 빈 곳 (위쪽은 영역 채우기, 클릭 대상 아님)
    expect(at(x, y - 20)).toBeNull()
  })

  it('오른쪽 끝은 시간 조절', () => {
    const { sh } = mid(1)
    expect(at(sh.x1, sh.y1)).toEqual({ role: 'resize', si: 1, gi: 0 })
  })

  it('손잡이는 선택된 구간에만 있다', () => {
    const { sh } = mid(1)
    const k = knobs(sh)
    expect(at(k.knob0.x, k.knob0.y)).toEqual({ role: 'clip', si: 1, gi: 0 })
    const sel = { type: 'clip', si: 1, gi: 0 }
    expect(at(k.knob0.x, k.knob0.y, sel)).toEqual({ role: 'knob0', si: 1, gi: 0 })
    expect(at(k.knob1!.x, k.knob1!.y, sel)).toEqual({ role: 'knob1', si: 1, gi: 0 })
  })

  it('위쪽 띠는 묶음, 끝 뒤는 그리기 영역, 눈금자는 빈 곳', () => {
    expect(at(150, LANE / 2)).toEqual({ role: 'sec', si: 1, gi: -1 })
    expect(at(L.total * 10 + 30, TOP + 50)).toEqual({ role: 'draw', si: -1, gi: -1 })
    expect(at(50, LANE + 5)).toBeNull()
  })
})
