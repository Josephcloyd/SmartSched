/**
 * Search/SEO copy and structured data, in one place so the visible page text
 * (src/components/seo/about-section.tsx) and the JSON-LD always match.
 */
import { brand } from "@/lib/brand";
import { schoolPalettes } from "@/lib/school-palettes";
import { appScreenshots } from "@/lib/screenshots";

export const seoTitle = `${brand.appName}: Free Class Schedule Maker & Wallpaper | ${brand.company}`;

// ~155 characters so Google shows it whole.
export const seoDescription =
  "Make your class schedule in minutes, turn it into a lock-screen wallpaper in your school's colors, get class reminders and share it with classmates. Free, no sign-up.";

export const seoKeywords = [
  "class schedule maker",
  "class schedule wallpaper",
  "schedule wallpaper maker",
  "student planner Philippines",
  "college class schedule",
  "timetable maker",
  "free schedule planner",
  "lock screen schedule",
  "class reminders",
  "SmartSched",
  "GetLaunchPH",
];

export const seoFeatures = [
  {
    title: "Plan your whole week",
    text: "Add classes, labs, quizzes, exams and events. SmartSched warns you when two of them overlap.",
  },
  {
    title: "Wallpaper in your school's colors",
    text: "Download a readable lock-screen or desktop wallpaper sized for your exact phone, tablet or laptop.",
  },
  {
    title: "Never miss a class",
    text: "Turn on reminders or add the schedule to your phone's calendar. Public holidays and school breaks are skipped.",
  },
  {
    title: "Share with classmates",
    text: "Send your schedule by QR code or link. Your blockmates can add it to their own SmartSched in one tap.",
  },
] as const;

export const seoFaqs = [
  {
    question: "Is SmartSched really free?",
    answer:
      "Yes. SmartSched is free with no sign-up and no ads. It's kept running by optional GCash donations, half of which help homeless people in Cebu City.",
  },
  {
    question: "Where is my schedule saved?",
    answer:
      "Only in the browser on your device. Nothing you type is uploaded to our servers. Save a backup file before switching phones or clearing your browser data.",
  },
  {
    question: "How do I set my class schedule as my phone wallpaper?",
    answer:
      "Add your classes, open Choose a design, pick your school colors and tap Download. Then open the image on your phone and set it as your lock-screen wallpaper.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. After your first visit SmartSched works without internet, and you can add it to your home screen like an app.",
  },
  {
    question: "Can I share my schedule with my blockmates?",
    answer:
      "Yes. Tap Share to get a QR code or link. The schedule travels inside the link itself, so it never passes through our servers.",
  },
] as const;

export const supportedSchoolNames = schoolPalettes.map((palette) => palette.name);

/** schema.org data for Google: the web app, its publisher, and the FAQ shown on the page. */
export function buildJsonLd() {
  const appUrl = `${brand.siteUrl}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${appUrl}#app`,
        name: brand.appName,
        url: appUrl,
        description: seoDescription,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any (web browser), Android, iOS, Windows, macOS",
        browserRequirements: "Requires JavaScript",
        inLanguage: "en-PH",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "PHP" },
        featureList: seoFeatures.map((feature) => feature.title),
        image: `${brand.siteUrl}/opengraph-image.png`,
        screenshot: appScreenshots.map((shot) => ({
          "@type": "ImageObject",
          url: `${brand.siteUrl}${shot.src}`,
          width: shot.width,
          height: shot.height,
          caption: shot.label,
        })),
        publisher: { "@id": `${appUrl}#org` },
      },
      {
        "@type": "Organization",
        "@id": `${appUrl}#org`,
        name: brand.company,
        logo: `${brand.siteUrl}/icon-512.png`,
      },
      {
        "@type": "FAQPage",
        "@id": `${appUrl}#faq`,
        mainEntity: seoFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
