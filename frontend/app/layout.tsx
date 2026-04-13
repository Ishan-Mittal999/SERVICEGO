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
  title: {
    default: "ServiceGo | Trusted Home Services in India",
    template: "%s | ServiceGo",
  },
  description: "Book trusted AC repair, electrician, carpentry, appliance service, and doorstep home maintenance with ServiceGo.",
  applicationName: "ServiceGo",
  keywords: [
    "servicego",
    "servicego works",
    "home services",
    "ac repair",
    "electrician",
    "appliance repair",
    "carpenter near me",
    "home maintenance services",
    "doorstep services",
    "india",
  ],
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ServiceGo | Trusted Home Services in India",
    description: "Book trusted AC repair, electrician, carpentry, appliance service, and doorstep home maintenance with ServiceGo.",
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
    title: "ServiceGo | Trusted Home Services in India",
    description: "Book trusted AC repair, electrician, carpentry, appliance service, and doorstep home maintenance with ServiceGo.",
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
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ServiceGo",
    alternateName: ["ServiceGo", "servicego.works"],
    url: "https://servicego.works",
    logo: "https://servicego.works/icon.webp",
    sameAs: [
      "https://servicego.works",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ServiceGo",
    url: "https://servicego.works",
    inLanguage: "en-IN",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://servicego.works/subservices?query={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <head>
        {/* Fonts are now loaded via next/font/google for optimal performance */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
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
