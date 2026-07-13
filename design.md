---
name: inq
description: 직접 만든 문제로 매일 가볍게 돌아오는 개인 시험 복습 앱
colors:
  highlight-lime: "#CAFF19"
  highlight-lime-strong: "#9ED800"
  highlight-ink: "#0D160F"
  ink-soft: "#3D463F"
  canvas: "#FCFCFC"
  surface: "#F4F7F3"
  line: "#D4DAD3"
  success: "#2E6F3E"
  error: "#B42318"
  warning: "#8A5D00"
  dark-canvas: "#101511"
  dark-surface: "#1A211C"
  dark-ink: "#F7F9F7"
  dark-line: "#3A453D"
typography:
  brand-display:
    fontFamily: "Gasoek One, Noto Sans KR, sans-serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 750
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.highlight-ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
    height: "48px"
  button-primary-active:
    backgroundColor: "{colors.highlight-lime}"
    textColor: "{colors.highlight-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.highlight-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
    height: "48px"
  input-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.highlight-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "48px"
  quiz-answer-revealed:
    backgroundColor: "{colors.highlight-lime}"
    textColor: "{colors.highlight-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: "2px 4px"
---

# Design System: inq

## 1. Overview

**Creative North Star: "형광펜으로 표시한 정답"**

inq는 흰 문제지 위에 검은 잉크로 문제를 풀고, 꼭 기억해야 할 답에만 형광펜을 긋는 경험이다. 시험을 준비하는 사용자가 이동 중 한 손으로 앱을 열었을 때, 통계나 관리 도구보다 지금 풀 한 문제가 먼저 보여야 한다. 화면은 밝고 평평하며 여백이 충분하고, 라임은 학습의 핵심 순간에만 나타난다.

제품의 성격은 선명하고, 영리하며, 활기차다. 그러나 시각적 에너지가 학습 흐름을 앞질러서는 안 된다. **카드와 통계가 빽빽한 전형적인 학습 대시보드**를 명시적으로 거부하고, 한 화면에 하나의 주된 행동과 명확한 정보 계층을 둔다.

현재 PWA와 최종 React Native 앱은 같은 브랜드 토큰을 공유한다. `/upload`는 넓은 데스크톱 편집 작업에 최적화하고, 나머지 모든 경로는 모바일 우선이다. iOS에서는 HIG의 구조와 제스처를, Android에서는 Material 3의 구조와 동작을 따른다. 브랜드는 색과 콘텐츠, 학습 피드백에서 드러나며 플랫폼의 익숙한 조작 방식을 덮어쓰지 않는다.

**Key Characteristics:**

- 밝은 캔버스와 단단한 잉크 대비
- 정답 공개, 현재 선택, 진행 상태에만 나타나는 형광 라임
- 대시보드보다 오늘의 한 문제를 앞세우는 모바일 구조
- 평평한 표면과 명확한 구분선, 최소한의 그림자
- iOS와 Android의 내비게이션·모달·뒤로가기 관습을 존중하는 적응형 컴포넌트

**The One Question Rule.** 학습 화면의 첫 시선은 항상 현재 문제 또는 오늘의 복습 시작 행동에 머물러야 한다.

**The Adaptive Brand Rule.** 색과 콘텐츠는 공통으로 유지하되, iOS와 Android의 시스템 내비게이션과 제스처를 커스텀 브랜드 표현으로 대체하지 않는다.

## 2. Colors

이 팔레트는 흰 문제지, 검은 잉크, 형광펜 한 획으로 구성된다. 색은 장식이 아니라 행동과 학습 상태를 전달한다.

### Primary

- **형광 정답** (`highlight-lime`): 정답 공개, 선택된 상태, 진행 표시, 완료 직후의 긍정 피드백에 사용한다. 넓은 배경이나 비활성 요소에는 사용하지 않는다.
- **눌린 형광** (`highlight-lime-strong`): 라임 버튼의 눌림 상태와 밝은 배경 위 링크·작은 상태 텍스트처럼 더 높은 대비가 필요한 곳에 사용한다.
- **시험지 잉크** (`highlight-ink`): 제목, 본문 핵심 정보, 기본 아이콘, 가장 중요한 버튼 배경에 사용한다.

### Secondary

- **정답 초록** (`success`): 맞음 상태에만 사용하고 반드시 체크 아이콘 또는 텍스트를 함께 제공한다.
- **오답 빨강** (`error`): 틀림, 입력 오류, 파괴적 행동에만 사용하고 반드시 아이콘 또는 설명을 함께 제공한다.
- **주의 황토** (`warning`): 데이터 손실 가능성이나 사용자의 확인이 필요한 상태에만 사용한다.

### Neutral

- **깨끗한 문제지** (`canvas`): 라이트 모드의 기본 배경과 주요 콘텐츠 표면이다.
- **연한 메모지** (`surface`): 필드, 선택되지 않은 컨트롤, 구분이 필요한 보조 영역에 사용한다.
- **부드러운 잉크** (`ink-soft`): 부가 설명과 메타데이터에 사용한다. 작은 텍스트에서는 WCAG 2.2 AA 대비를 반드시 확인한다.
- **연필선** (`line`): 리스트 구분선, 필드 외곽선, 진행 트랙에 사용한다.
- **야간 문제지** (`dark-canvas`)와 **야간 표면** (`dark-surface`): 다크 모드의 기본 배경과 표면이다.
- **야간 잉크** (`dark-ink`)와 **야간 연필선** (`dark-line`): 다크 모드의 본문과 구분선이다.

**The Highlighter Budget Rule.** 한 화면에서 라임이 차지하는 면적은 대략 15%를 넘지 않는다. 라임이 흔해지는 순간 정답의 의미가 사라진다.

**The Semantic State Rule.** 성공, 오류, 경고는 색상만으로 전달하지 않는다. 아이콘, 레이블, 위치 중 하나 이상을 반드시 함께 사용한다.

**The Platform Color Rule.** React Native에서는 위 브랜드 색을 iOS semantic color와 Material 3 color role로 매핑해 라이트·다크·고대비 테마를 제공한다. Android Dynamic Color를 사용할 때도 `highlight-lime`은 학습 피드백의 고유 브랜드 색으로 유지한다.

## 3. Typography

**Display Font:** Gasoek One (Noto Sans KR fallback)

**Body Font:** iOS SF Pro / Android Roboto / Web system-ui

**Character:** 제품 UI는 각 플랫폼의 시스템 산세리프로 빠르고 자연스럽게 읽힌다. Gasoek One은 로고, 온보딩의 한 문장, 학습 완료처럼 브랜드가 기억되어야 하는 짧은 순간에만 등장한다.

### Hierarchy

- **Brand Display** (400, 40px web baseline, 1.1): 온보딩, 빈 상태, 중요한 완료 장면에서 최대 두 줄까지만 사용한다. 버튼, 탭, 폼 레이블에는 금지한다.
- **Headline** (800, 28px web baseline, 1.25): 최상위 화면 제목과 학습 완료 메시지에 사용한다.
- **Title** (750, 20px web baseline, 1.35): 문제 제목, 섹션 제목, 주요 리스트 항목에 사용한다.
- **Body** (500, 16px web baseline, 1.6): 문제 본문과 설명에 사용하며 긴 문장은 65ch를 넘기지 않는다.
- **Label** (700, 14px web baseline, 1.4): 버튼, 탭, 필드 레이블, 상태 텍스트에 사용한다. 문장형 대소문자를 유지하고 장식적인 자간을 추가하지 않는다.

iOS에서는 Large Title, Title, Headline, Body, Callout, Caption의 Dynamic Type 스타일로 매핑한다. Android에서는 Material 3의 Headline, Title, Body, Label 역할과 `sp` 단위를 사용한다. 시스템 글자 크기가 커지면 고정 높이를 풀고 콘텐츠가 세로로 확장되어야 한다.

**The System Voice Rule.** 학습 중인 화면에서는 시스템 글꼴만 사용한다. 브랜드 표시 글꼴이 문제보다 먼저 보이면 잘못된 화면이다.

**The No Tiny Data Rule.** 핵심 학습 정보는 Caption 크기로 내려가지 않는다. 12px/11pt 수준은 보조 시간, 순서, 메타데이터에만 허용한다.

## 4. Elevation

inq는 평평한 표면과 색조 차이로 깊이를 만든다. 기본 카드, 리스트, 버튼에는 그림자를 사용하지 않는다. 깊이는 배경 표면 변화, 1px 구분선, 모달의 시스템 재질로 전달한다. 웹의 포인터 호버에서는 최대 8px 블러의 짧은 그림자만 허용하며, 모바일의 휴지 상태에는 적용하지 않는다.

iOS의 시트와 바는 시스템 material을 사용하고, Android는 Material 3의 tonal elevation을 사용한다. 브랜드를 위해 별도의 유리 효과나 과장된 드롭 섀도를 만들지 않는다.

### Shadow Vocabulary

- **Web Hover Lift** (`0 2px 8px rgb(13 22 15 / 12%)`): `/upload`의 드래그 대상이나 포인터로 조작하는 요소가 호버될 때만 사용한다.
- **System Modal Elevation**: iOS sheet와 Android modal bottom sheet가 제공하는 시스템 elevation을 그대로 사용한다.

**The Flat by Default Rule.** 표면은 휴지 상태에서 평평하다. 그림자는 상호작용 중이거나 시스템 모달 계층을 나타낼 때만 등장한다.

## 5. Components

컴포넌트는 촉감이 분명하고 자신감 있게 반응하되, 익숙한 모바일 조작 방식을 재발명하지 않는다. 모든 상호작용 요소는 기본, 눌림, 포커스, 비활성, 로딩, 오류 상태를 갖는다.

### Buttons

- **Shape:** 단단하게 살짝 굽은 모서리(8px). 퀴즈의 주요 버튼은 사용 가능한 너비를 채울 수 있지만, 텍스트 버튼을 불필요하게 큰 알약 모양으로 만들지 않는다.
- **Primary:** `highlight-ink` 배경과 `canvas` 텍스트, 최소 높이 48px, 좌우 여백 18px. 한 화면에 하나만 주된 행동으로 지정한다.
- **Pressed / Focus:** 눌림은 짧은 색조 변화와 0.98 스케일로 전달한다. 키보드 포커스는 3px 고대비 링을 사용하고, 네이티브에서는 플랫폼 기본 포커스 및 접근성 강조를 유지한다.
- **Secondary:** `surface` 배경과 `highlight-ink` 텍스트를 사용한다. 위험 행동은 `error` 레이블을 사용하되 화면을 빨갛게 채우지 않는다.
- **Loading / Disabled:** 로딩 중 레이블 폭을 유지하고 진행 상태를 함께 읽어준다. 비활성은 투명도만 낮추지 말고 배경과 텍스트 색을 모두 비활성 역할로 바꾼다.

### Chips

- **Style:** 필터나 실제 선택 집합에만 사용한다. 기본은 `surface`, 선택은 `highlight-lime`, 텍스트는 항상 `highlight-ink`다.
- **State:** 선택 여부를 체크 아이콘과 색으로 함께 표시한다. 통계나 설명을 장식적으로 칩 안에 나열하지 않는다.

### Cards / Containers

- **Corner Style:** 일반 표면은 8px, 독립적인 퀴즈 프리뷰와 모달 내부 그룹은 최대 12px다.
- **Background:** 기본 콘텐츠는 `canvas`, 보조 그룹은 `surface`를 사용한다.
- **Shadow Strategy:** 기본 그림자 없음. 구분이 필요하면 `line` 1px 또는 표면 색 차이 중 하나를 사용한다.
- **Internal Padding:** 모바일 16px, 밀도 높은 리스트 행 12–16px, 데스크톱 업로드 패널 20–24px.
- **Use:** 퀴즈 한 장, 업로드 미리보기처럼 실제 경계가 있는 객체에만 사용한다. 홈 섹션과 설정 행을 모두 카드로 감싸지 않는다.

### Inputs / Fields

- **Style:** 최소 높이 48px, 8px 모서리, `canvas` 배경과 `line` 1px 외곽선을 사용한다. 플레이스홀더도 AA 대비를 충족한다.
- **Focus:** 외곽선을 `highlight-lime-strong`으로 바꾸고 3px 포커스 링을 추가한다. 레이아웃 크기는 변하지 않아야 한다.
- **Error / Disabled:** 오류는 `error` 외곽선, 오류 아이콘, 구체적인 도움말을 함께 사용한다. 비활성 필드는 읽기 가능한 텍스트 대비를 유지한다.

### Navigation

- **Top Level:** 홈, 챌린지, 덱, 설정의 네 목적지만 유지한다. 내비게이션에는 행동 버튼을 넣지 않는다.
- **iOS:** 4개 시스템 Tab Bar, 최상위 화면 Large Title, 상세 화면 Navigation Stack을 사용한다. 왼쪽 가장자리 뒤로가기 제스처를 항상 유지한다.
- **Android:** compact width에서는 4개 Material Navigation Bar, expanded width에서는 Navigation Rail로 전환한다. Top App Bar와 predictive Back을 지원한다.
- **Web PWA:** 모바일에서는 하단 탭을 안전 영역 위에 고정하고, 키보드 포커스와 브라우저 뒤로가기를 보존한다.
- **Active State:** 활성 목적지는 아이콘, 굵기, `highlight-lime` 또는 `highlight-lime-strong`의 선택 표시를 함께 사용한다.

### Sheets, Modals, and Menus

- **iOS:** 생성·편집처럼 독립적인 짧은 작업은 system sheet, 파괴적 확인은 alert 또는 confirmation dialog를 사용한다. 취소·완료 행동을 명시하고 데이터 손실이 없다면 아래로 스와이프해 닫을 수 있어야 한다.
- **Android:** 생성·편집은 modal bottom sheet, 반드시 중단해야 하는 결정만 Material dialog를 사용한다. 짧은 피드백은 Snackbar로 전달한다.
- **Web PWA:** 모바일과 같은 bottom-sheet 우선 원칙을 사용한다. `/upload`의 넓은 데스크톱 문맥에서만 중앙 dialog를 허용한다.

### Quiz Surface

- 문제 본문은 화면의 첫 번째 정보이며 최소 Body 크기 이상을 사용한다.
- 진행률은 얇은 4px 트랙과 `highlight-lime-strong` 채움으로 표현하고, 읽을 수 있는 현재/전체 텍스트를 함께 제공한다.
- 숨겨진 답은 밑줄이나 `surface` 슬롯으로 표현한다. 공개된 답은 `highlight-lime` 배경과 굵은 잉크 텍스트로 표시한다.
- 정답과 오답 버튼은 하단 엄지 영역에 두고 iOS 44pt, Android 48dp 이상의 터치 영역과 8dp 이상의 간격을 확보한다.
- 상태 변화는 150–220ms의 빠른 전환으로 전달한다. Reduce Motion 또는 Remove animations 설정에서는 즉시 전환하거나 짧은 crossfade만 사용한다.

### Desktop Upload Workspace

- `/upload`는 1024px 이상에서 마크다운 편집기와 검증 미리보기의 2열 작업 공간을 사용한다.
- 편집기와 미리보기는 같은 높이와 명확한 열 경계를 가지며, 확인 행동은 미리보기 열 하단에 고정한다.
- 1024px 미만에서는 억지로 모바일 편집기를 제공하지 않는다. 데스크톱 사용 안내와 안전한 이탈 경로를 보여준다.

## 6. Do's and Don'ts

### Do:

- **Do** 오늘 풀 문제와 복습 시작 행동을 홈의 첫 화면에 둔다.
- **Do** `highlight-lime`을 정답 공개, 현재 선택, 진행 상태에만 제한한다.
- **Do** 리스트와 구분선을 우선하고, 실제 독립 객체에만 8–12px 카드를 사용한다.
- **Do** 모든 터치 영역을 iOS 44pt 이상, Android 48dp 이상으로 만들고 인접 행동 사이에 최소 8dp 간격을 둔다.
- **Do** 시스템 글자 크기, 다크 모드, 고대비, Reduce Motion 및 Remove animations 설정에서 모든 핵심 흐름을 검증한다.
- **Do** iOS의 Tab Bar·Navigation Stack·Sheet와 Android의 Navigation Bar/Rail·Bottom Sheet·predictive Back을 각각 사용한다.
- **Do** `/upload`만 넓은 데스크톱 작업 공간으로 설계하고, 나머지 모든 경로는 320px부터 모바일 우선으로 설계한다.

### Don't:

- **Don't** **카드와 통계가 빽빽한 전형적인 학습 대시보드**를 만든다. 홈에 지표, 스트릭, 차트, 추천 카드를 동시에 쌓지 않는다.
- **Don't** 라임을 장식 배경, 비활성 아이콘, 모든 CTA에 반복 사용한다.
- **Don't** display 글꼴을 버튼, 탭, 폼 레이블, 문제 본문에 사용한다.
- **Don't** 색상 하나만으로 정답, 오답, 선택, 오류를 구분한다.
- **Don't** iOS의 가장자리 뒤로가기나 Android의 predictive Back을 막거나 자체 제스처로 대체한다.
- **Don't** 모바일에서 생성·편집을 습관적으로 중앙 모달에 넣는다. 플랫폼 sheet와 bottom sheet를 우선한다.
- **Don't** 1px 외곽선과 16px 이상의 흐린 그림자를 같은 카드에 함께 사용한다.
- **Don't** 카드와 섹션에 16px을 넘는 과도한 둥근 모서리를 사용한다.
- **Don't** 애니메이션을 장식으로 사용하거나 학습자가 220ms 이상 기다리게 한다.
