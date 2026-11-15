"use client";
import { useRouter } from "next/navigation";

export default function CommunityUnavailable() {
  const router = useRouter();
  return <section role="alert" className="card"><h1>커뮤니티를 불러오지 못했습니다</h1><p>로그아웃 처리 대신 다시 시도할 수 있도록 안내합니다.</p><button onClick={() => router.refresh()}>다시 시도</button><p><a href="/login">다른 데모 사용자 선택</a></p></section>;
}
