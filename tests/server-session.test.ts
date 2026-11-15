import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerApiError } from "@/shared/api/server";
import { getServerSession } from "@/features/auth/api/getServerSession";

const mocks = vi.hoisted(() => ({ cookies: vi.fn(), request: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/shared/api/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/server")>()),
  serverApiFetch: mocks.request,
}));

beforeEach(() => {
  mocks.request.mockReset();
  mocks.cookies.mockResolvedValue({ get: () => ({ value: "fixture-refresh" }) });
});

describe("커뮤니티 서버 인증", () => {
  it("쿠키가 없으면 백엔드 호출 없이 로그인으로 이동", async () => {
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    await expect(getServerSession()).rejects.toThrow("redirect:/login");
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it.each([401, 403])("인증 만료 %i는 로그인으로 이동", async (status) => {
    mocks.request.mockRejectedValue(new ServerApiError(status));
    await expect(getServerSession()).rejects.toThrow("redirect:/login");
  });

  it("프로필 미완성은 온보딩으로 이동", async () => {
    mocks.request.mockResolvedValueOnce({ accessToken: "fixture-access" }).mockResolvedValueOnce({ id: 1, gender: null });
    await expect(getServerSession()).rejects.toThrow("redirect:/onboarding?mode=signup");
  });

  it("인증된 사용자와 토큰을 서버 호출에만 반환", async () => {
    const user = { id: 1, gender: "MALE", birthDate: "2000-01-01", exerciseLevel: "LOW" };
    mocks.request.mockResolvedValueOnce({ accessToken: "fixture-access" }).mockResolvedValueOnce(user);
    await expect(getServerSession()).resolves.toEqual({ user, accessToken: "fixture-access" });
    expect(mocks.request).toHaveBeenLastCalledWith("/api/users/me", { accessToken: "fixture-access" });
  });

  it("백엔드 장애를 로그아웃으로 오인하지 않음", async () => {
    mocks.request.mockRejectedValue(new ServerApiError(503));
    await expect(getServerSession()).rejects.toMatchObject({ status: 503 });
  });
});
