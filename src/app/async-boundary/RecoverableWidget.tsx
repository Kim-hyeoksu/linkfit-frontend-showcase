"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

export default function RecoverableWidget() {
  const { data } = useSuspenseQuery({
    queryKey: ["demo", "recoverable-widget"],
    queryFn: async () => {
      const response = await fetch("/api/demo/widget", { cache: "no-store", method: "POST" });
      if (!response.ok) throw new Error("첫 요청 실패를 재현했습니다.");
      return await response.json() as { message: string };
    },
  });
  return <p className="success">{data.message}</p>;
}
