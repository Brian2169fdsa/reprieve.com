import Link from "next/link";

export default function NotFound() {
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
        padding: "24px",
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
        {/* 404 badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "#FEF2F2",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 24,
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
            fontSize: 22,
            fontWeight: 600,
            color: "#171717",
            marginBottom: 8,
          }}
        >
          Page Not Found
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "#737373",
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or navigate back to a known page.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 20px",
              backgroundColor: "#3BA7C9",
              color: "#fff",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
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
              transition: "background 0.15s",
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p
        style={{
          marginTop: 24,
          fontSize: 12,
          color: "#A3A3A3",
        }}
      >
        If you believe this is an error, contact your administrator.
      </p>
    </div>
  );
}
