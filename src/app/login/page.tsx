export default function LoginPage() {
  return <>
    <p className="eyebrow">COMMUNITY SSR / DEMO LOGIN</p><h1>가상 사용자 선택</h1>
    <p className="intro">운영 로그인 대신 데모 쿠키를 설정합니다. 사용자별 첫 게시글이 서버 HTML에 포함되는지 확인할 수 있습니다.</p>
    <div className="toolbar">
      <a className="button" href="/demo/login?user=alice">사용자 A로 열기</a>
      <a className="button secondary" href="/demo/login?user=bob">사용자 B로 열기</a>
      <a href="/demo/login?user=incomplete">프로필 미완성</a>
      <a href="/demo/login?user=expired">만료된 인증</a>
      <a href="/demo/login?user=outage">백엔드 장애</a>
    </div>
  </>;
}
