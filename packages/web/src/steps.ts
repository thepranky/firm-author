export type StepId = "upload" | "configure" | "results";

export const STEPS: { id: StepId; label: string; num: number }[] = [
  { id: "upload", label: "Upload", num: 1 },
  { id: "configure", label: "Configure", num: 2 },
  { id: "results", label: "Results", num: 3 },
];

export function scrollToStep(id: StepId) {
  requestAnimationFrame(() => {
    document.getElementById(`step-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: id === "upload" ? "start" : "center",
    });
  });
}
