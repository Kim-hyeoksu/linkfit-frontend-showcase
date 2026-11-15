import { NextRequest } from "next/server";

async function forward(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const backend = process.env.API_SERVER_URL;
  if (!backend || !["/api/auth/refresh", "/api/posts"].includes(pathname)) {
    return Response.json({ message: "공개 예제에서 제공하지 않는 API입니다." }, { status: 404 });
  }
  const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
  for (const name of ["cookie", "authorization"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(new URL(pathname + request.nextUrl.search, backend), {
      method: request.method, headers,
      body: request.method === "POST" ? "{}" : undefined,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "모의 API에 연결하지 못했습니다." }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
