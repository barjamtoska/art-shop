"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { copy } from "@/config/copy";

const INTERVAL_MS = 2000;
const ATTEMPTS = 15; // about 30 seconds

/**
 * While the payment is being recorded (the webhook usually arrives within
 * seconds), quietly check again; after half a minute, reassure instead.
 */
export function AwaitRecording() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt >= ATTEMPTS) return;
    const timer = setTimeout(() => {
      router.refresh();
      setAttempt((n) => n + 1);
    }, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [attempt, router]);

  return (
    <p role="status" className="mt-5 max-w-md font-display text-xl text-ivory-muted italic">
      {attempt >= ATTEMPTS ? copy.acquisition.complete.slowBody : copy.acquisition.complete.recordingBody}
    </p>
  );
}
