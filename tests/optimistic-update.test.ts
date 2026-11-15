import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { COMMUNITY_QUERY_KEYS } from "@/entities/community/api/keys";
import {
  getOptimisticLikeMutationOptions,
  togglePostLikeInCache,
  updatePostsListCache,
} from "@/entities/community/api/optimisticLike";
import type {
  InfinitePostsData,
  PostDetail,
} from "@/entities/community/model/types";

describe("[Optimistic Update & Multi-Cache Atomic Rollback]", () => {
  let queryClient: QueryClient;
  const TARGET_POST_ID = 101;

  // 가상 테스트용 상세 캐시 초기 데이터
  const mockInitialDetail: PostDetail = {
    id: TARGET_POST_ID,
    title: "벤치프레스 100kg 달성 꿀팁",
    content: "점진적 과부하를 적용해 보세요.",
    author: "김혁수",
    isLiked: false,
    likeCount: 10,
    commentCount: 3,
    createdAt: "2026-10-05T00:00:00.000Z",
  };

  // 가상 테스트용 무한 스크롤 목록 캐시 초기 데이터 (2개 페이지)
  const mockInitialPosts: InfinitePostsData = {
    pages: [
      {
        content: [
          {
            id: TARGET_POST_ID,
            title: "벤치프레스 100kg 달성 꿀팁",
            content: "점진적 과부하",
            author: "김혁수",
            isLiked: false,
            likeCount: 10,
            commentCount: 3,
            createdAt: "2026-10-05T00:00:00.000Z",
          },
          {
            id: 102,
            title: "스쿼트 무릎 통증 질문",
            content: "발목 가동성 문제일까요?",
            author: "회원A",
            isLiked: true,
            likeCount: 5,
            commentCount: 1,
            createdAt: "2026-10-05T01:00:00.000Z",
          },
        ],
        pageNumber: 0,
        pageSize: 10,
        isLast: false,
      },
    ],
    pageParams: [0],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // 쿼리 클라이언트 캐시에 초기 상태 주입
    queryClient.setQueryData(
      COMMUNITY_QUERY_KEYS.postDetail(TARGET_POST_ID),
      mockInitialDetail,
    );
    queryClient.setQueryData(COMMUNITY_QUERY_KEYS.posts(), mockInitialPosts);
  });

  describe("1. 헬퍼 순수 함수 불변성 검증", () => {
    it("togglePostLikeInCache: 타깃 게시글의 좋아요를 누르면 isLiked는 true가 되고 likeCount는 1 증가한다", () => {
      const updated = togglePostLikeInCache(mockInitialDetail, TARGET_POST_ID);
      expect(updated.isLiked).toBe(true);
      expect(updated.likeCount).toBe(11);
    });

    it("togglePostLikeInCache: 이미 좋아요 상태에서 누르면 isLiked는 false가 되고 likeCount는 1 감소한다", () => {
      const likedPost: PostDetail = {
        ...mockInitialDetail,
        isLiked: true,
        likeCount: 10,
      };
      const updated = togglePostLikeInCache(likedPost, TARGET_POST_ID);
      expect(updated.isLiked).toBe(false);
      expect(updated.likeCount).toBe(9);
    });

    it("updatePostsListCache: 무한 스크롤 캐시에서 타깃 게시글만 정확히 변경되고 다른 게시글은 보존된다", () => {
      const updatedList = updatePostsListCache(mockInitialPosts, TARGET_POST_ID);
      expect(updatedList?.pages[0].content[0].isLiked).toBe(true);
      expect(updatedList?.pages[0].content[0].likeCount).toBe(11);

      // 다른 게시글(id: 102)은 영향받지 않아야 함
      expect(updatedList?.pages[0].content[1].isLiked).toBe(true);
      expect(updatedList?.pages[0].content[1].likeCount).toBe(5);
    });
  });

  describe("2. onMutate 즉시 반응성(0ms) 및 Race Condition 방어", () => {
    it("onMutate 호출 시 cancelQueries가 실행되어 백그라운드 쿼리 경합을 사전에 차단한다", async () => {
      const cancelSpy = vi.spyOn(queryClient, "cancelQueries");
      const mockApi = vi.fn().mockResolvedValue({ success: true });

      const options = getOptimisticLikeMutationOptions(
        queryClient,
        TARGET_POST_ID,
        mockApi,
      );

      await options.onMutate();

      // 상세 쿼리와 목록 쿼리 모두 취소 호출되었는지 검증
      expect(cancelSpy).toHaveBeenCalledWith({
        queryKey: COMMUNITY_QUERY_KEYS.postDetail(TARGET_POST_ID),
      });
      expect(cancelSpy).toHaveBeenCalledWith({
        queryKey: COMMUNITY_QUERY_KEYS.posts(),
      });
    });

    it("onMutate 실행 즉시 상세 캐시와 무한 스크롤 목록 캐시가 0ms 만에 동시에 업데이트된다", async () => {
      const mockApi = vi.fn().mockResolvedValue({ success: true });
      const options = getOptimisticLikeMutationOptions(
        queryClient,
        TARGET_POST_ID,
        mockApi,
      );

      const context = await options.onMutate();

      // 1. 상세 화면 캐시 확인
      const currentDetail = queryClient.getQueryData<PostDetail>(
        COMMUNITY_QUERY_KEYS.postDetail(TARGET_POST_ID),
      );
      expect(currentDetail?.isLiked).toBe(true);
      expect(currentDetail?.likeCount).toBe(11);

      // 2. 무한 스크롤 목록 캐시 확인
      const currentPosts = queryClient.getQueryData<InfinitePostsData>(
        COMMUNITY_QUERY_KEYS.posts(),
      );
      expect(currentPosts?.pages[0].content[0].isLiked).toBe(true);
      expect(currentPosts?.pages[0].content[0].likeCount).toBe(11);

      // 3. context 스냅샷에 변경 전 원래 데이터가 안전하게 담겨있는지 확인
      expect(context.previousDetail?.isLiked).toBe(false);
      expect(context.previousDetail?.likeCount).toBe(10);
    });
  });

  describe("3. onError 원자적 롤백 (Atomic Rollback)", () => {
    it("네트워크 장애로 API가 실패하면 onError에서 상세 캐시와 목록 캐시가 과거 스냅샷으로 완벽히 복구된다", async () => {
      const mockApi = vi.fn().mockRejectedValue(new Error("Network Error 500"));
      const options = getOptimisticLikeMutationOptions(
        queryClient,
        TARGET_POST_ID,
        mockApi,
      );

      // 1. 먼저 onMutate로 캐시를 낙관적으로 변경 (하트 ON)
      const context = await options.onMutate();
      expect(
        queryClient.getQueryData<PostDetail>(
          COMMUNITY_QUERY_KEYS.postDetail(TARGET_POST_ID),
        )?.isLiked,
      ).toBe(true);

      // 2. 에러 발생 시 onError 실행 (롤백 트리거)
      options.onError(new Error("Network Failure"), undefined, context);

      // 3. 상세 화면 캐시가 원래의 false / 10으로 롤백되었는지 확인
      const rolledBackDetail = queryClient.getQueryData<PostDetail>(
        COMMUNITY_QUERY_KEYS.postDetail(TARGET_POST_ID),
      );
      expect(rolledBackDetail?.isLiked).toBe(false);
      expect(rolledBackDetail?.likeCount).toBe(10);

      // 4. 무한 스크롤 목록 캐시 또한 원래의 false / 10으로 완벽히 롤백되었는지 확인
      const rolledBackPosts = queryClient.getQueryData<InfinitePostsData>(
        COMMUNITY_QUERY_KEYS.posts(),
      );
      expect(rolledBackPosts?.pages[0].content[0].isLiked).toBe(false);
      expect(rolledBackPosts?.pages[0].content[0].likeCount).toBe(10);
    });
  });

  describe("4. onSettled 최종 데이터 정합성 동기화", () => {
    it("작업이 완료되면 성공/실패 여부와 관계없이 invalidateQueries를 호출해 서버와 최종 동기화한다", () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const mockApi = vi.fn();
      const options = getOptimisticLikeMutationOptions(
        queryClient,
        TARGET_POST_ID,
        mockApi,
      );

      options.onSettled();

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: COMMUNITY_QUERY_KEYS.postDetail(TARGET_POST_ID),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: COMMUNITY_QUERY_KEYS.posts(),
      });
    });
  });
});
