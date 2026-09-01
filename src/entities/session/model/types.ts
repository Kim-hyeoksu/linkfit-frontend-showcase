export interface LocalSessionExercise {
  sessionExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  sets: {
    id: number;
    setOrder: number;
    weight: number;
    reps: number;
    status: "PENDING" | "COMPLETED";
    completedAt: string | null;
  }[];
}

export interface LocalSessionData {
  sessionId: number;
  planId?: number;
  title: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startTime: string;
  totalTimeMs: number;
  exercises: LocalSessionExercise[];
  isSynced?: boolean;
}

export interface PendingSync {
  id: string;
  sessionData: LocalSessionData;
  createdAt: string;
  retryCount: number;
}

export interface SyncQueueState {
  pending: PendingSync[];
}
