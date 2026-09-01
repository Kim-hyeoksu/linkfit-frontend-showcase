import React, { useRef } from "react";
import type { ClientExercise } from "@/entities/exercise/model/types";
import { postMessageToNative } from "@/shared/utils/webview-bridge";

/**
 * [Synchronous Gesture Lock Engineering]
 *
 * 문제:
 * Framer Motion 등으로 카드 목록을 드래그(Reorder)할 때:
 * 1. 네이티브의 당겨서 새로고침(Pull-to-Refresh)과 웹 드래그가 충돌하여 화면이 떨림.
 * 2. 드래그가 끝나고 손가락을 떼는 순간 브라우저가 Synthetic Click Event를 발화시켜
 *    원치 않게 카드의 아코디언이 열려버리는 심각한 UX 결함 발생.
 *
 * React State(isDragging)를 쓰면 안 되는 이유:
 * React의 setState는 비동기 배치(Batch)로 동작하므로, onDragEnd 직후 상태가 false로
 * 변경되기 전 찰나의 프레임 사이에 onClick 핸들러가 먼저 실행되어 락이 뚫림.
 *
 * 해결:
 * 1. 동기식 참조 변수 wasDraggedRef.current = true 를 사용하여 0ms 지연 없이 즉시 클릭 차단.
 * 2. DRAG_START / DRAG_END 브릿지로 네이티브 뷰포트 스크롤 락 연동.
 * 3. 400ms 타이머 후 안전하게 동기 락 해제.
 */

export interface ReorderableExerciseItemProps {
  exercise: ClientExercise;
  isCurrent: boolean;
  onCardClick: (exerciseId: number) => void;
  onToggleSet: (exerciseId: number, setId: number) => void;
}

export const ReorderableExerciseItem: React.FC<ReorderableExerciseItemProps> = ({
  exercise,
  isCurrent,
  onCardClick,
  onToggleSet,
}) => {
  // 🔒 0ms 즉시 차단용 동기식 락 Ref
  const wasDraggedRef = useRef(false);

  // 드래그 시작 시: 네이티브 스크롤 잠금 및 동기식 락 활성화
  const handleDragStart = () => {
    wasDraggedRef.current = true;
    postMessageToNative("DRAG_START");
  };

  // 드래그 종료 시: 네이티브 스크롤 해제 및 락 유지 후 400ms 뒤 해제
  const handleDragEnd = () => {
    wasDraggedRef.current = true;
    postMessageToNative("DRAG_END");

    // 합성 클릭 이벤트가 발화되는 타이밍을 완벽히 방어한 후 락 해제
    setTimeout(() => {
      wasDraggedRef.current = false;
    }, 400);
  };

  // 카드 클릭 핸들러: 동기식 락 검사
  const handleClick = () => {
    // 🛑 드래그 직후 발생한 클릭 이벤트는 0ms로 즉시 무시
    if (wasDraggedRef.current) {
      return;
    }
    onCardClick(exercise.sessionExerciseId);
  };

  return (
    <div
      data-testid={`exercise-card-${exercise.sessionExerciseId}`}
      onClick={handleClick}
      className={`w-full p-4 rounded-2xl border transition-all select-none ${
        isCurrent ? "border-emerald-500 bg-emerald-50/10" : "border-gray-200 bg-white"
      }`}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "pan-y",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 cursor-grab active:cursor-grabbing">⠿</span>
          <div>
            <h3 className="font-semibold text-gray-900">{exercise.exerciseName}</h3>
            <p className="text-xs text-gray-500">{exercise.bodyPart} · {exercise.sets.length}세트</p>
          </div>
        </div>
        <span className="text-xs text-emerald-600 font-medium">
          {isCurrent ? "진행 중" : "대기"}
        </span>
      </div>

      {/* 세트 목록 */}
      {isCurrent && (
        <div className="mt-4 space-y-2 border-t pt-3">
          {exercise.sets.map((set) => (
            <div
              key={set.id}
              className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-gray-50"
            >
              <span className="font-medium text-gray-600">{set.setOrder}세트</span>
              <span className="text-gray-800">{set.weight}kg × {set.reps}회</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSet(exercise.sessionExerciseId, set.id);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                  set.status === "COMPLETED"
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {set.status === "COMPLETED" ? "완료됨" : "완료"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
