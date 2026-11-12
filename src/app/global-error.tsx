"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#08090B", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <p style={{ fontSize: 11, letterSpacing: "0.12em", opacity: 0.45 }}>BUYBIZ</p>
            <h1 style={{ fontSize: 26, margin: "12px 0 8px" }}>Something went wrong.</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.6 }}>
              The app could not start this screen. Your wallet was not charged by this page.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 20, height: 44, padding: "0 22px", borderRadius: 999, border: 0, background: "#fff", color: "#0A0B0D", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
