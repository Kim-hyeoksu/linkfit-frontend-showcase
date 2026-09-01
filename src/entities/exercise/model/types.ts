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
