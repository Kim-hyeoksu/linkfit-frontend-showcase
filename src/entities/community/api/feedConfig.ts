import type { FeedCategory } from "./feedTypes";

export const FEED_PAGE_SIZE = 20;
export const FEED_STALE_TIME = 30_000;
export const FEED_QUERY_KEYS = {
  list: (category: FeedCategory = "ALL") =>
    ["community", "ssr-feed", category, FEED_PAGE_SIZE] as const,
};
