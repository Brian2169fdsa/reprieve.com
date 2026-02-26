import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "REPrieve.ai™ — Compliance Operating System",
  description:
    "A membership portal that runs compliance and quality management like an operating system — powered by an agentic AI team that automates monthly checkpoints, maintains policies, and builds audit-ready proof.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSans3.variable} ${sourceSerif4.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
