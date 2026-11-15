# 위젯 단위 비동기 경계

## 읽기 순서

1. [AsyncBoundary](../../src/shared/ui/AsyncBoundary.tsx)
2. [ErrorBoundary](../../src/shared/ui/ErrorBoundary.tsx)
3. [공개용 화면](../../src/app/async-boundary/page.tsx)
4. [복구 테스트](../../tests/async-boundary.test.tsx)

## 동작

`useSuspenseQuery`가 대기 중인 Promise를 전달하면 Suspense가 로딩 UI를 보여줍니다. 조회 오류는 ErrorBoundary가 격리합니다. 재시도 버튼은 ErrorBoundary의 상태와 TanStack Query의 오류 재시도 경계를 함께 초기화합니다.

데이터를 표시하는 위젯은 정상 데이터 렌더링에 집중하고, 상위 컴포넌트는 로딩·오류 UI와 실패 범위를 결정합니다. 위젯마다 경계를 나누면 한 위젯의 실패가 다른 위젯을 가리지 않습니다.

## 공개용 변경

원본 경계 컴포넌트를 가져오고 학습용 장문 주석을 줄였습니다. 별도 라이브러리로 대체하지 않았습니다. 첫 요청만 실패하는 Route Handler와 두 위젯의 화면은 재현을 위해 새로 작성했습니다. Query 캐시 자체를 전부 삭제하는 구현은 아닙니다.

## 한계

ErrorBoundary는 이벤트 핸들러·일반 Promise rejection을 모두 포착하지 않습니다. 모든 요청을 이 경계 하나로 처리하지 않고, 사용자 액션의 실패는 별도 처리해야 합니다.

공개 데모의 상대 경로 API는 브라우저에서 실행하도록 위젯만 `dynamic(..., { ssr: false })`로 표시합니다. 커뮤니티 SSR과 이 클라이언트 위젯 데모의 렌더링 목적은 다릅니다.
