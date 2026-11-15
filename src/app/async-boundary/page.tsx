"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AsyncBoundary } from "@/shared/ui/AsyncBoundary";

const RecoverableWidget = dynamic(() => import("./RecoverableWidget"), {
  ssr: false,
  loading: () => <p role="status">예제 준비 중…</p>,
});

export default function AsyncBoundaryPage() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>
    <p className="eyebrow">SUSPENSE + QUERY ERROR RESET</p><h1>위젯 단위 오류 복구</h1>
    <p className="intro">한 위젯의 실패가 인접한 화면을 가리지 않도록 경계를 나눴습니다. 첫 요청은 실패하고 ‘다시 시도’하면 성공합니다.</p>
    <div className="case-grid">
      <section className="card"><h2>운동 기록 요약</h2><p>이 위젯은 다른 위젯의 오류와 무관하게 계속 표시됩니다.</p></section>
      <section className="card"><h2>조회 위젯</h2><AsyncBoundary pendingFallback={<p role="status">로딩 중…</p>} errorFallback={({ error, reset }) => <div role="alert"><p>{error.message}</p><button onClick={reset}>다시 시도</button></div>}><RecoverableWidget /></AsyncBoundary></section>
    </div>
    <aside className="note">실제 서비스의 AsyncBoundary·ErrorBoundary를 추출했습니다. 첫 실패 후 성공하는 API는 재현용으로 추가했습니다.</aside>
  </QueryClientProvider>;
}
