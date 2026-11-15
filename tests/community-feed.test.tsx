// @vitest-environment jsdom
import React from "react";
import { QueryClient, QueryClientProvider, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommunityFeed from "@/app/community/CommunityFeed";
import { FEED_QUERY_KEYS } from "@/entities/community/api/feedConfig";
import { api } from "@/shared/api/axios";

vi.mock("@/shared/api/axios", () => ({ api: { get: vi.fn() } }));
const clients: QueryClient[] = [];
const page = (content: string, number = 0, last = false) => ({
  content: [{ id: number + 1, content, author: { id: 1, name: "가상 사용자" }, category: "WORKOUT", createdAt: "2026-01-01T00:00:00Z" }],
  number, last,
});

beforeEach(() => vi.mocked(api.get).mockReset());
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; });

function setup() {
  const server = new QueryClient();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(server, client);
  server.setQueryData(FEED_QUERY_KEYS.list(), { pages: [page("서버 첫 게시글")], pageParams: [0] });
  render(<QueryClientProvider client={client}><HydrationBoundary state={dehydrate(server)}><CommunityFeed viewerName="사용자 A" /></HydrationBoundary></QueryClientProvider>);
}

describe("서버 첫 목록 이후의 상호작용", () => {
  it("하이드레이션 직후 첫 페이지를 중복 조회하지 않음", async () => {
    setup();
    expect(screen.getByText("서버 첫 게시글")).toBeDefined();
    await act(async () => { await Promise.resolve(); });
    expect(api.get).not.toHaveBeenCalled();
  });

  it("탭과 다음 페이지 요청이 기존 목록에 이어짐", async () => {
    vi.mocked(api.get).mockImplementation(async (_url, options) => {
      const { page: pageNumber = 0 } = (options?.params ?? {}) as { page?: number };
      return { data: page(pageNumber === 0 ? "운동 탭 결과" : "추가 결과", pageNumber, pageNumber === 1) };
    });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "오운완" }));
    expect(await screen.findByText("운동 탭 결과")).toBeDefined();
    expect(api.get).toHaveBeenLastCalledWith("/api/posts", { params: { page: 0, size: 20, category: "WORKOUT", sort: "createdAt,desc" } });
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    expect(await screen.findByText("추가 결과")).toBeDefined();
    expect(screen.getByText("운동 탭 결과")).toBeDefined();
    expect(screen.queryByRole("button", { name: "다음 페이지" })).toBeNull();
  });
});
