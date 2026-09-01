import { describe, it, expect, vi, beforeEach } from "vitest";
import { postMessageToNative, liveActivityBridge } from "@/shared/utils/webview-bridge";

describe("[Hybrid WebView Bridge]", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
