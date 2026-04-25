import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Minesweeper AI Solver",
  description:
    "Academic AI course project demonstrating Minesweeper solving with constraint propagation and probability fallback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${monoFont.variable} bg-[#0f0f0f] antialiased`}>
        {children}
      </body>
    </html>
  );
}
