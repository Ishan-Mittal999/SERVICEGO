import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalHeader from "@/components/GlobalHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://servicego.works"),
  title: "ServiceGo",
  description: "Trusted local services at your doorstep.",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ServiceGo",
    description: "Trusted local services at your doorstep.",
    url: "https://servicego.works",
    siteName: "ServiceGo",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/icon.webp",
        width: 512,
        height: 512,
        alt: "ServiceGo logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ServiceGo",
    description: "Trusted local services at your doorstep.",
    images: ["/icon.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/icon.webp", type: "image/webp" },
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/apple-icon.webp", type: "image/webp" }],
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
        <GlobalHeader />
        <div className="servicego-page-content">{children}</div>
      </body>
    </html>
  );
}
