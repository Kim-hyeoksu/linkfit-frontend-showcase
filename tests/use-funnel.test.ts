import { describe, it, expect } from "vitest";

describe("[useFunnel Type Sanity]", () => {
  it("useFunnel 모듈이 정상적으로 export된다", async () => {
    const { useFunnel } = await import("@/shared/hooks");
    expect(useFunnel).toBeDefined();
    expect(typeof useFunnel).toBe("function");
  });
});
