import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const selected = request.nextUrl.searchParams.get("user") ?? "alice";
  const user = ["alice", "bob", "incomplete", "expired", "outage"].includes(selected) ? selected : "alice";
  const response = new NextResponse(null, { status: 303, headers: { Location: "/community" } });
  response.cookies.set("refreshToken", `demo-refresh-${user}`, { httpOnly: true, sameSite: "lax", path: "/" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
