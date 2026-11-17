"use client";

import { useEffect, useState } from "react";

export type WakeLockStatus = "off" | "active" | "unsupported" | "blocked";

// Screen Wake Lock API로 화면 꺼짐을 막는다.
// 탭이 백그라운드로 가면 브라우저가 잠금을 해제하므로, 다시 보일 때 재요청한다.
export function useWakeLock(enabled: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("off");

  useEffect(() => {
    if (!enabled) {
      setStatus("off");
      return;
    }
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setStatus("unsupported");
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const handleRelease = () => {
      if (!cancelled) setStatus("off");
    };

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (sentinel && !sentinel.released) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void next.release();
          return;
        }
        sentinel = next;
        sentinel.addEventListener("release", handleRelease);
        setStatus("active");
      } catch {
        // 저전력 모드이거나 권한이 거부된 경우
        if (!cancelled) setStatus("blocked");
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (sentinel) {
        sentinel.removeEventListener("release", handleRelease);
        void sentinel.release().catch(() => {});
      }
    };
  }, [enabled]);

  return status;
}
