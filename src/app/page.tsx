import Link from "next/link";

const cases = [
  { number: "01", title: "인증된 커뮤니티의 첫 목록 SSR", href: "/login", body: "쿠키 인증 → 서버 목록 조회 → 하이드레이션 → 탭·추가 로딩. 두 사용자로 HTML과 캐시 경계를 비교합니다." },
  { number: "02", title: "실패한 위젯만 다시 시도", href: "/async-boundary", body: "Suspense와 QueryErrorResetBoundary를 결합해 로딩·오류 처리를 화면의 데이터 로직에서 분리합니다." },
  { number: "03", title: "차트를 독립 모듈로 로딩", href: "/visualization", body: "Chart.js 등록과 브라우저 전용 줌 플러그인을 별도 컴포넌트에 두고 dynamic import로 불러옵니다." },
];

export default function HomePage() {
  return <>
    <p className="eyebrow">CODE WALKTHROUGH</p>
    <h1>코드의 선택과 동작을<br />함께 살펴보는 공간</h1>
    <p className="intro">Linkfit의 실제 코드를 바탕으로 구성한 독립 실행 예제입니다. 인증 정보와 데이터는 모두 공개용 가상 값입니다.</p>
    <div className="case-grid">{cases.map((item) => <Link className="card" href={item.href} key={item.number}>
      <span className="eyebrow">{item.number}</span><h2>{item.title}</h2><p>{item.body}</p><span className="action">예제 열기 →</span>
    </Link>)}</div>
    <section className="note"><h2>나머지 사례는 소스로 확인할 수 있습니다</h2><p>토큰 갱신 요청 조정, 낙관적 업데이트, 오프라인 동기화 큐, WebView 브리지·제스처, useFunnel은 README의 읽기 순서를 따라 살펴보세요.</p></section>
  </>;
}
