import "server-only";
import { serverApiFetch, ServerApiError } from "@/shared/api/server";
import type { FeedPage } from "./feedTypes";
import { FEED_PAGE_SIZE } from "./feedConfig";

export async function getServerFeed(accessToken: string) {
  const query = new URLSearchParams({ page: "0", size: String(FEED_PAGE_SIZE), sort: "createdAt,desc" });
  const page = await serverApiFetch<FeedPage>(`/api/posts?${query}`, { accessToken });
  if (!page || !Array.isArray(page.content) || !Number.isInteger(page.number) || typeof page.last !== "boolean") {
    throw new ServerApiError(502);
  }
  return page;
}
