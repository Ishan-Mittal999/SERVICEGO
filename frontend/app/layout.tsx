import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ServiceGo",
  description: "Trusted local services at your doorstep.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", type: "image/x-icon" },
      { url: "/apple-icon.webp?v=2", type: "image/webp" },
    ],
    shortcut: [{ url: "/favicon.ico?v=2", type: "image/x-icon" }],
    apple: [{ url: "/apple-icon.webp?v=2", type: "image/webp" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Fonts are now loaded via next/font/google for optimal performance */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased servicego-app-root`}
      >
        {children}
      </body>
    </html>
  );
}
