import { useEffect, useState } from 'react';

export function useElapsedTimer(isRunning: boolean, intervalMs = 100) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const startTime = Date.now();
    setElapsedTime(0);

    const intervalId = window.setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [intervalMs, isRunning]);

  return elapsedTime;
}
