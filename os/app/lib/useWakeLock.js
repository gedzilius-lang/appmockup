"use client";
import { useEffect, useRef, useState } from "react";

export function useWakeLock() {
  const wakeLockRef = useRef(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      setSupported(false);
      return;
    }

    async function requestLock() {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch {}
    }

    requestLock();

    // Re-acquire on visibility change (tab switch back)
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        requestLock();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  return { supported };
}
