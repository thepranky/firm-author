import type { StepId } from "../steps";
import { STEPS } from "../steps";

type StepNavProps = {
  visible: StepId;
  progress: StepId;
  unlocked: Set<StepId>;
  onNavigate: (id: StepId) => void;
};

export function StepNav({ visible, progress, unlocked, onNavigate }: StepNavProps) {
  const progressIndex = STEPS.findIndex((s) => s.id === progress);

  return (
    <nav className="step-nav" aria-label="Progress">
      <ol className="step-nav__list">
        {STEPS.map((step, i) => {
          const isVisible = step.id === visible;
          const isDone = i < progressIndex;
          const isUnlocked = unlocked.has(step.id);
          return (
            <li key={step.id} className="step-nav__item">
              <button
                type="button"
                className={[
                  "step-nav__btn",
                  isVisible && "step-nav__btn--active",
                  isDone && "step-nav__btn--done",
                  !isUnlocked && "step-nav__btn--locked",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!isUnlocked}
                aria-current={isVisible ? "step" : undefined}
                onClick={() => onNavigate(step.id)}
              >
                <span className="step-nav__num">{step.num}</span>
                <span className="step-nav__label">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={`step-nav__line${isDone ? " step-nav__line--done" : ""}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
