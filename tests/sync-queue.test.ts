import { describe, it, expect, beforeEach } from "vitest";
import {
  addToSyncQueue,
  loadSyncQueue,
  processSyncQueue,
  cleanupOldItems,
  removeFromSyncQueue,
  SYNC_QUEUE_KEY,
} from "@/entities/session/model/syncQueue";
import type { LocalSessionData } from "@/entities/session/model/types";

// In-memory Storage Mock
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] || null; }
  key(index: number) { return Object.keys(this.store)[index] || null; }
  removeItem(key: string) { delete this.store[key]; }
  setItem(key: string, value: string) { this.store[key] = value; }
}

describe("[Offline SyncQueue & Resilience]", () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  const sampleSession: LocalSessionData = {
    sessionId: 101,
    title: "하체 폭격 루틴",
    status: "IN_PROGRESS",
    startTime: new Date().toISOString(),
    totalTimeMs: 3600000,
    exercises: [
      {
        sessionExerciseId: 1,
        exerciseId: 10,
        exerciseName: "스쿼트",
        sets: [
          {
            id: 1,
            setOrder: 1,
            weight: 100,
            reps: 10,
            status: "COMPLETED",
            completedAt: new Date().toISOString(),
          },
        ],
      },
    ],
  };

  it("세션 실패 시 큐에 적재되며, 대기 항목은 동시성 꼬임 방지를 위해 항상 최신 1개만 유지된다", () => {
    addToSyncQueue(sampleSession, mockStorage);
    addToSyncQueue({ ...sampleSession, sessionId: 102, title: "가슴 루틴" }, mockStorage);

    const queue = loadSyncQueue(mockStorage);
    expect(queue.pending.length).toBe(1);
    expect(queue.pending[0].sessionData.sessionId).toBe(102);
    expect(queue.pending[0].sessionData.status).toBe("COMPLETED");
  });

  it("동기화 함수 성공 시 큐에서 해당 세션이 안전하게 제거된다", async () => {
    const item = addToSyncQueue(sampleSession, mockStorage);
    expect(loadSyncQueue(mockStorage).pending.length).toBe(1);

    const mockSyncFn = async (data: LocalSessionData) => {
      return { success: true, id: data.sessionId };
    };

    const result = await processSyncQueue(mockSyncFn, mockStorage);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(loadSyncQueue(mockStorage).pending.length).toBe(0);
  });

  it("동기화 실패 시 재시도 횟수(retryCount)가 증가하고 큐에 보존된다", async () => {
    const item = addToSyncQueue(sampleSession, mockStorage);

    const failingSyncFn = async () => {
      throw new Error("Network Error");
    };

    const result = await processSyncQueue(failingSyncFn, mockStorage);
    expect(result.failed).toBe(1);

    const queue = loadSyncQueue(mockStorage);
    expect(queue.pending.length).toBe(1);
    expect(queue.pending[0].retryCount).toBe(1);
  });
});
