"use client";

import { useState } from "react";
import { useCommunityFeed } from "@/entities/community/api/feedQueries";
import type { FeedCategory } from "@/entities/community/api/feedTypes";

const tabs: { category: FeedCategory; label: string }[] = [
  { category: "ALL", label: "전체" }, { category: "WORKOUT", label: "오운완" }, { category: "FREE", label: "자유" },
];

export default function CommunityFeed({ viewerName }: { viewerName: string }) {
  const [category, setCategory] = useState<FeedCategory>("ALL");
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useCommunityFeed(category);
  return <>
    <p className="eyebrow">AUTHENTICATED SERVER RENDERING</p><h1>커뮤니티</h1>
    <p className="intro">{viewerName} · 첫 목록은 서버 HTML에 포함됩니다. 이후 탭과 페이지 이동은 브라우저의 Query 캐시로 처리합니다.</p>
    <div className="toolbar">{tabs.map((tab) => <button aria-pressed={category === tab.category} key={tab.category} onClick={() => setCategory(tab.category)}>{tab.label}</button>)}<a href="/login">사용자 변경</a></div>
    {isPending && <p role="status">게시글을 불러오는 중…</p>}
    {isError && <div role="alert"><p>목록을 불러오지 못했습니다.</p><button onClick={() => refetch()}>다시 시도</button></div>}
    <div className="feed">{data?.pages.flatMap((page) => page.content).map((post) => <article className="card" key={post.id}><span className="eyebrow">{post.category} / {post.author.name}</span><h2>{post.content}</h2></article>)}</div>
    {hasNextPage && <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? "불러오는 중…" : "다음 페이지"}</button>}
    <aside className="note">공개 예제는 재현하기 쉽도록 무한 스크롤 트리거를 ‘다음 페이지’ 버튼으로 바꿨습니다. 원본의 좋아요 로직은 별도 낙관적 업데이트 사례에서 확인할 수 있습니다.</aside>
  </>;
}
