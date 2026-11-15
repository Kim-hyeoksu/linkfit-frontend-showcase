# 코드 출처와 공개용 변경 범위

실제 `linkfit-web`의 현재 코드에서 추출했습니다. 원본 저장소의 URL, 운영용 환경 파일, 실사용자 데이터, 배포 설정은 포함하지 않습니다. 커뮤니티 SSR은 최근 작업한 구현이며 운영 적용 성과를 주장하지 않습니다.

| 공개 파일 | 원본 파일 | 처리 |
| --- | --- | --- |
| `src/shared/api/server.ts` | 동일 경로 | 서버 HTTP 요청·인증 헤더·캐시 정책 추출 |
| `src/features/auth/api/getServerSession.ts` | 동일 경로 | 인증 순서 유지, User 타입만 필요한 필드로 축소 |
| `src/app/community/page.tsx` | `src/app/(community)/community/page.tsx` | 요청별 QueryClient·하이드레이션 유지, AppShell 생략 |
| `src/features/auth/ui/CommunitySession.tsx` | 동일 경로 | 사용자별 Provider만 남기고 Jotai·부모 캐시 동기화 생략 |
| `src/entities/community/api/feedConfig.ts` | `src/entities/community/api/queryKeys.ts` | 페이지 크기·staleTime·키 공유, 기존 공개 예제와 충돌하지 않도록 키 구분 |
| `src/entities/community/api/getFeed.server.ts` | `src/entities/community/api/getPosts.server.ts` | 첫 페이지 조회와 응답 검사 유지, DTO 이름 축소 |
| `src/entities/community/api/feedQueries.ts` | `src/entities/community/api/queries.ts` | 목록 useInfiniteQuery 부분만 추출 |
| `src/app/community/CommunityFeed.tsx` | `src/app/(community)/community/CommunityFeed.tsx` | 목록·탭만 남기고 추가 페이지는 버튼으로 재현 |
| `src/shared/ui/AsyncBoundary.tsx` | 동일 경로 | 핵심 로직 유지, 장문 설명 주석 정리 |
| `src/shared/ui/ErrorBoundary.tsx` | 동일 경로 | 핵심 로직 유지, 장문 설명 주석 정리 |
| `src/app/visualization/page.tsx` | `src/app/(fullscreen)/exercises/history/[exerciseId]/page.tsx` | dynamic import 설정 추출, 공개 화면·데이터는 신규 |
| `src/widgets/exercise/ui/ExerciseHistoryChart.tsx` | 동일 경로 | 차트 로직 유지, 캔버스 높이 스타일을 독립 실행용으로 조정 |
| `tests/server-api.test.ts` | `src/shared/api/server.test.ts` | import 경로 변경 |
| `tests/server-session.test.ts` | `src/features/auth/api/getServerSession.test.ts` | import 경로 변경 |
| `tests/async-boundary.test.tsx` | `src/shared/ui/AsyncBoundary.test.tsx` | import·테스트 환경과 정리 처리 보완 |

## 공개 예제용 신규 코드

- `scripts/mock-backend.mjs`: 가상 사용자, 정해진 실패·페이지 응답.
- `scripts/run-demo.mjs`: 로컬 모의 API와 Next.js 동시 실행·종료.
- `/demo/login`, `/api/[...path]`, `/api/demo/widget`: 재현용 쿠키·프록시·첫 실패 시나리오.
- 홈·가입 안내·비동기 경계 데모 화면과 CSS.
- `tests/community-feed.test.tsx`, `tests/community-ssr.smoke.mjs`: 축약한 공개 예제 검증.

기존 공개 저장소의 동기화 큐·브리지·제스처·useFunnel·낙관적 업데이트 파일은 유지했습니다. 공개 저장소의 추출 코드와 운영 코드를 동일한 완제품으로 보지 않도록 구분합니다.
