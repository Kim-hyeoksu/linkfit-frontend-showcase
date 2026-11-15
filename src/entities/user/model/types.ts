export interface User {
  id: number;
  name: string;
  gender: "MALE" | "FEMALE" | null;
  birthDate: string | null;
  exerciseLevel: "LOW" | "MIDDLE" | "HIGH" | null;
}
