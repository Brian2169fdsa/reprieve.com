import Link from "next/link";

export default function PortalNotFound() {
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
      {/* Icon */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "#FEF2F2",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#DC2626",
            fontFamily: "monospace",
          }}
        >
          404
        </span>
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
        Page Not Found
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
        This page doesn&apos;t exist. It may have been moved or the URL is
        incorrect.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 18px",
            backgroundColor: "#3BA7C9",
            color: "#fff",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </Link>
        <Link
          href="/calendar"
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
          View Calendar
        </Link>
      </div>
    </div>
  );
}
