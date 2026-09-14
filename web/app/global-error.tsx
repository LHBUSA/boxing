"use client";

// Last-resort boundary when the root layout itself fails. It renders its own document (no shell, no fonts)
// and keeps the build-mode robots policy.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>PropBetEdge Boxing is temporarily unavailable</title>
      </head>
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#110e0b", color: "#f6f2ea", font: "16px/1.5 system-ui, sans-serif", padding: "0 16px" }}>
        <main style={{ maxWidth: 520 }}>
          <p style={{ color: "#d4af37", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12, margin: 0 }}>PropBetEdge Boxing</p>
          <h1 style={{ fontSize: 32, margin: "8px 0" }}>Temporarily unavailable.</h1>
          <p style={{ color: "rgba(246,242,234,0.7)" }}>The site did not render for this request.{error.digest ? ` Reference ${error.digest}.` : ""}</p>
          <button type="button" onClick={() => reset()} style={{ marginTop: 12, padding: "10px 16px", borderRadius: 999, border: 0, background: "#d4af37", color: "#110e0b", fontWeight: 700, cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
