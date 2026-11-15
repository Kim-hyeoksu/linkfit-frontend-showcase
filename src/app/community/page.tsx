import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { getServerSession } from "@/features/auth/api/getServerSession";
import { CommunitySession } from "@/features/auth/ui/CommunitySession";
import { getServerFeed } from "@/entities/community/api/getFeed.server";
import { FEED_QUERY_KEYS } from "@/entities/community/api/feedConfig";
import { ServerApiError } from "@/shared/api/server";
import CommunityFeed from "./CommunityFeed";
import CommunityUnavailable from "./CommunityUnavailable";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  try {
    const { user, accessToken } = await getServerSession();
    const feed = await getServerFeed(accessToken);
    const client = new QueryClient();
    client.setQueryData(FEED_QUERY_KEYS.list(), { pages: [feed], pageParams: [0] });
    return <CommunitySession key={user.id} user={user}>
      <HydrationBoundary state={dehydrate(client)}><CommunityFeed viewerName={user.name} /></HydrationBoundary>
    </CommunitySession>;
  } catch (error) {
    if (!(error instanceof ServerApiError)) throw error;
    if (error.status === 401) redirect("/login");
    return <CommunityUnavailable />;
  }
}
