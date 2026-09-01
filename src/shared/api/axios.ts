import axios, { AxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken, clearAuth } from "./tokenStore";

/**
 * [Concurrency & Mutex Token Refresh Engine]
 *
 * 문제:
 * 화면 진입 시 5~10개의 API가 동시에 호출되어 일제히 401 Unauthorized를 수신할 때,
 * Refresh API를 중복 호출(Race Condition)하여 토큰이 꼬이고 사용자가 강제 로그아웃되는 결함 방어.
 *
 * 해결:
 * Mutex 불리언 락(isRefreshing)과 발행-구독(Subscriber) 큐 패턴을 결합하여,
 * 최초 1개 요청만 /refresh를 실행하고 나머지 요청은 큐에 대기(Promise Pending).
 * 갱신 성공 즉시 새 토큰으로 대기 중이던 모든 요청을 일괄 자동 재시도(Transparent Retry).
 */

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  withCredentials: true, // httpOnly Refresh Token 쿠키 자동 전송
});

// 요청 인터셉터: 메모리에서 Access Token 주입
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터 상태 관리
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * 토큰 갱신 완료 시 대기 중인 요청들에게 새 토큰을 전달하는 구독 등록
 */
export const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

/**
 * 갱신된 새 토큰을 모든 대기 중인 구독자들에게 브로드캐스트하고 큐를 비웁니다.
 */
export const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * 테스트 및 내부 상태 초기화용 헬퍼 함수
 */
export const _resetInterceptorState = () => {
  isRefreshing = false;
  refreshSubscribers = [];
};

// 응답 인터셉터: 401 Concurrency Mutex 핸들러
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // 401 에러이며 아직 재시도하지 않은 요청인 경우
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // 🔒 1. 아직 리프레시가 진행 중이지 않은 경우: Mutex 락 획득 후 최초 1회만 리프레시 실행
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          // httpOnly 쿠키 기반 토큰 갱신 요청
          const refreshResponse = await axios.post<{ accessToken: string }>(
            "/api/auth/refresh",
            {},
            { withCredentials: true }
          );

          const newAccessToken = refreshResponse.data?.accessToken;

          if (newAccessToken) {
            setAccessToken(newAccessToken);
            isRefreshing = false;
            onRefreshed(newAccessToken);

            // 최초 실패 요청 재실행
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${newAccessToken}`,
            };
            return api(originalRequest);
          } else {
            throw new Error("No access token returned in refresh response");
          }
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = [];
          clearAuth();

          if (typeof window !== "undefined") {
            const currentPath = window.location.pathname;
            if (currentPath !== "/login") {
              window.location.href = "/login";
            }
          }
          return Promise.reject(refreshError);
        }
      }

      // ⏳ 2. 이미 다른 요청에 의해 리프레시가 진행 중인 경우: 큐에 콜백을 등록하고 Promise 대기
      return new Promise((resolve) => {
        subscribeTokenRefresh((token: string) => {
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${token}`,
          };
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);
