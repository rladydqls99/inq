type AutoAdvanceTimerProps = {
  seconds: number;
};

export function AutoAdvanceTimer({ seconds }: AutoAdvanceTimerProps) {
  return (
    <span className="auto-advance-timer" aria-live="polite">
      {seconds}s
    </span>
  );
}
