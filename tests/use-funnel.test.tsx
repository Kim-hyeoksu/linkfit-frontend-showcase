import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useFunnel } from "@/shared/hooks";

describe("[useFunnel & Declarative State Machine]", () => {
  const TEST_STEPS = ["STEP_1", "STEP_2", "STEP_3"] as const;

  it("초기 스텝에 따라 해당 스텝 컴포넌트만 정확히 렌더링된다", () => {
    const TestFunnelComponent = () => {
      const [Funnel] = useFunnel(TEST_STEPS, { initialStep: "STEP_1" });

      return (
        <Funnel>
          <Funnel.Step name="STEP_1">
            <div data-testid="step-1">첫번째 스텝 내용</div>
          </Funnel.Step>
          <Funnel.Step name="STEP_2">
            <div data-testid="step-2">두번째 스텝 내용</div>
          </Funnel.Step>
          <Funnel.Step name="STEP_3">
            <div data-testid="step-3">세번째 스텝 내용</div>
          </Funnel.Step>
        </Funnel>
      );
    };

    const html = renderToStaticMarkup(<TestFunnelComponent />);

    // STEP_1 내용만 렌더링되고 나머지는 렌더링되지 않아야 함
    expect(html).toContain("첫번째 스텝 내용");
    expect(html).not.toContain("두번째 스텝 내용");
    expect(html).not.toContain("세번째 스텝 내용");
  });

  it("initialStep을 STEP_2로 지정하면 STEP_2만 선별 렌더링된다", () => {
    const TestFunnelComponent = () => {
      const [Funnel] = useFunnel(TEST_STEPS, { initialStep: "STEP_2" });

      return (
        <Funnel>
          <Funnel.Step name="STEP_1">
            <div>1단계</div>
          </Funnel.Step>
          <Funnel.Step name="STEP_2">
            <div>2단계</div>
          </Funnel.Step>
          <Funnel.Step name="STEP_3">
            <div>3단계</div>
          </Funnel.Step>
        </Funnel>
      );
    };

    const html = renderToStaticMarkup(<TestFunnelComponent />);

    expect(html).not.toContain("1단계");
    expect(html).toContain("2단계");
    expect(html).not.toContain("3단계");
  });
});
