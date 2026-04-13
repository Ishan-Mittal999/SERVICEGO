import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Categories and Subservices",
  description:
    "Browse ServiceGo service categories and subservices for AC, appliance, electrical, and home maintenance bookings.",
  alternates: {
    canonical: "/subservices",
  },
};

export default function SubservicesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
