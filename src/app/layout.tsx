import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Linkfit · Frontend Showcase",
  description: "실제 서비스에서 추출한 코드와 모의 데이터로 살펴보는 프론트엔드 설계 사례",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header"><Link href="/">LINKFIT / FRONTEND SHOWCASE</Link><span>모의 데이터 전용</span></header>
        <main>{children}</main>
        <footer>공개용 코드 발췌 · 실제 회원 및 운영 서버에 연결하지 않습니다.</footer>
      </body>
    </html>
  );
}
