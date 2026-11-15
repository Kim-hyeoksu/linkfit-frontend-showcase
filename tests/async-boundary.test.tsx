// @vitest-environment jsdom
import React, { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AsyncBoundary } from "@/shared/ui/AsyncBoundary";

describe("AsyncBoundary", () => {
  let queryClient: QueryClient;

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    // 에러 바운더리 테스트 시 콘솔 에러 출력 억제
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("정상적인 비동기 요청 시 자식 컴포넌트의 내용을 렌더링한다", async () => {
    const TestComponent = () => {
      const { data } = useSuspenseQuery({
        queryKey: ["success-test"],
        queryFn: async () => "테스트 데이터 로드 성공",
      });
      return <div>{data}</div>;
    };

    render(
      <AsyncBoundary fallback={<div>로딩 중...</div>}>
        <TestComponent />
      </AsyncBoundary>,
      { wrapper }
    );

    expect(
      await screen.findByText("테스트 데이터 로드 성공")
    ).toBeDefined();
  });

  it("에러 발생 시 errorFallback을 렌더링하고, reset 호출 시 재시도한다", async () => {
    let shouldFail = true;

    const TestComponent = () => {
      const { data } = useSuspenseQuery({
        queryKey: ["error-test"],
        queryFn: async () => {
          if (shouldFail) {
            throw new Error("서버 에러 발생");
          }
          return "복구 완료";
        },
      });
      return <div>{data}</div>;
    };

    render(
      <AsyncBoundary
        fallback={<div>로딩 중...</div>}
        errorFallback={({ error, reset }) => (
          <div>
            <p>{error.message}</p>
            <button onClick={reset}>다시 시도</button>
          </div>
        )}
      >
        <TestComponent />
      </AsyncBoundary>,
      { wrapper }
    );

    expect(await screen.findByText("서버 에러 발생")).toBeDefined();

    // 에러 해제 후 '다시 시도' 클릭 -> Zero-Reload 리셋 동작 검증
    shouldFail = false;
    fireEvent.click(screen.getByText("다시 시도"));

    expect(await screen.findByText("복구 완료")).toBeDefined();
  });

  it("resetKeys가 변경되면 자동으로 에러 상태가 리셋된다", async () => {
    let shouldFail = true;

    const TestComponent = ({ id }: { id: number }) => {
      const { data } = useSuspenseQuery({
        queryKey: ["resetkey-test", id],
        queryFn: async () => {
          if (shouldFail && id === 1) {
            throw new Error("ID 1 에러 발생");
          }
          return `ID ${id} 데이터 로드`;
        },
      });
      return <div>{data}</div>;
    };

    const ParentComponent = () => {
      const [id, setId] = useState(1);

      return (
        <div>
          <button
            onClick={() => {
              shouldFail = false;
              setId(2);
            }}
          >
            ID 변경
          </button>
          <AsyncBoundary
            fallback={<div>로딩 중...</div>}
            errorFallback={({ error }) => <div>에러: {error.message}</div>}
            resetKeys={[id]}
          >
            <TestComponent id={id} />
          </AsyncBoundary>
        </div>
      );
    };

    render(<ParentComponent />, { wrapper });

    expect(await screen.findByText("에러: ID 1 에러 발생")).toBeDefined();

    fireEvent.click(screen.getByText("ID 변경"));

    expect(await screen.findByText("ID 2 데이터 로드")).toBeDefined();
  });
});
