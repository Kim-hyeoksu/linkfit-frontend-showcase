import "server-only";

export class ServerApiError extends Error {
  constructor(public readonly status: number) {
    super("서버 요청을 처리하지 못했습니다.");
    this.name = "ServerApiError";
  }
}

type ServerRequestOptions = {
  accessToken?: string;
  refreshToken?: string;
  method?: "GET" | "POST";
};

export async function serverApiFetch<T>(
  path: string,
  { accessToken, refreshToken, method = "GET" }: ServerRequestOptions = {},
): Promise<T> {
  const baseUrl = process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) throw new ServerApiError(503);

  const headers = new Headers({ Accept: "application/json" });
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (refreshToken) {
    headers.set("Cookie", `refreshToken=${encodeURIComponent(refreshToken)}`);
  }
  if (method === "POST") headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method,
      headers,
      body: method === "POST" ? "{}" : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ServerApiError(503);
  }

  if (!response.ok) throw new ServerApiError(response.status);

  try {
    return (await response.json()) as T;
  } catch {
    throw new ServerApiError(502);
  }
}
