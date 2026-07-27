import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmartSched",
    short_name: "SmartSched",
    description: "Local school schedule planner with wallpaper and reminder exports.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#256f53",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
