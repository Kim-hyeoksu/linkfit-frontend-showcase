import { afterEach, describe, expect, it, vi } from "vitest";
import { serverApiFetch } from "@/shared/api/server";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("서버 전용 API 요청", () => {
  it("사용자별 요청을 캐시하지 않고 필요한 인증 헤더만 전달", async () => {
    vi.stubEnv("API_SERVER_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ content: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await serverApiFetch("/api/posts", { accessToken: "test-access" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://backend.test/api/posts");
    expect(options.cache).toBe("no-store");
    expect(options.redirect).toBe("error");
    expect(options.headers.get("Authorization")).toBe("Bearer test-access");
    expect(options.headers.has("Cookie")).toBe(false);
  });

  it("토큰 갱신 요청에 Refresh Token 쿠키 전달", async () => {
    vi.stubEnv("API_SERVER_URL", "http://backend.test");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ accessToken: "new" }));
    vi.stubGlobal("fetch", fetchMock);
    await serverApiFetch("/api/auth/refresh", { refreshToken: "refresh-value", method: "POST" });
    expect(fetchMock.mock.calls[0][1].headers.get("Cookie")).toBe("refreshToken=refresh-value");
  });

  it("백엔드 오류 본문과 인증 정보를 오류 메시지에 포함하지 않음", async () => {
    vi.stubEnv("API_SERVER_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-details", { status: 401 })));
    await expect(serverApiFetch("/api/posts")).rejects.toMatchObject({ status: 401, message: "서버 요청을 처리하지 못했습니다." });
  });

  it("연결 실패와 잘못된 JSON을 구분", async () => {
    vi.stubEnv("API_SERVER_URL", "http://backend.test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection")));
    await expect(serverApiFetch("/api/posts")).rejects.toMatchObject({ status: 503 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid-json")));
    await expect(serverApiFetch("/api/posts")).rejects.toMatchObject({ status: 502 });
  });
});
