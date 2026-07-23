# 웹 프론트엔드 리팩토링 목표 프롬프트

```text
/Users/kim-yongbin/Desktop/projects/inq에서 웹 프론트엔드를 FSD 기반으로 리팩토링하라.

시작 전

- 현재 파일, 의존성, 테스트, git status와 기존 diff를 읽는다.
- 작업 트리가 더러우면 reset, checkout, 덮어쓰기를 하지 않는다.
- 현재 동작, 라우트, 접근성, PWA 동작을 바꾸지 않는다.
- 요청하지 않은 디자인 변경, API 계약 변경, 백엔드 변경, 의존성 추가를 하지 않는다. 단 React Query, ESLint, Prettier, Husky 및 이를 연결하는 최소 의존성은 허용한다.

목표

1. FSD 레이어를 `app / pages / widgets / features / entities / shared`로 정리한다.
   - 실제 코드가 없는 빈 레이어나 추상화는 만들지 않는다.
   - `app`은 Provider, 라우터, 전역 스타일 등 앱 초기화만 담당한다.
   - `pages`는 라우트별 화면과 페이지 전용 로직을 담당한다.
   - `widgets`는 여러 도메인의 UI를 조합할 때만 사용한다.
   - `features`는 재사용할 가치가 있는 사용자 행위에만 사용한다. 페이지에서만 쓰는 구현은 pages에 둔다.
   - `entities`는 도메인 타입, API 함수, query key와 서버 상태 훅을 둔다.
   - `shared`에는 도메인을 몰라도 되는 UI, 유틸, API 기반 코드만 둔다.

2. 도메인은 `decks`, `challenges`, `upload`, `auth`, `settings`로 고정한다.
   - 도메인 간 직접 import를 금지한다.
   - 도메인을 모르는 순수 컴포넌트만 shared로 옮긴다.
   - 여러 도메인 조합이 필요하면 widgets에서 구성한다. 도메인 내부 구현을 공유하지 않는다.
   - 기존 `runners`는 독립 도메인이 아니다. deck 실행은 decks에, challenge 실행은 challenges에 흡수한다.

3. 모든 서버 상태를 React Query로 이전한다.
   - `fetch + useEffect + useState`로 목록·상세·인증 상태를 읽는 구조를 query로 바꾼다.
   - 생성·수정·삭제·실행 이동 등 서버 변경은 mutation으로 처리한다.
   - 기본 `staleTime`은 30초로 둔다.
   - mutation 성공 뒤 영향을 받은 도메인의 query key만 무효화한다.
   - auth/status도 query로, 잠금·해제는 mutation으로 관리한다.
   - 폼 입력값, 모달 열림, 선택 상태, 타이머처럼 서버 상태가 아닌 값은 필요한 곳에 local state로 유지한다.
   - 서버 응답을 복사해 둔 상태, 이를 동기화하기 위한 useEffect, derived state는 제거한다.

4. 품질 규칙을 자동 강제한다.
   - ESLint는 FSD import 경계, 도메인 간 직접 import 금지, React Hooks, React Query 규칙을 error로 처리한다.
   - Prettier를 단일 포맷 기준으로 사용한다.
   - Husky pre-commit에서 staged 파일의 Prettier 및 ESLint와 `@inq/web` typecheck를 실행한다.
   - 테스트 전체 실행은 pre-commit에 넣지 않는다.

작업 순서

1. 공통 기반: QueryClient Provider, 경로 별칭/ESLint/Prettier/Husky를 최소 구성으로 추가한다.
2. auth를 이전한다.
3. decks와 deck runner를 함께 이전한다.
4. challenges와 challenge runner를 함께 이전한다.
5. upload를 이전한다.
6. settings를 이전한다.

검증

- 각 단계 뒤 불필요한 state와 useEffect가 남지 않았는지 확인한다.
- `pnpm --filter @inq/web typecheck`, 관련 테스트, `pnpm --filter @inq/web build`, `git diff --check`를 실행한다.
- lint, format check, Husky 훅을 실제로 실행해 커밋 차단 규칙을 확인한다.
- 최종 보고에는 변경 파일, 검증 결과, 남은 제약만 짧게 적는다.
```
