import { useEffect } from "react";
import { postMessageToNative } from "../utils/webview-bridge";

/**
 * [Event-Driven Gesture Conflict Neutralization]
 *
 * 문제:
 * 운동 세션, 드래그 목록, 모달 등 인터랙션이 많은 화면에서
 * 네이티브의 당겨서 새로고침(Pull-to-Refresh)과 웹 제스처가 충돌하여 화면이 출렁이는 현상.
 *
 * 해결:
 * 해당 화면 마운트 시 Event-Driven 방식으로 네이티브 RefreshControl을 무력화하고,
 * 언마운트 시 자동으로 정상 복구하는 선언적 커스텀 훅.
 */
export const useDisablePullToRefresh = () => {
  useEffect(() => {
    // 1) 모달 오픈 상태 신호로 네이티브 RefreshControl 차단
    postMessageToNative("MODAL_STATE", { isOpen: true });
    // 2) 스크롤 최상단에서도 새로고침이 트리거되지 않도록 좌표 신호 전송
    postMessageToNative("SCROLL_POSITION", { isAtTop: false });

    return () => {
      postMessageToNative("MODAL_STATE", { isOpen: false });
      postMessageToNative("SCROLL_POSITION", { isAtTop: true });
    };
  }, []);
};
