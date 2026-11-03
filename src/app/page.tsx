import { ScheduleApp } from "@/components/schedule-app";
import { AboutSection } from "@/components/seo/about-section";
import { buildJsonLd } from "@/lib/seo";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so the JSON can never close the script tag (Next.js JSON-LD guide).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()).replace(/</g, "\\u003c") }}
      />
      <ScheduleApp />
      <AboutSection />
    </>
  );
}
