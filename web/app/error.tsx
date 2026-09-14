"use client";

import Link from "next/link";
import { useEffect } from "react";

// Route error boundary: a render failure shows an honest state with a retry, never a stack trace or a guessed view.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.warn("boxing route error", error.digest ?? "");
  }, [error]);
  return (
    <div className="wrap page">
      <header className="page-hero">
        <div className="eyebrow">Temporarily unavailable</div>
        <h1>This page could not load.</h1>
        <p>The Boxing record did not render for this request. Nothing is shown rather than a stale or partial view.{error.digest ? ` Reference ${error.digest}.` : ""}</p>
      </header>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn--gold" onClick={() => reset()}>Try again</button>
        <Link className="btn" href="/fight-week">Fight Week</Link>
        <Link className="btn" href="/events">Schedule</Link>
      </div>
    </div>
  );
}
