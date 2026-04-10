"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", backgroundColor: "#f9fafb" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "400px" }}>
            {/* Icon */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "80px",
                height: "80px",
                backgroundColor: "#fef2f2",
                borderRadius: "50%",
                marginBottom: "1.5rem",
              }}
            >
              <svg width="40" height="40" fill="none" stroke="#f87171" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <p style={{ fontSize: "4rem", fontWeight: 800, color: "#e5e7eb", lineHeight: 1, marginBottom: "0.5rem" }}>
              500
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
              Critical Error
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
              The application encountered a critical error. Please try refreshing the page.
            </p>

            {error.digest && (
              <p style={{
                fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace",
                backgroundColor: "#f3f4f6", padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                display: "inline-block", marginBottom: "1.5rem",
              }}>
                Error ID: {error.digest}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={reset}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  backgroundColor: "#1d4ed8", color: "white", fontWeight: 600,
                  padding: "0.625rem 1.5rem", borderRadius: "0.5rem", border: "none",
                  cursor: "pointer", fontSize: "0.875rem",
                }}
              >
                Try Again
              </button>
              <a
                href="/login"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.5rem",
                  backgroundColor: "white", color: "#374151", fontWeight: 600,
                  padding: "0.625rem 1.5rem", borderRadius: "0.5rem",
                  border: "1px solid #d1d5db", cursor: "pointer", fontSize: "0.875rem",
                  textDecoration: "none",
                }}
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
