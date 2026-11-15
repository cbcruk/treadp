@AGENTS.md

## 작업 방식

- 새 작업은 계획(목표, 바꿀 파일, 검증 방법)을 GitHub 이슈로 먼저 올린다.
- 브랜치에서 작업하고, `pnpm verify`를 통과한 뒤 본문에 `Closes #N`을 넣은 PR을 연다. main에 직접 커밋하지 않는다.
- PR을 열면 Claude가 한 번 리뷰한다(`.github/workflows/claude-code-review.yml`). 고친 뒤 다시 보려면 PR에 `@claude`로 요청한다.

## PR 리뷰

리뷰는 연결된 이슈가 요구한 것과 AGENTS.md를 기준으로 봅니다. 지적마다 **막음** 또는 **후속**을 붙입니다.

- **막음:** 버그, 편집·undo·저장 상태가 어긋나는 문제, 기존 데이터와의 계약(출력 형식, `treadp:*` localStorage 키, `HUES` 색 인덱스, `tests/fixtures/legacy.json`)을 깨는 변경, AGENTS.md 규칙과 어긋나는 코드, 동작을 바꾸고 테스트를 고치지 않은 것, 이슈가 요구했는데 빠진 것
- **후속:** 그 밖의 개선. 이 PR에서 고치지 않고 이슈로 남겨도 되는 것
