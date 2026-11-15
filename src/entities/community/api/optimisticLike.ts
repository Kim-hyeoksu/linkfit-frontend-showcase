import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { COMMUNITY_QUERY_KEYS } from "./keys";
import type {
  CommunityPost,
  InfinitePostsData,
  OptimisticLikeContext,
  PostDetail,
} from "../model/types";

/**
 * 캐시 내 특정 게시글의 좋아요 상태 및 카운트를 불변(Immutable)하게 반전시킵니다.
 */
export const togglePostLikeInCache = <T extends CommunityPost>(
  post: T,
  targetPostId: number,
): T => {
  if (post.id !== targetPostId) return post;
  return {
    ...post,
    isLiked: !post.isLiked,
    likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1,
  };
};

/**
 * useInfiniteQuery 형태의 무한 스크롤 목록 캐시를 순회하며 타깃 게시글의 좋아요를 갱신합니다.
 */
export const updatePostsListCache = (
  oldData: InfinitePostsData | undefined,
  postId: number,
): InfinitePostsData | undefined => {
  if (!oldData || !oldData.pages) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page) => ({
      ...page,
      content: page.content.map((post) => togglePostLikeInCache(post, postId)),
    })),
  };
};

/**
 * [Multi-Cache Atomic Optimistic Update Engine]
 *
 * TanStack Query의 Mutation 라이프사이클을 활용하여,
 * 1. onMutate: 진행 중인 쿼리 취소(Race Condition 차단) 및 상세+목록 다중 캐시 동시 스냅샷 백업 & 즉각 UI 반전(0ms)
 * 2. onError: 네트워크 장애 또는 서버 에러 시 보관된 스냅샷으로 다중 캐시 원자적 동시 롤백
 * 3. onSettled: 서버와의 최종 데이터 정합성을 위한 백그라운드 재검증(Invalidate)
 */
export const getOptimisticLikeMutationOptions = (
  queryClient: QueryClient,
  postId: number,
  mutationFn: () => Promise<any>,
) => {
  return {
    mutationFn,

    // ⚡️ 1. API 호출 직전 즉시 화면 갱신 (0ms 반응성 달성)
    onMutate: async (): Promise<OptimisticLikeContext> => {
      // 🛑 경합 상태(Race Condition) 방어:
      // 백그라운드에서 진행 중이던 조회 쿼리가 낙관적 업데이트를 덮어쓰지 않도록 즉시 취소
      await queryClient.cancelQueries({
        queryKey: COMMUNITY_QUERY_KEYS.postDetail(postId),
      });
      await queryClient.cancelQueries({
        queryKey: COMMUNITY_QUERY_KEYS.posts(),
      });

      // 📸 타임머신 스냅샷 보관 (실패 시 롤백 좌표 확보)
      const previousDetail = queryClient.getQueryData<PostDetail>(
        COMMUNITY_QUERY_KEYS.postDetail(postId),
      );
      const previousPosts = queryClient.getQueriesData<InfinitePostsData>({
        queryKey: COMMUNITY_QUERY_KEYS.posts(),
      });

      // [캐시 1] 상세 화면 캐시 즉시 업데이트
      queryClient.setQueryData<PostDetail>(
        COMMUNITY_QUERY_KEYS.postDetail(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            isLiked: !old.isLiked,
            likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount + 1,
          };
        },
      );

      // [캐시 2] 무한 스크롤 목록 캐시까지 원자적 동시 업데이트 (캐시 불일치 방지)
      queryClient.setQueriesData<InfinitePostsData>(
        { queryKey: COMMUNITY_QUERY_KEYS.posts() },
        (old) => updatePostsListCache(old, postId),
      );

      // onError에 전달될 context 객체 반환
      return { previousDetail, previousPosts };
    },

    // 🛡️ 2. 네트워크 단절 또는 서버 에러 발생 시 원자적 롤백 (Atomic Rollback)
    onError: (
      _err: unknown,
      _variables: unknown,
      context: OptimisticLikeContext | undefined,
    ) => {
      // 상세 화면 캐시 복원
      if (context?.previousDetail) {
        queryClient.setQueryData(
          COMMUNITY_QUERY_KEYS.postDetail(postId),
          context.previousDetail,
        );
      }
      // 무한 스크롤 목록 캐시 배열 전체 일괄 복원
      if (context?.previousPosts) {
        context.previousPosts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // 🔄 3. 작업 완료 후 서버 정답 데이터와 최종 동기화
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: COMMUNITY_QUERY_KEYS.postDetail(postId),
      });
      queryClient.invalidateQueries({
        queryKey: COMMUNITY_QUERY_KEYS.posts(),
      });
    },
  };
};

/**
 * React 컴포넌트에서 사용하는 useToggleLike 훅
 */
export const useToggleLike = (
  postId: number,
  toggleLikeApi: () => Promise<any>,
) => {
  const queryClient = useQueryClient();
  const options = getOptimisticLikeMutationOptions(
    queryClient,
    postId,
    toggleLikeApi,
  );

  return useMutation(options);
};
