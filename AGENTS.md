# AGENTS.md

Project-specific guidance for AI coding agents.

## treadp

트레드밀 구간을 피아노롤(캔버스)로 입력하고 Claude에 붙여넣을 텍스트로 내보내는 개인용 웹앱. 데이터는 브라우저 localStorage에만 있다.

### Commands

- 패키지 매니저는 pnpm만 쓴다. `npm install`은 `vite` override 때문에 실패한다.
- `pnpm verify`: 완료를 보고하기 전에 반드시 실행하고 결과를 보여준다. 실패하면 테스트가 아니라 코드를 고친다.
- 개별 실행: `pnpm check`(fmt + lint), `pnpm exec tsc -b`, `pnpm test`(Vitest), `pnpm e2e`(Playwright), `pnpm fmt`(자동 수정).

### Conventions

- 출력 텍스트 형식, localStorage 키(`treadp:*`), 저장된 색 인덱스(`HUES` 순서)는 기존 데이터와의 계약이다. 바꾸지 않는다.
- `tests/fixtures/legacy.json`은 레거시 코드가 만든 출력 계약이고 다시 생성할 수 없다. 편집하지 않는다.
- `@astryxdesign/*`와 `lucide-react`는 `src/ui/`에서만 import한다(lint가 강제). 기능 코드는 `src/ui` 재export를 쓴다.
- 상태는 XState(`src/state/`), 단축키는 TanStack Hotkeys(`src/features/hotkeys/appHotkeys.ts`), 스타일은 StyleX + `src/ui/tokens.stylex.ts`.
- `useEffect`/`useLayoutEffect`를 쓰지 않는다. ref 콜백, 이벤트 핸들러, 렌더 중 계산으로 처리한다.
- 주석은 "왜"만 남긴다. 코드를 다시 설명하는 주석은 쓰지 않는다.

### Architecture

- `src/domain/`: 순수 로직(형식, 파싱, 계산, 저장). `src/state/`: 편집 머신과 undo 기록.
- `src/features/piano-roll/`: `geometry.ts`(순수 좌표·히트 테스트, e2e도 같이 씀), `draw.ts`(캔버스 그리기), `PianoRoll.tsx`(포인터·스크롤).
- `src/ui/`: Astryx 래퍼와 공용 컴포넌트. `src/astryx-themes.ts`는 생성 파일이라 편집하지 않는다.

### Things Claude gets wrong

- Astryx `Toolbar`를 쓰지 않는다. 버튼 사이를 화살표로 옮겨 다니는 동작이 페이지의 화살표 단축키를 가로챈다.
- Astryx Dialog는 Escape keydown 중에 닫히므로, 닫기 콜백은 `setTimeout`으로 미룬다. 안 그러면 페이지 Escape(선택 해제)가 같이 실행된다.
- 캔버스는 `var(--x)`/`light-dark()`를 못 읽는다. 색은 `readTheme`의 probe로 계산하고, 테마·모드가 바뀌면 dispose한다.
- 피아노롤은 캔버스라 DOM 요소로 찾을 수 없다. e2e는 `geometry.ts`로 좌표를 계산한다.
- 출력 블록의 텍스트는 `innerText`로 읽고 U+200B를 지운다(`textContent`에는 줄바꿈이 없다).

<!-- ASTRYX:START -->

Astryx v0.7.16 · 174 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:

1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
   Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
   Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:

- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then the xstyle prop / StyleX tokens. No raw hex/px.
- THEMES: palettes and custom colors go through the theme, never :root overrides. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` and open the PNGs it writes (changes nothing in the app); a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any className=, style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or the xstyle prop + a token.

`astryx help` lists every command. Key ones beyond the workflow:
search "<query>" find any component / hook / doc / template
discover <words> integrations you could add
docs <topic> getting-started, principles, tokens, theme … (`astryx docs` lists all)
docs cli commands and API reference
docs authoring build an integration package, and every field it holds
upgrade --from <old version> --apply run after a dependency bump
<!-- ASTRYX:END -->
