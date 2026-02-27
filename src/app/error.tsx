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
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
        backgroundColor: "#FAFAFA",
        padding: 24,
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 32 }}>
        <span
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#2A8BA8",
          }}
        >
          REPrieve
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#A3A3A3" }}>
          .ai™
        </span>
      </div>

      {/* Error card */}
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #E8E8E8",
          borderRadius: 10,
          padding: "48px 40px",
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {/* Error icon */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "#FFFBEB",
            marginBottom: 20,
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D97706"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: 22,
            fontWeight: 600,
            color: "#171717",
            marginBottom: 8,
          }}
        >
          Something Went Wrong
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#737373",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          An unexpected error occurred. This has been logged automatically. You
          can try again or return to the dashboard.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 20px",
              backgroundColor: "#3BA7C9",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 20px",
              backgroundColor: "#fff",
              color: "#525252",
              border: "1px solid #D4D4D4",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Go to Dashboard
          </a>
        </div>

        {/* Error digest for support */}
        {error.digest && (
          <p
            style={{
              marginTop: 20,
              fontSize: 11,
              color: "#A3A3A3",
              fontFamily: "monospace",
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
