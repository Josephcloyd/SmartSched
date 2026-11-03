import { describe, expect, it } from "vitest";
import { buildJsonLd, seoDescription, seoFaqs, seoTitle } from "@/lib/seo";

describe("SEO copy", () => {
  it("keeps the title and description within what Google shows", () => {
    expect(seoTitle.length).toBeLessThanOrEqual(70);
    expect(seoDescription.length).toBeGreaterThanOrEqual(120);
    expect(seoDescription.length).toBeLessThanOrEqual(170);
  });
});

describe("buildJsonLd", () => {
  const graph = buildJsonLd()["@graph"];

  it("describes a free web app published by GetLaunchPH", () => {
    const app = graph.find((node) => node["@type"] === "WebApplication");
    expect(app).toMatchObject({
      name: "SmartSched",
      url: "https://smartschedule.getlaunchph.com/",
      isAccessibleForFree: true,
      offers: { price: "0", priceCurrency: "PHP" },
    });
  });

  it("mirrors every visible FAQ (Google requires the FAQ to be on the page)", () => {
    const faq = graph.find((node) => node["@type"] === "FAQPage");
    const questions = faq && "mainEntity" in faq ? (faq.mainEntity ?? []) : [];
    expect(questions.map((q) => q.name)).toEqual(
      seoFaqs.map((item) => item.question),
    );
  });
});
