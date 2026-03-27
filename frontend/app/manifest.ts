import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ServiceGo",
    short_name: "ServiceGo",
    description: "Trusted local services at your doorstep.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f6ef",
    theme_color: "#8c7600",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon.webp",
        sizes: "1200x1200",
        type: "image/webp",
      },
      {
        src: "/apple-icon.webp",
        sizes: "180x180",
        type: "image/webp",
      },
    ],
  };
}
