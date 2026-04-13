import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shops Near You",
  description:
    "Find trusted ServiceGo partner shops and professionals near your location for reliable doorstep home services.",
  alternates: {
    canonical: "/shops",
  },
};

export default function ShopsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
