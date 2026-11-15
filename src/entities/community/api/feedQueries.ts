import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/axios";
import type { FeedCategory, FeedPage } from "./feedTypes";
import { FEED_QUERY_KEYS, FEED_PAGE_SIZE, FEED_STALE_TIME } from "./feedConfig";

export function useCommunityFeed(category: FeedCategory) {
  return useInfiniteQuery({
    queryKey: FEED_QUERY_KEYS.list(category),
    queryFn: async ({ pageParam }) => {
      const response = await api.get<FeedPage>("/api/posts", {
        params: { page: pageParam, size: FEED_PAGE_SIZE, category, sort: "createdAt,desc" },
      });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.last ? undefined : lastPage.number + 1,
    staleTime: FEED_STALE_TIME,
  });
}
