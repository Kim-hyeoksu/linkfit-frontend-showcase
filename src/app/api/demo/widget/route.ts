import { NextRequest, NextResponse } from "next/server";

export function POST(request: NextRequest) {
  const hasFailed = request.cookies.get("demo-widget-retry")?.value === "ready";
  const response = NextResponse.json(
    { message: hasFailed ? "새로고침 없이 위젯을 복구했습니다." : "데모 실패" },
    { status: hasFailed ? 200 : 503 },
  );
  response.cookies.set("demo-widget-retry", hasFailed ? "" : "ready", { httpOnly: true, sameSite: "lax", path: "/", maxAge: hasFailed ? 0 : 300 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
