import { useEffect, useRef } from "react";

const HOLD_DELAY_MS = 450;
const HOLD_INTERVAL_MS = 500;

export function useHoldRepeat() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function clearTimers() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }

  function start(onRepeat: () => void) {
    repeatingRef.current = false;
    timeoutRef.current = setTimeout(() => {
      repeatingRef.current = true;
      intervalRef.current = setInterval(onRepeat, HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }

  function release(onTap: () => void) {
    const wasRepeating = repeatingRef.current;
    clearTimers();
    repeatingRef.current = false;
    if (!wasRepeating) onTap();
  }

  function cancel() {
    clearTimers();
    repeatingRef.current = false;
  }

  return { start, release, cancel };
}
