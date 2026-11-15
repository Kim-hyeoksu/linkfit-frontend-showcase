import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@/entities/user/model/types";
import { ServerApiError, serverApiFetch } from "@/shared/api/server";

export async function getServerSession() {
  const refreshToken = (await cookies()).get("refreshToken")?.value;
  if (!refreshToken) redirect("/login");

  try {
    const token = await serverApiFetch<{ accessToken: string }>(
      "/api/auth/refresh",
      { refreshToken, method: "POST" },
    );
    if (typeof token?.accessToken !== "string" || !token.accessToken) throw new ServerApiError(502);

    const user = await serverApiFetch<User>("/api/users/me", {
      accessToken: token.accessToken,
    });
    if (!user || typeof user.id !== "number") throw new ServerApiError(502);
    if (!user.gender || !user.birthDate || !user.exerciseLevel) {
      redirect("/onboarding?mode=signup");
    }

    return { user, accessToken: token.accessToken };
  } catch (error) {
    if (error instanceof ServerApiError && [401, 403].includes(error.status)) {
      redirect("/login");
    }
    throw error;
  }
}
