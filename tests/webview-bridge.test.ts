import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  bridge,
  postMessageToNative,
  liveActivityBridge,
} from "@/shared/utils/webview-bridge";

describe("[Hybrid WebView Bridge - Type-Safe Two-Way Protocol]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ReactNativeWebView가 없을 때는 false를 반환하고 에러를 내지 않는다", () => {
    (global as any).window = {};
    const result = postMessageToNative("TEST_MESSAGE");
    expect(result).toBe(false);
  });

  it("Live Activity Start 호출 시 올바른 타입과 데이터가 postMessage로 전송된다", () => {
    const postMessageMock = vi.fn();
    (global as any).window = {
      ReactNativeWebView: {
        postMessage: postMessageMock,
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    liveActivityBridge.start({
      exerciseName: "벤치프레스",
      totalSets: 5,
      currentSet: 1,
      currentReps: 10,
      currentWeight: 80,
      totalTime: 120,
      planTotalSets: 20,
      planCompletedSets: 0,
    });

    expect(postMessageMock).toHaveBeenCalledTimes(1);
    const sentData = JSON.parse(postMessageMock.mock.calls[0][0]);
    expect(sentData.type).toBe("LIVE_ACTIVITY_START");
    expect(sentData.data.exerciseName).toBe("벤치프레스");
  });

  it("bridge.request 호출 시 고유 requestId가 발급되고, 네이티브 응답 수신 시 Promise가 resolve된다", async () => {
    let messageListener: ((event: any) => void) | null = null;

    const postMessageMock = vi.fn((rawMsg: string) => {
      const parsed = JSON.parse(rawMsg);
      // 네이티브 응답 시뮬레이션
      setTimeout(() => {
        if (messageListener) {
          messageListener({
            data: JSON.stringify({
              type: "PICK_IMAGE_RESULT",
              requestId: parsed.requestId,
              payload: { uri: "https://s3.example.com/profile.jpg" },
            }),
          });
        }
      }, 10);
    });

    (global as any).window = {
      ReactNativeWebView: {
        postMessage: postMessageMock,
      },
      addEventListener: vi.fn((event: string, cb: any) => {
        if (event === "message") messageListener = cb;
      }),
      removeEventListener: vi.fn(),
    };

    // 새 브릿지 인스턴스 테스트
    const { WebViewBridge } = await import("@/shared/utils/webview-bridge");
    const testBridge = new WebViewBridge();

    const response = await testBridge.request("PICK_IMAGE");

    expect(postMessageMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(postMessageMock.mock.calls[0][0]);
    expect(sent.type).toBe("PICK_IMAGE");
    expect(sent.requestId).toBeDefined();
    expect(response.uri).toBe("https://s3.example.com/profile.jpg");
  });

  it("네이티브 응답이 지연되면 timeoutMs 후 Promise가 reject된다", async () => {
    vi.useFakeTimers();

    const postMessageMock = vi.fn();
    (global as any).window = {
      ReactNativeWebView: {
        postMessage: postMessageMock,
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const { WebViewBridge } = await import("@/shared/utils/webview-bridge");
    const testBridge = new WebViewBridge();

    const requestPromise = testBridge.request("PICK_IMAGE", undefined, 3000);

    // 3001ms 시간 경과 트리거
    vi.advanceTimersByTime(3001);

    await expect(requestPromise).rejects.toThrow(
      "[WebView Bridge] Request 'PICK_IMAGE' timed out after 3000ms",
    );
  });

  it("bridge.on 이벤트 구독 시 네이티브 푸시 이벤트가 전달되고, 클린업 함수 호출 시 구독 해제된다", async () => {
    let messageListener: ((event: any) => void) | null = null;

    (global as any).window = {
      ReactNativeWebView: {
        postMessage: vi.fn(),
      },
      addEventListener: vi.fn((event: string, cb: any) => {
        if (event === "message") messageListener = cb;
      }),
      removeEventListener: vi.fn(),
    };

    const { WebViewBridge } = await import("@/shared/utils/webview-bridge");
    const testBridge = new WebViewBridge();

    const mockCallback = vi.fn();
    const unsubscribe = testBridge.on("MATCHING_REQUEST_MODAL", mockCallback);

    // 이벤트 발화
    messageListener!({
      data: JSON.stringify({
        type: "MATCHING_REQUEST_MODAL",
        payload: { url: "/pt/matching?id=123" },
      }),
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ url: "/pt/matching?id=123" });

    // 구독 해제
    unsubscribe();

    messageListener!({
      data: JSON.stringify({
        type: "MATCHING_REQUEST_MODAL",
        payload: { url: "/pt/matching?id=456" },
      }),
    });

    // 해제되었으므로 호출 횟수가 늘지 않아야 함
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
