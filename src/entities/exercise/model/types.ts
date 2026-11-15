export interface ClientSet {
  id: number;
  sessionExerciseId: number;
  setOrder: number;
  weight: number;
  reps: number;
  status: "PENDING" | "COMPLETED";
}

export interface ClientExercise {
  sessionExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  bodyPart: string;
  orderIndex: number;
  sets: ClientSet[];
}

export interface SetRecord {
  setOrder: number;
  targetReps: number;
  targetWeight: number;
  actualReps: number;
  actualWeight: number;
  rpe?: number;
  status: "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
}

export interface ExerciseHistoryResponse {
  sessionDate: string;
  sessionId: number;
  planTitle: string;
  programName: string | null;
  calculated1Rm: number;
  totalVolume: number;
  sets: SetRecord[];
}
