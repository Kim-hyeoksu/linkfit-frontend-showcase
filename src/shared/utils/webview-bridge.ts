// linkfit-frontend-showcase/src/shared/utils/webview-bridge.ts

/**
 * @name WebViewBridge
 * @description React Native WebView와 Next.js 간의 타입 안전한 양방향 통신(Request-Response with Timeout)
 * 및 네이티브 푸시 이벤트 구독(Event Stream)을 제공하는 하이브리드 브릿지 코어 엔진입니다.
 */

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    onReceiveImagePickerResult?: (
      base64Data: string,
      fileName?: string,
      mimeType?: string,
    ) => void;
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

// ============================================================================
// 1. 브릿지 프로토콜 타입 계약 (Type Contract)
// ============================================================================

export interface LiveActivityStartParams {
  exerciseName: string;
  totalSets: number;
  currentSet: number;
  currentReps: number;
  currentWeight: number;
  totalTime: number;
  planTotalSets: number;
  planCompletedSets: number;
}

export interface LiveActivityUpdateParams {
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
}

export interface BridgeProtocol {
  PICK_IMAGE: {
    request: void;
    response: { uri: string; fileName?: string; fileBlob?: Blob };
  };
  MODAL_STATE: {
    request: { isOpen: boolean };
    response: void;
  };
  LIVE_ACTIVITY_START: {
    request: { data: LiveActivityStartParams };
    response: void;
  };
  LIVE_ACTIVITY_UPDATE: {
    request: { data: Partial<LiveActivityUpdateParams> };
    response: void;
  };
  LIVE_ACTIVITY_END: {
    request: void;
    response: void;
  };
  ANDROID_FOREGROUND_SERVICE_START: {
    request: { data: LiveActivityStartParams };
    response: void;
  };
  ANDROID_FOREGROUND_SERVICE_UPDATE: {
    request: { data: Partial<LiveActivityUpdateParams> };
    response: void;
  };
  ANDROID_FOREGROUND_SERVICE_END: {
    request: void;
    response: void;
  };
  NOTIFICATION_SCHEDULE: {
    request: { seconds: number; title: string; body: string };
    response: void;
  };
  NOTIFICATION_CANCEL: {
    request: void;
    response: void;
  };
  ANDROID_VIBRATE: {
    request: { pattern: number[] };
    response: void;
  };
  NAVIGATE_TO_DIET_SEARCH: {
    request: { mealType?: string };
    response: void;
  };
  DRAG_START: {
    request: void;
    response: void;
  };
  DRAG_END: {
    request: void;
    response: void;
  };
  SCROLL_POSITION: {
    request: { isAtTop: boolean };
    response: void;
  };
}

export interface NativeEventProtocol {
  MATCHING_REQUEST_MODAL: { url: string };
  FCM_TOKEN: { token: string; deviceType?: string };
  FCM_TOKEN_RECEIVED: { token: string; deviceType: string };
  NOTIFICATION_CLICK: { link?: string; deepLink?: string; url?: string };
  NAVIGATE: { link?: string; deepLink?: string; url?: string };
  "image-selected": { uri: string };
  "widget-action": { action: string };
  MODAL_STATE: { isOpen: boolean };
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: ReturnType<typeof setTimeout>;
  type: string;
}

// ============================================================================
// 2. Type-Safe WebViewBridge 코어 클래스
// ============================================================================

export class WebViewBridge {
  private pendingRequests = new Map<string, PendingRequest>();
  private eventListeners = new Map<string, Set<(payload: any) => void>>();
  private isInitialized = false;

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    if (typeof window === "undefined" || this.isInitialized) return;
    this.isInitialized = true;

    const handleMessage = (event: MessageEvent) => {
      try {
        const rawData =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (!rawData || typeof rawData !== "object") return;

        const { type, requestId, payload } = rawData;

        // 1. requestId 기반 양방향 Promise 응답 매칭
        if (requestId && this.pendingRequests.has(requestId)) {
          const pending = this.pendingRequests.get(requestId)!;
          clearTimeout(pending.timer);
          this.pendingRequests.delete(requestId);
          pending.resolve(payload ?? rawData);
          return;
        }

        // 2. 레거시 하이브리드 앱 호환 매핑
        if (type === "image-selected" || rawData.uri) {
          for (const [id, pending] of this.pendingRequests.entries()) {
            if (pending.type === "PICK_IMAGE") {
              clearTimeout(pending.timer);
              this.pendingRequests.delete(id);
              pending.resolve({ uri: rawData.uri });
              return;
            }
          }
        }

        // 3. 네이티브 푸시 이벤트 리스너 브로드캐스트
        if (type && this.eventListeners.has(type)) {
          const listeners = this.eventListeners.get(type)!;
          listeners.forEach((callback) => {
            try {
              callback(payload ?? rawData);
            } catch (err) {
              console.error(`[WebView Bridge] Error in listener for ${type}:`, err);
            }
          });
        }
      } catch {
        // non-JSON ignore
      }
    };

    window.addEventListener("message", handleMessage);
    if (typeof document !== "undefined") {
      document.addEventListener("message" as any, handleMessage);
    }

    window.onReceiveImagePickerResult = (base64Data, fileName) => {
      for (const [id, pending] of this.pendingRequests.entries()) {
        if (pending.type === "PICK_IMAGE") {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(id);
          pending.resolve({
            uri: base64Data,
            fileName: fileName || `profile_${Date.now()}.jpg`,
          });
          return;
        }
      }
    };
  }

  public isAvailable(): boolean {
    return (
      typeof window !== "undefined" &&
      !!window.ReactNativeWebView &&
      typeof window.ReactNativeWebView.postMessage === "function"
    );
  }

  public send<K extends keyof BridgeProtocol>(
    type: K,
    data?: BridgeProtocol[K]["request"],
  ): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    const platform = getMobilePlatform();
    const payload = data ? { ...data } : {};
    const message = JSON.stringify({ type, platform, ...payload });

    window.ReactNativeWebView!.postMessage(message);
    return true;
  }

  public request<K extends keyof BridgeProtocol>(
    type: K,
    data?: BridgeProtocol[K]["request"],
    timeoutMs: number = 15000,
  ): Promise<BridgeProtocol[K]["response"]> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(
          new Error(
            `[WebView Bridge] Native Bridge is not available for request '${type}'`,
          ),
        );
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const platform = getMobilePlatform();

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(
            new Error(
              `[WebView Bridge] Request '${type}' timed out after ${timeoutMs}ms`,
            ),
          );
        }
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timer,
        type,
      });

      const payload = data ? { ...data } : {};
      const message = JSON.stringify({
        type,
        requestId,
        platform,
        ...payload,
      });

      window.ReactNativeWebView!.postMessage(message);
    });
  }

  public on<K extends keyof NativeEventProtocol>(
    type: K,
    callback: (payload: NativeEventProtocol[K]) => void,
  ): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    const listeners = this.eventListeners.get(type)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(type);
      }
    };
  }
}

export const bridge = new WebViewBridge();

export const postMessageToNative = (type: string, data?: any) => {
  return bridge.send(type as any, data);
};

export const liveActivityBridge = {
  start: (params: LiveActivityStartParams) => {
    const platform = getMobilePlatform();
    const type =
      platform === "android"
        ? "ANDROID_FOREGROUND_SERVICE_START"
        : "LIVE_ACTIVITY_START";
    return bridge.send(type, { data: params });
  },

  update: (params: Partial<LiveActivityUpdateParams>) => {
    const platform = getMobilePlatform();
    const type =
      platform === "android"
        ? "ANDROID_FOREGROUND_SERVICE_UPDATE"
        : "LIVE_ACTIVITY_UPDATE";
    return bridge.send(type, { data: params });
  },

  end: () => {
    const platform = getMobilePlatform();
    const type =
      platform === "android"
        ? "ANDROID_FOREGROUND_SERVICE_END"
        : "LIVE_ACTIVITY_END";
    return bridge.send(type);
  },

  scheduleNotification: (seconds: number, title: string, body: string) => {
    return bridge.send("NOTIFICATION_SCHEDULE", {
      seconds,
      title,
      body,
    });
  },

  cancelNotification: () => {
    return bridge.send("NOTIFICATION_CANCEL");
  },

  setModalState: (isOpen: boolean) => {
    return bridge.send("MODAL_STATE", { isOpen });
  },
};

export const androidBridge = {
  vibrate: (pattern: number[] = [0, 100]) => {
    return bridge.send("ANDROID_VIBRATE", { pattern });
  },
};
