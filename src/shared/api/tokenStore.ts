/**
 * [Security Architecture]
 * XSS 공격으로부터 토큰을 안전하게 보호하기 위해
 * Access Token은 로컬 스토리지가 아닌 클라이언트 인메모리 클로저 변수에 보관합니다.
 * Refresh Token은 httpOnly 쿠키를 통해 브라우저가 자동 관리합니다.
 */

let accessToken: string | null = null;

/**
 * 메모리에 저장된 현재 Access Token을 반환합니다.
 */
export const getAccessToken = (): string | null => {
  return accessToken;
};

/**
 * 신규 발급된 Access Token을 메모리에 갱신합니다.
 */
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

/**
 * 로그아웃 또는 세션 만료 시 메모리 내 인증 정보를 초기화합니다.
 */
export const clearAuth = (): void => {
  accessToken = null;
};
