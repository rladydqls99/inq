# CarPlay 덱 제어 및 챌린지 카드 분리 메타프롬프트

## 확인된 현재 구조

- `ChallengeCardState.cardId`가 덱의 `Card.id`를 직접 참조한다.
- `ChallengeAnswerEvent`도 덱 카드를 참조한다.
- `ChallengeRunSession.queue`에는 덱 `cardId`가 저장된다.
- 챌린지 실행 시 덱의 `Card`에서 카드 내용을 다시 조회한다.
- 따라서 덱 카드 수정·삭제가 챌린지 내용, 상태, 정답 이력과 실행 큐에 영향을 줄 수 있다.
- `Challenge.deckId`가 필수 외래 키이며 `onDelete: Cascade`이므로 덱을 삭제하면 챌린지도 함께 삭제된다.

## 구현용 메타프롬프트

```text
/Users/kim-yongbin/Desktop/projects/inq 저장소에서 다음 두 작업을 완성하라.

1. iPhone PWA + CarPlay 차량 제어로 덱 카드 이전/다음 이동
2. 덱 카드와 챌린지 카드를 데이터 수준에서 완전히 분리

중요한 작업 원칙

- 구현 전에 현재 파일과 git status, 기존 diff를 다시 읽어라.
- 작업 트리에 사용자가 진행 중인 변경이 있다면 reset, checkout, 덮어쓰기 하지 말고 현재 변경 위에서 작업하라.
- 기존 MediaSessionController를 버리고 중복 구현하지 말고 확장하라.
- 차량 제어는 덱 학습에만 적용한다. ChallengeRunnerPage에는 절대 연결하지 않는다.
- 덱과 챌린지의 데이터는 분리하되 QuizTextRenderer, CardPlayer 같은 순수 표시 컴포넌트는 재사용해도 된다. UI 코드를 의미 없이 복제하지 마라.
- 요청하지 않은 디자인 개편이나 인증·배포 변경은 하지 마라.
- 실차 CarPlay 동작을 개발 환경에서 검증했다고 주장하지 마라. 자동 테스트 후 최종 실차 테스트는 사용자가 수행한다.
- 사용자가 별도로 요청하지 않는 한 커밋하거나 푸시하지 마라.

현재 확인된 구조

- Prisma의 ChallengeCardState.cardId가 덱의 Card.id를 직접 참조한다.
- ChallengeAnswerEvent 역시 덱 Card를 참조한다.
- ChallengeRunSession.queue에도 덱 cardId가 들어간다.
- 챌린지 실행 시 prisma.card에서 덱 카드 내용을 다시 조회한다.
- 따라서 덱 카드 수정 내용이 챌린지에 즉시 반영되고, 덱 카드 삭제 시 챌린지 상태·정답 이력·실행 큐가 영향을 받는다.
- Challenge.deckId도 필수 FK이며 onDelete: Cascade라서 덱 삭제 시 챌린지가 삭제된다.
- apps/web/src/features/runners/MediaSessionController.ts에는 nexttrack, previoustrack 핸들러의 기초 구현이 이미 있다.
- DeckRunnerPage에는 해당 핸들러 연결 코드가 있으나 무음 오디오, 설정, 상태 표시, 메타데이터, 중복 요청 방지가 없다.

작업 A: CarPlay 차량 제어

대상 환경

- 기준 기기: iPhone 13 mini
- 실행 형태: 홈 화면에 설치한 PWA
- 연결 방식: CarPlay
- PWA의 덱 학습 화면이 실제로 보이는 동안만 동작
- 백그라운드, 다른 앱 사용 중, 잠금 화면 지원은 범위 밖
- 학습 중 다른 음악이나 팟캐스트를 함께 재생하지 않음

설정 요구사항

- 설정 화면에 `차량 제어` 토글을 추가한다.
- 최초 기본값은 켜짐이다.
- 사용자가 끄거나 켠 값은 해당 기기에 localStorage 등으로 영속 저장한다.
- 설정이 꺼져 있으면 오디오 재생, Media Session 등록, 핸들러 등록을 전혀 하지 않는다.
- 설정이 켜져 있고 덱 학습을 시작하면 차량 제어를 자동으로 준비한다.
- 덱 학습 화면을 나가거나 document가 hidden 상태가 되면 무음 오디오와 핸들러를 정리한다.
- 다시 visible 상태가 되었을 때 자동 복구를 시도하되 브라우저가 재생을 차단하면 실패 상태를 표시한다.

무음 오디오와 사용자 활성화

- CarPlay 미디어 버튼을 받을 수 있도록 실제 HTMLMediaElement 기반의 매우 작은 로컬 무음 오디오를 반복 재생한다.
- 외부 URL에 의존하지 않는다.
- 오디오 볼륨은 들리지 않게 하되 iOS가 미디어 세션으로 인정할 수 있는 구조여야 한다.
- iOS의 autoplay/user activation 제한을 고려한다.
- 가능하면 사용자의 `학습 시작` 클릭 흐름에서 무음 오디오 재생을 시작하거나 준비하여 사용자 활성화를 보존한다.
- 현재 DeckDetailPage의 학습 시작은 API 요청을 await한 뒤 이동하므로, 사용자 활성화가 사라질 가능성을 고려하여 컨트롤러 생명주기를 설계한다.
- 직접 URL 진입이나 자동 재생 차단으로 시작하지 못하면 화면에 실패 상태와 재시도 수단을 제공한다.
- 설정이 기본 켜짐이더라도 앱 전체에서 항상 오디오를 재생하면 안 된다. 덱 학습 중에만 재생한다.

Media Session 동작

- `nexttrack`: 즉시 다음 덱 카드로 이동한다.
- `previoustrack`: 즉시 이전 덱 카드로 이동한다.
- 챌린지에는 적용하지 않는다.
- 덱 카드는 정답이 처음부터 표시되므로 정답 공개 단계는 없다.
- 첫 번째 카드에서 이전을 누르면 아무 API 요청도 보내지 않고 아무 동작도 하지 않는다.
- 마지막 카드에서 다음을 누르면 학습을 완료하고 기존 동작대로 덱 목록으로 이동한다.
- 카드 이동 PATCH 요청 중에는 화면 버튼과 차량 버튼의 추가 이동 입력을 모두 무시한다.
- 이전 요청이 끝난 뒤에만 새로운 입력을 허용한다.
- 이동 실패 시 현재 카드와 현재 cursor를 그대로 유지하고 기존 오류 UI 또는 명확한 오류 메시지를 표시한다.
- 실패한 이동을 임의로 낙관적 반영하거나 자동 재시도하지 않는다.
- `play`와 `pause` 버튼은 아무 기능도 수행하지 않도록 명시적인 no-op 핸들러로 처리한다. 이 버튼 때문에 카드가 이동하거나 차량 제어가 중단되면 안 된다.
- route 이탈, 설정 끄기, visibility hidden, component unmount 시 모든 action handler와 오디오 리소스를 정리한다.
- stale closure 때문에 이전 cursor로 이동하지 않도록 ref 또는 안정적인 callback 구조를 사용한다.

CarPlay 메타데이터

- MediaMetadata에 덱 이름과 진행도만 표시한다.
- 예: title=`영어 단어`, artist=`3 / 20`, album=`inq`
- 카드 본문이나 정답은 CarPlay 메타데이터에 노출하지 않는다.
- 카드가 이동할 때마다 진행도를 갱신한다.
- DeckRunResponse에 덱 이름이 없다면 API 응답에 deckTitle을 명시적으로 추가하고 shared type과 API 테스트를 함께 수정한다. 별도 전체 덱 목록 요청으로 우회하지 않는 것을 우선 검토한다.

상태 UI

- 덱 학습 화면에 차량 제어 상태를 표시한다.
- 최소 상태:
  - 준비 중
  - 차량 제어 준비됨
  - 설정에서 꺼짐
  - 브라우저 미지원
  - 무음 오디오 재생 차단 또는 연결 준비 실패
- 브라우저는 실제 CarPlay 연결 여부를 확정적으로 알 수 없으므로 단순히 Media Session 등록에 성공했다는 이유로 `CarPlay 연결됨`이라고 거짓 표시하지 않는다. `차량 제어 준비됨`처럼 정확한 문구를 사용한다.
- 실패 상태에는 사용자가 직접 재시도할 수 있는 버튼을 제공한다.
- 상태 변경과 오류는 aria-live로 접근 가능하게 만든다.

작업 B: 덱 카드와 챌린지 카드 완전 분리

완전 분리의 정의

- 챌린지를 생성하는 순간 덱 카드 내용을 챌린지 전용 카드로 복사한다.
- 이후 덱 카드의 수정 또는 삭제가 기존 챌린지 카드의 segments, 진도, 정답 이력, 실행 큐에 어떤 영향도 주면 안 된다.
- 덱 자체를 삭제해도 이미 만들어진 챌린지와 챌린지 카드, 진도, 정답 이력은 유지되어야 한다.
- 챌린지 실행 코드는 더 이상 prisma.card 또는 덱 Card.id를 사용해 카드 내용을 조회하면 안 된다.
- ChallengeCardState, ChallengeAnswerEvent, ChallengeRunSession.queue가 덱 Card를 참조하면 안 된다.
- 단순히 실행 큐에 segments를 임시 복사하는 수준이 아니라 챌린지 전용 카드가 독립된 영속 데이터의 source of truth가 되어야 한다.

권장 목표 모델

- Deck → Card
- Challenge → ChallengeCard → ChallengeCardState
- ChallengeAnswerEvent → ChallengeCard 또는 ChallengeCardState
- ChallengeRunSession.queue → challengeCardId/stateId
- Challenge와 ChallengeCard는 원본 추적을 위한 nullable sourceDeckId/sourceDeckCardId를 보유할 수 있지만 콘텐츠 FK로 사용하면 안 된다.
- 원본 덱이나 카드가 삭제될 때 source 참조는 SetNull 처리하고 챌린지 데이터는 유지한다.
- Challenge에는 원본 덱 제목의 snapshot을 저장하여 원본 덱 삭제 후에도 화면과 백업에서 기존 제목을 표시할 수 있게 한다.
- 동등한 구조를 선택할 수 있지만 덱 Card와의 콘텐츠·수명주기 결합이 완전히 제거되어야 한다.

챌린지 생성 및 갱신

- 챌린지 생성 트랜잭션에서 현재 덱의 모든 카드 segments를 ChallengeCard로 복사하고 각각의 ChallengeCardState를 만든다.
- 빈 덱 처리와 challenge status 동작은 기존 규칙을 보존한다.
- `덱에서 카드 갱신`은 자동 동기화가 아니라 명시적인 가져오기 작업으로 유지한다.
- 기존 챌린지 카드의 내용과 진도는 덮어쓰지 않는다.
- sourceDeckCardId를 기준으로 아직 가져오지 않은 새 덱 카드만 복사한다.
- 기존 API의 addedCount 의미와 UI 메시지를 유지한다.
- 원본 덱이 삭제된 챌린지에서는 갱신을 비활성화하거나 명확한 오류를 제공한다.
- 덱 카드 수정이 기존 챌린지 카드에 자동 반영되어서는 안 된다.

마이그레이션

- 새로운 Prisma migration을 작성한다. 기존 init migration을 수정하지 않는다.
- 기존 사용자 데이터를 절대 폐기하지 않는다.
- 기존 ChallengeCardState마다 현재 연결된 Card.segments를 복사한 ChallengeCard를 생성한다.
- 기존 stage, dueAt, result, completedAt, view count, timestamps를 보존한다.
- ChallengeAnswerEvent 전체를 보존하고 덱 cardId 의존성을 제거한다.
- 진행 중인 ChallengeRunSession.queue도 보존한다.
- 기존 queue에는 cardId와 stateId가 있으므로 stateId를 기준으로 새 challengeCardId를 찾아 변환한다.
- SQLite JSON 마이그레이션이 안전하지 않다면 일시적인 legacy queue 파서와 단발성 정규화 로직을 사용하되, 최종 저장 형식은 challengeCardId 기반이어야 한다.
- 마이그레이션 후 덱 카드 삭제 때문에 active queue가 비워지는 기존 보정 로직은 제거하거나 챌린지 전용 카드 기준으로 다시 작성한다.
- 실제 기존 형태의 DB fixture를 준비하여 마이그레이션 전후 데이터 보존 테스트를 작성한다.

API와 공유 타입

다음을 새 구조에 맞춰 일관되게 변경한다.

- packages/shared/src/types.ts
- ChallengeCardResponse
- ChallengeRunCard
- ChallengeCardStateExport
- ChallengeAnswerEventExport
- ChallengeRunSessionExport
- BackupExport
- challenge 관련 repository, route, service
- challenge detail/run frontend가 사용하는 식별자

`cardId`라는 모호한 이름을 계속 사용하지 말고 의미에 따라 `deckCardId` 또는 `challengeCardId`로 구분한다.

백업

- 백업에 challengeCards를 독립 컬렉션으로 포함한다.
- 챌린지 실행 큐의 segments를 덱 cardMap에서 조회하지 않는다.
- 챌린지 카드와 실행 큐는 challengeCard 데이터를 사용한다.
- 가능하면 backup schemaVersion을 추가하여 변경된 형식을 식별한다.
- 원본 덱 또는 덱 카드가 삭제된 뒤에도 챌린지 카드, 상태, 이벤트, 실행 큐가 정상적으로 내보내지는 테스트를 추가한다.
- PIN hash 등 기존 비밀정보 제외 조건을 보존한다.

필수 회귀 테스트

차량 제어:

- 설정값이 없으면 차량 제어가 기본 켜짐이다.
- 설정을 끄면 값이 저장되고 Media Session 및 오디오가 시작되지 않는다.
- nexttrack이 다음 카드 PATCH를 정확히 한 번 호출한다.
- previoustrack이 이전 카드 PATCH를 정확히 한 번 호출한다.
- 첫 카드의 previoustrack은 PATCH를 호출하지 않는다.
- 마지막 카드의 nexttrack은 완료 cursor를 저장하고 덱 목록으로 이동한다.
- 요청 중 연속 next/previous 입력은 무시된다.
- 실패 시 현재 카드가 유지되고 오류가 표시된다.
- metadata가 덱 이름과 진행도로 갱신된다.
- play/pause가 카드 상태에 영향을 주지 않는다.
- unmount, hidden, 설정 끄기 시 핸들러와 오디오가 정리된다.
- ChallengeRunnerPage에서는 Media Session을 등록하지 않는다.
- 자동 재생 실패 및 Media Session 미지원 상태를 테스트한다.

카드 분리:

- 챌린지 생성 시 덱 카드가 ChallengeCard로 복사된다.
- 덱 카드 수정 후에도 챌린지 segments가 바뀌지 않는다.
- 덱 카드 삭제 후에도 챌린지 상세와 실행이 정상 동작한다.
- 덱 삭제 후에도 챌린지와 카드, 진도, 이벤트가 유지된다.
- 덱 삭제 후 `덱에서 카드 갱신`은 안전하게 실패하거나 비활성화된다.
- 갱신은 새 카드만 추가하고 기존 챌린지 카드와 진도를 덮어쓰지 않는다.
- 챌린지 결과 제출은 challengeCardId를 사용한다.
- 틀린 카드 뒤로 보내기, 단계 전환, 자동 완료 등 기존 챌린지 알고리즘이 그대로 동작한다.
- 기존 active session과 answer event가 마이그레이션 후 유지된다.
- 덱 카드 삭제가 challenge answer event를 삭제하지 않는다.
- 챌린지를 삭제하면 해당 ChallengeCard, state, event, run session만 정상적으로 cascade 삭제된다.
- 백업이 덱 카드 없이도 독립된 챌린지 데이터를 완전하게 내보낸다.

검증 명령

최소한 다음을 실행하고 결과를 보고하라.

- pnpm db:generate
- pnpm --filter @inq/db test
- pnpm --filter @inq/api test
- pnpm --filter @inq/web test
- pnpm typecheck
- pnpm build
- git diff --check

테스트 실패가 기존 문제인지 새 변경 때문인지 실제 diff와 재현 결과로 구분하라. Vitest worker 시작 실패가 발생하면 무작정 재실행만 반복하지 말고 관련 테스트를 좁혀 검증하라.

완료 보고 형식

- 구현 결과를 먼저 요약한다.
- 생성한 migration과 데이터 보존 방식을 설명한다.
- 덱과 챌린지의 새 데이터 관계를 짧게 설명한다.
- 실행한 테스트와 결과를 정확히 적는다.
- 자동 검증하지 못한 항목을 숨기지 않는다.
- `iPhone 13 mini + 실제 CarPlay에서 다음, 이전, 빠른 연속 입력 테스트가 필요함`을 명시한다.
- 기존 사용자 변경과 충돌시키지 않았는지 git diff 범위를 확인한다.
```
