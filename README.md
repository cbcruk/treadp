# treadp

트레드밀 구간을 피아노롤로 입력하고 Claude에 붙여넣을 텍스트로 내보내는 앱.

```sh
pnpm install
pnpm dev     # 개발 서버 (vp dev)
pnpm check   # 포맷 + lint + 타입 검사 (vp check)
pnpm fmt     # oxfmt: 작은따옴표, 세미콜론 없음 (설정은 vite.config.ts의 fmt)
pnpm lint    # oxlint (@astryxdesign/*는 src/ui/에서만 import 가능)
pnpm test    # Vitest (domain/state 계약 테스트)
pnpm e2e     # Playwright 스모크 (최초 1회: pnpm exec playwright install chromium --only-shell)
pnpm build
```

패키지 매니저는 pnpm입니다. `vite` override 때문에 `npm install`은 실패합니다.

툴체인은 [Vite+](https://viteplus.dev)(`vite-plus`)입니다. fmt/lint/test 설정은 모두 `vite.config.ts`에 있습니다.

- `tests/fixtures/legacy.json`: 레거시 코드가 만든 출력 계약. 새 구현은 이 출력과 같아야 한다.
