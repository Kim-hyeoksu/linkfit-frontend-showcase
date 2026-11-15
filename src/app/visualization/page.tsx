"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ExerciseHistoryResponse } from "@/entities/exercise/model/types";

const ExerciseHistoryChart = dynamic(
  () => import("@/widgets/exercise/ui/ExerciseHistoryChart").then((module) => module.ExerciseHistoryChart),
  { ssr: false, loading: () => <p role="status">차트 모듈 로딩 중…</p> },
);

const data: ExerciseHistoryResponse[] = [
  { sessionId: 1, sessionDate: "2026-01-01T12:00:00+09:00", planTitle: "가상 기록", programName: null, calculated1Rm: 65, totalVolume: 1200, sets: [] },
  { sessionId: 2, sessionDate: "2026-01-08T12:00:00+09:00", planTitle: "가상 기록", programName: null, calculated1Rm: 68, totalVolume: 1500, sets: [] },
  { sessionId: 3, sessionDate: "2026-01-15T12:00:00+09:00", planTitle: "가상 기록", programName: null, calculated1Rm: 72, totalVolume: 1750, sets: [] },
];

export default function VisualizationPage() {
  const [visible, setVisible] = useState(false);
  return <>
    <p className="eyebrow">DYNAMIC IMPORT / CLIENT ONLY</p><h1>시각화 모듈 분리</h1>
    <p className="intro">화면의 입력·조회 로직과 Chart.js 구성·줌 플러그인 등록을 분리했습니다. 브라우저 전용 모듈은 서버에서 실행하지 않습니다.</p>
    <button onClick={() => setVisible((value) => !value)}>{visible ? "차트 닫기" : "차트 열기"}</button>
    {visible && <section className="card"><ExerciseHistoryChart data={data} /></section>}
    <aside className="note">차트는 실제 서비스 컴포넌트에서 추출했습니다. 표시 버튼과 데이터는 공개 예제용이며, 번들 감소율은 이 저장소에서 측정하지 않았습니다.</aside>
  </>;
}
