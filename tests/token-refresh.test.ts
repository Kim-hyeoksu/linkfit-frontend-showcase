import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  api,
  subscribeTokenRefresh,
  onRefreshed,
  _resetInterceptorState,
} from "@/shared/api/axios";
import { setAccessToken, getAccessToken, clearAuth } from "@/shared/api/tokenStore";

describe("[Token Refresh Mutex & Concurrency]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetInterceptorState();
    clearAuth();
    setAccessToken("expired_old_token");
  });

  it("구독자 큐(Subscriber Queue)는 토큰 갱신 시 대기 중인 모든 요청에 새 토큰을 전달해야 한다", () => {
    const subscriberResults: string[] = [];

    // 동시 대기 요청 3개 등록
    subscribeTokenRefresh((newToken) => subscriberResults.push(`Req 1: ${newToken}`));
    subscribeTokenRefresh((newToken) => subscriberResults.push(`Req 2: ${newToken}`));
    subscribeTokenRefresh((newToken) => subscriberResults.push(`Req 3: ${newToken}`));

    // 토큰 갱신 완료 이벤트 발화
    onRefreshed("new_fresh_token_999");

    expect(subscriberResults).toEqual([
      "Req 1: new_fresh_token_999",
      "Req 2: new_fresh_token_999",
      "Req 3: new_fresh_token_999",
    ]);
  });

  it("동시 401 에러 수신 시 Mutex 락을 통해 Refresh API를 단 1회만 호출하고 상태를 갱신해야 한다", async () => {
    let refreshCallCount = 0;

    // axios.post mock (refresh API 응답)
    const postSpy = vi.spyOn(axios, "post").mockImplementation(async (url) => {
      if (url === "/api/auth/refresh") {
        refreshCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { data: { accessToken: "new_fresh_token_12345" } };
      }
      return { data: {} };
    });

    // 401 에러 객체 생성 (adapter mock을 주입하여 네트워크 실제 연결 방지)
    const mockAdapter = vi.fn().mockResolvedValue({ data: "success", status: 200 });
    const create401Error = () => ({
      response: { status: 401 },
      config: { adapter: mockAdapter, headers: {}, _retry: false },
    });

    const rejectedHandler = (api.interceptors.response as any).handlers[0].rejected;

    // 5개의 요청이 동시에 401을 만나 인터셉터 진입
    const requests = [
      rejectedHandler(create401Error()),
      rejectedHandler(create401Error()),
      rejectedHandler(create401Error()),
      rejectedHandler(create401Error()),
      rejectedHandler(create401Error()),
    ];

    const results = await Promise.all(requests);

    expect(refreshCallCount).toBe(1);
    expect(getAccessToken()).toBe("new_fresh_token_12345");
    expect(results.length).toBe(5);

    postSpy.mockRestore();
  });
});
