"use client";

// Last-resort error page, shown if the root layout itself fails. It must
// render its own <html> and cannot rely on the app's fonts or stylesheet.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#2e0908",
          color: "#f3ebdd",
          fontFamily: "Georgia, serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontWeight: 300, fontSize: "2.25rem", margin: 0 }}>A light has gone out in this room</h1>
          <p style={{ color: "#cbbfa8", fontStyle: "italic", fontSize: "1.25rem" }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.75rem",
              background: "transparent",
              color: "#f3ebdd",
              border: "1px solid #b8935a",
              font: "inherit",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
