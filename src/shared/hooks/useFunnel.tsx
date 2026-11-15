"use client";

import React, {
  Children,
  isValidElement,
  ReactElement,
  ReactNode,
  useMemo,
  useState,
  useCallback,
} from "react";

export interface StepProps<Steps extends readonly string[]> {
  name: Steps[number];
  children: ReactNode;
}

export interface FunnelProps<Steps extends readonly string[]> {
  children:
    | Array<ReactElement<StepProps<Steps>>>
    | ReactElement<StepProps<Steps>>
    | ReactNode;
}

export interface UseFunnelOptions<Steps extends readonly string[]> {
  initialStep?: Steps[number];
}

/**
 * @name useFunnel
 * @description 토스(Toss) 프론트엔드 챕터의 퍼널 아키텍처 패턴을 기반으로 구현한 다단계 폼 상태 관리 훅입니다.
 * Compound Component 패턴(<Funnel>, <Funnel.Step>)과 결합하여 다단계 스텝을 선언적으로 렌더링하고 타입 안전한 상태 전이를 제공합니다.
 *
 * @example
 * const STEPS = ['WELCOME', 'PROFILE', 'COMPLETE'] as const;
 * const [Funnel, setStep, currentStep] = useFunnel(STEPS, { initialStep: 'WELCOME' });
 *
 * return (
 *   <Funnel>
 *     <Funnel.Step name="WELCOME">
 *       <WelcomeStep onNext={() => setStep('PROFILE')} />
 *     </Funnel.Step>
 *     <Funnel.Step name="PROFILE">
 *       <ProfileStep onNext={() => setStep('COMPLETE')} />
 *     </Funnel.Step>
 *   </Funnel>
 * );
 */
export function useFunnel<Steps extends readonly string[]>(
  steps: Steps,
  options?: UseFunnelOptions<Steps>,
) {
  const [step, setStepState] = useState<Steps[number]>(
    options?.initialStep ?? steps[0],
  );

  const setStep = useCallback((nextStep: Steps[number]) => {
    setStepState(nextStep);
  }, []);

  const Funnel = useMemo(() => {
    const FunnelComponent = ({ children }: FunnelProps<Steps>) => {
      const validChildren = Children.toArray(children).filter(
        isValidElement,
      ) as ReactElement<StepProps<Steps>>[];

      const activeChild = validChildren.find(
        (child) => child.props.name === step,
      );

      return activeChild ? <>{activeChild}</> : null;
    };

    const StepComponent = ({ children }: StepProps<Steps>) => {
      return <>{children}</>;
    };

    FunnelComponent.Step = StepComponent;

    return FunnelComponent;
  }, [step]);

  return [Funnel, setStep, step] as const;
}
