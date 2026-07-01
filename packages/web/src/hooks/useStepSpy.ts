import { useEffect, useState } from "react";
import { STEPS, type StepId } from "../steps";

function stepIdFromElementId(elementId: string): StepId {
  return elementId.replace("step-", "") as StepId;
}

export function useStepSpy(fallback: StepId, watch: unknown[]): StepId {
  const [visibleStep, setVisibleStep] = useState<StepId>(fallback);

  useEffect(() => {
    setVisibleStep(fallback);
  }, [fallback]);

  useEffect(() => {
    const elements = STEPS.map((step) =>
      document.getElementById(`step-${step.id}`),
    ).filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio);
        }

        let bestId = elements[0].id;
        let bestRatio = -1;
        for (const el of elements) {
          const ratio = ratios.get(el.id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = el.id;
          }
        }

        if (bestRatio > 0) {
          setVisibleStep(stepIdFromElementId(bestId));
        }
      },
      {
        rootMargin: "-15% 0px -45% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
    // Re-bind when sections mount or unmount in the DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch);

  return visibleStep;
}
