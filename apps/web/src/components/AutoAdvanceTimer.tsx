import { useEffect, useState } from "react";

type AutoAdvanceTimerProps = {
  seconds: number;
};

export function AutoAdvanceTimer({ seconds }: AutoAdvanceTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(seconds);

  useEffect(() => {
    setRemainingSeconds(seconds);

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [seconds]);

  return (
    <span
      className="auto-advance-timer"
      aria-label={`자동 이동까지 ${remainingSeconds}초`}
      aria-live="polite"
    >
      {remainingSeconds}초
    </span>
  );
}
