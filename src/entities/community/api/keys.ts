/**
 * 커뮤니티 도메인 TanStack Query Key Factory
 */
export const COMMUNITY_QUERY_KEYS = {
  all: ["community"] as const,
  posts: () => [...COMMUNITY_QUERY_KEYS.all, "posts"] as const,
  postDetail: (postId: number) =>
    [...COMMUNITY_QUERY_KEYS.all, "postDetail", postId] as const,
  comments: (postId: number) =>
    [...COMMUNITY_QUERY_KEYS.all, "comments", postId] as const,
};
