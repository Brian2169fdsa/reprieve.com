"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: 32,
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
      }}
    >
      {/* Warning icon */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "#FFFBEB",
          marginBottom: 16,
        }}
      >
        <svg
          width="24"
          height="24"
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
          fontSize: 20,
          fontWeight: 600,
          color: "#171717",
          marginBottom: 6,
        }}
      >
        Something Went Wrong
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "#737373",
          lineHeight: 1.6,
          marginBottom: 24,
          textAlign: "center",
          maxWidth: 360,
        }}
      >
        An error occurred while loading this page. You can try again or navigate
        to another section.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 18px",
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
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 18px",
            backgroundColor: "#fff",
            color: "#525252",
            border: "1px solid #D4D4D4",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </Link>
      </div>

      {/* Error details for debugging */}
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
  );
}
