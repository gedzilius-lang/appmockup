"use client";
import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const res = await fetch("/api/health", { signal: AbortSignal.timeout(5000) });
        if (active) setOnline(res.ok);
      } catch {
        if (active) setOnline(false);
      }
    }
    check();
    const t = setInterval(check, 10000);
    return () => { active = false; clearInterval(t); };
  }, []);

  return online;
}
