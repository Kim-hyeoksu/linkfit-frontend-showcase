# 인증된 커뮤니티의 첫 목록 SSR

## 읽기 순서

1. [페이지](../../src/app/community/page.tsx): 인증 → 첫 페이지 → 요청별 QueryClient → HydrationBoundary.
2. [서버 인증](../../src/features/auth/api/getServerSession.ts): 쿠키 확인, 갱신, 사용자·필수 프로필 확인.
3. [서버 HTTP](../../src/shared/api/server.ts): no-store, 타임아웃, 필요한 인증 헤더만 전달.
4. [공유 키](../../src/entities/community/api/feedConfig.ts)와 [서버 목록](../../src/entities/community/api/getFeed.server.ts).
5. [Provider](../../src/features/auth/ui/CommunitySession.tsx)와 [피드](../../src/app/community/CommunityFeed.tsx).
6. [컴포넌트 테스트](../../tests/community-feed.test.tsx), [프로덕션 HTTP 테스트](../../tests/community-ssr.smoke.mjs).

## 검토할 설계 선택

- 인증 전에는 개인화된 목록을 조회하지 않습니다. HttpOnly 쿠키의 토큰은 서버 조회 내부에서 사용합니다.
- 전역 서버 QueryClient나 공유 캐시를 사용하지 않습니다. 사용자별 결과를 같은 캐시에 보관하는 위험을 피합니다.
- 클라이언트가 같은 키로 첫 페이지를 재사용하게 하고, 뒤 페이지는 기존 API 방식으로 조회합니다.
- 서버에서 조회하는 동안 TTFB가 길어질 수 있습니다. 인증·사용자·목록 요청을 직렬 수행하는 비용도 존재합니다.
- 최초 HTML에 목록이 있다는 사실과 실제 사용자에게 더 빨리 보인다는 주장은 구분합니다.

## 공개용 변경

원본에서 요청별 SSR·하이드레이션 흐름을 추출했습니다. 원본의 Jotai 사용자 상태, 다른 화면과 공유하는 캐시 동기화, 공통 AppShell은 생략했습니다. 공개 예제는 사용자 전환을 전체 페이지 이동으로 처리하고 새 Provider를 생성합니다. 따라서 원본의 모든 계정 전환 경로를 재현하는 예제는 아닙니다.

목록 DTO와 카테고리, 화면은 최소 필드만 남겼고 페이지 추가 트리거는 버튼으로 바꿨습니다. 운영용 인증 대신 데모 쿠키와 로컬 모의 API를 사용합니다. 기존 낙관적 업데이트 예제와 응답 형태가 달라 SSR 피드 키·타입은 별도로 둡니다.

## 실행 중 확인

- `/login`에서 A·B를 바꾸면 각 사용자의 가상 게시글만 표시됩니다.
- View Source에서 첫 게시글을 찾을 수 있습니다.
- DevTools의 Fetch/XHR에는 최초 목록을 위한 추가 GET이 없어야 합니다. 탭 변경·추가 페이지 조회 시에는 발생합니다.
- 첫 클라이언트 조회 시 메모리 토큰이 없으면 기존 Axios 인터셉터가 인증 갱신 후 재시도합니다.
- 인증 만료는 로그인, 미완성 프로필은 온보딩, 백엔드 장애는 재시도 화면입니다.

## 검증 범위

`npm run test:ssr`은 JavaScript를 실행하는 브라우저 테스트가 아니라 프로덕션 HTML·HTTP 동작 테스트입니다. 첫 목록 중복 요청과 탭·페이지 동작은 컴포넌트 테스트로 확인합니다. 실제 모바일 WebView와 운영 성능은 별도 검증 대상입니다.
