export type FeedCategory = "ALL" | "WORKOUT" | "FREE";

export interface FeedPost {
  id: number;
  content: string;
  author: { id: number; name: string };
  category: Exclude<FeedCategory, "ALL">;
  createdAt: string;
}

export interface FeedPage {
  content: FeedPost[];
  number: number;
  last: boolean;
}
