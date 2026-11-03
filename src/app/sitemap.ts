import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

// Single-page app: the home page is the only indexable URL.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${brand.siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
