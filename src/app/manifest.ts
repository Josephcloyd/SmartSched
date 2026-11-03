import type { MetadataRoute } from "next";
import { brand, brandColors } from "@/lib/brand";
import { appScreenshots } from "@/lib/screenshots";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.appName} by ${brand.company}`,
    short_name: brand.appName,
    description: `${brand.tagline}. Your schedule stays on your device.`,
    start_url: "/",
    display: "standalone",
    // Matches the animated splash so the installed app opens green → splash, with no grey flash.
    background_color: brandColors.splash,
    theme_color: brandColors.splash,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Enables the richer install sheet (screenshot gallery) on Android and desktop Chrome.
    screenshots: appScreenshots.map((shot) => ({
      src: shot.src,
      sizes: `${shot.width}x${shot.height}`,
      type: "image/webp",
      form_factor: shot.formFactor,
      label: shot.label,
    })),
    categories: ["education", "productivity", "utilities"],
  };
}
