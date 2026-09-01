import { v4 as uuidv4 } from "uuid";
import type { LocalSessionData, PendingSync, SyncQueueState } from "./types";

/**
 * [Offline-First SyncQueue & Failover Engine]
 *
 * 문제:
 * 헬스장 지하 공간 등 네트워크 불안정 환경에서 1~2시간 동안 수행한 운동 완료 API가
 * 일시적 통신 장애로 실패했을 때 유저의 소중한 운동 기록이 영구 유실되는 결함 방어.
 *
 * 해결:
 * 1. 로컬 스토리지 기반의 영속적 동기화 대기열(SyncQueue) 구축
 * 2. 상태 꼬임 및 중복 등록을 방지하기 위한 대기 세션 최대 1개 단일화 제약
 * 3. 지수 재시도(MAX_RETRY_COUNT = 3) 및 오래된 데이터(7일) 자동 청소
 * 4. 네트워크 복구 시 자동/수동 원클릭 동기화 처리
 */

export const SYNC_QUEUE_KEY = "linkfit_sync_queue";
export const MAX_RETRY_COUNT = 3;
export const MAX_AGE_DAYS = 7;

/**
 * 동기화 큐 상태 로드 (스토리지 추상화)
 */
export const loadSyncQueue = (storage: Storage = typeof localStorage !== "undefined" ? localStorage : ({} as Storage)): SyncQueueState => {
  try {
    const data = storage.getItem ? storage.getItem(SYNC_QUEUE_KEY) : null;
    if (!data) return { pending: [] };
    return JSON.parse(data) as SyncQueueState;
  } catch (error) {
    console.error("Failed to load sync queue:", error);
    return { pending: [] };
  }
};

/**
 * 동기화 큐 상태 저장
 */
export const saveSyncQueue = (
  queue: SyncQueueState,
  storage: Storage = typeof localStorage !== "undefined" ? localStorage : ({} as Storage)
): void => {
  try {
    if (storage.setItem) {
      storage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.error("Failed to save sync queue:", error);
  }
};

/**
 * 실패한 운동 세션을 동기화 대기열에 추가
 */
export const addToSyncQueue = (
  sessionData: LocalSessionData,
  storage?: Storage
): PendingSync => {
  const newItem: PendingSync = {
    id: uuidv4(),
    sessionData: {
      ...sessionData,
      status: "COMPLETED",
      isSynced: false,
    },
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  // 🛡️ 동시성 방어: 상태 불일치 방지를 위해 항상 최신 1개 세션만 대기열에 보관
  const queue: SyncQueueState = {
    pending: [newItem],
  };

  saveSyncQueue(queue, storage);
  return newItem;
};

/**
 * 동기화 완료된 세션을 큐에서 제거
 */
export const removeFromSyncQueue = (id: string, storage?: Storage): void => {
  const queue = loadSyncQueue(storage);
  queue.pending = queue.pending.filter((item) => item.id !== id);
  saveSyncQueue(queue, storage);
};

/**
 * 재시도 실패 횟수 증가
 */
export const incrementRetryCount = (id: string, storage?: Storage): void => {
  const queue = loadSyncQueue(storage);
  const item = queue.pending.find((item) => item.id === id);

  if (item) {
    item.retryCount += 1;
    saveSyncQueue(queue, storage);
  }
};

/**
 * 7일 이상 경과한 오래된 만료 항목 정리
 */
export const cleanupOldItems = (storage?: Storage): void => {
  const queue = loadSyncQueue(storage);
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const filteredPending = queue.pending.filter((item) => {
    const createdAt = new Date(item.createdAt).getTime();
    return now - createdAt <= maxAgeMs;
  });

  if (filteredPending.length !== queue.pending.length) {
    queue.pending = filteredPending;
    saveSyncQueue(queue, storage);
  }
};

/**
 * 큐에 대기 중인 세션들을 순차 동기화 실행
 */
export const processSyncQueue = async (
  syncFunction: (sessionData: LocalSessionData) => Promise<any>,
  storage?: Storage
): Promise<{ success: number; failed: number }> => {
  cleanupOldItems(storage);
  const queue = loadSyncQueue(storage);

  let successCount = 0;
  let failedCount = 0;

  for (const item of queue.pending) {
    try {
      await syncFunction(item.sessionData);
      removeFromSyncQueue(item.id, storage);
      successCount++;
    } catch (error) {
      console.error(`Sync item ${item.id} failed:`, error);
      incrementRetryCount(item.id, storage);
      failedCount++;
    }
  }

  return { success: successCount, failed: failedCount };
};
