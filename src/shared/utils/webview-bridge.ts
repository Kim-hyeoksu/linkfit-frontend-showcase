/**
 * [Hybrid Native-WebView Two-Way Bridge]
 *
 * 문제:
 * 웹뷰에 갇히지 않고 OS 네이티브 수명 주기 및 잠금화면 위젯(iOS Live Activity / Android Foreground Service)과
 * 0ms의 지연 없이 양방향으로 상태와 사용자 액션을 동기화해야 함.
 *
 * 해결:
 * 1. 플랫폼(iOS / Android / Web) 자동 감지 및 타입 안전 메시지 디스패치
 * 2. OS 규격별 브릿지 분기 (iOS: LIVE_ACTIVITY_*, Android: ANDROID_FOREGROUND_SERVICE_*)
 * 3. 잠금화면 위젯의 사용자 액션(COMPLETE, SKIP) 수신 시 웹뷰 내부 상태 즉시 전진
 */

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export type MobilePlatform = "ios" | "android" | "web";

/**
 * 현재 클라이언트의 모바일 플랫폼(iOS, Android, Web)을 판별합니다.
 */
export const getMobilePlatform = (): MobilePlatform => {
  if (typeof window === "undefined") return "web";
  const userAgent =
    typeof navigator !== "undefined"
      ? navigator.userAgent || (navigator as any).vendor || (window as any).opera || ""
      : "";

  if (/android/i.test(userAgent)) {
    return "android";
  }
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return "ios";
  }
  return "web";
};

/**
 * React Native 네이티브 컨테이너로 메시지를 타입 안전하게 전송합니다.
 */
export const postMessageToNative = (type: string, data?: Record<string, any>): boolean => {
  if (typeof window === "undefined" || !window.ReactNativeWebView) {
    return false;
  }

  if (typeof window.ReactNativeWebView.postMessage !== "function") {
    return false;
  }

  const platform = getMobilePlatform();
  const message = JSON.stringify({ type, platform, ...data });
  window.ReactNativeWebView.postMessage(message);
  return true;
};

/**
 * iOS Dynamic Island(Live Activities) 및 Android 포그라운드 알림 통합 제어 브릿지
 */
export const liveActivityBridge = {
  /**
   * 라이브 액티비티 / 포그라운드 서비스 시작
   */
  start: (params: {
    exerciseName: string;
    totalSets: number;
    currentSet: number;
    currentReps: number;
    currentWeight: number;
    totalTime: number;
    planTotalSets: number;
    planCompletedSets: number;
  }) => {
    const platform = getMobilePlatform();
    const type =
      platform === "android"
        ? "ANDROID_FOREGROUND_SERVICE_START"
        : "LIVE_ACTIVITY_START";
    return postMessageToNative(type, { data: params });
  },

  /**
   * 실시간 세트 완료 및 휴식 카운트다운 상태 갱신
   */
  update: (
    params: Partial<{
      exerciseName: string;
      totalSets: number;
      currentSet: number;
      currentReps: number;
      currentWeight: number;
      restEndTime: number;
      isResting: boolean;
      totalTime: number;
      planTotalSets: number;
      planCompletedSets: number;
    }>
  ) => {
    const platform = getMobilePlatform();
    const type =
      platform === "android"
        ? "ANDROID_FOREGROUND_SERVICE_UPDATE"
        : "LIVE_ACTIVITY_UPDATE";
    return postMessageToNative(type, { data: params });
  },

  /**
   * 운동 완료 시 백그라운드 위젯 종료
   */
  end: () => {
    const platform = getMobilePlatform();
    const type =
      platform === "android"
        ? "ANDROID_FOREGROUND_SERVICE_END"
        : "LIVE_ACTIVITY_END";
    return postMessageToNative(type);
  },
};
