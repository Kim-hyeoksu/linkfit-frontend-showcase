/**
 * 커뮤니티 게시글 모델 인터페이스
 */
export interface CommunityPost {
  id: number;
  title: string;
  content: string;
  author: string;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

/**
 * 게시글 상세 데이터 구조
 */
export interface PostDetail extends CommunityPost {
  images?: string[];
}

/**
 * 무한 스크롤 목록 페이지 데이터 구조
 */
export interface PostsPage {
  content: CommunityPost[];
  pageNumber: number;
  pageSize: number;
  isLast: boolean;
}

/**
 * TanStack Query useInfiniteQuery 캐시 구조
 */
export interface InfinitePostsData {
  pages: PostsPage[];
  pageParams: number[];
}

/**
 * 낙관적 업데이트 롤백용 컨텍스트 스냅샷
 */
export interface OptimisticLikeContext {
  previousDetail?: PostDetail;
  previousPosts?: [readonly unknown[], unknown][];
}
