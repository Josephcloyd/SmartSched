import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.appName} by ${brand.company}`,
    short_name: brand.appName,
    description: `${brand.tagline}. Your schedule stays on your device.`,
    start_url: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#141414",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
