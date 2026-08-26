import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kalivoa",
    short_name: "Kalivoa",
    description: "Sports-betting bankroll tracking with screenshot import.",
    start_url: "/fr",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#0b0d12",
    icons: [
      {
        src: "/kalivoa-icon.svg",
        sizes: "64x64",
        type: "image/svg+xml",
      },
    ],
  };
}
