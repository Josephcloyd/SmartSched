import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import { PrivacyAnalytics } from "@/components/privacy-analytics";
import { splashSeenScript } from "@/lib/splash";
import { brand, brandColors } from "@/lib/brand";
import { seoDescription, seoKeywords, seoTitle } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Lets the opengraph-image / apple-icon files resolve to absolute URLs in link previews.
  metadataBase: new URL(brand.siteUrl),
  title: seoTitle,
  description: seoDescription,
  keywords: seoKeywords,
  applicationName: brand.appName,
  authors: [{ name: brand.company, url: brand.siteUrl }],
  creator: brand.company,
  publisher: brand.company,
  category: "education",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Stops iOS turning class codes/rooms that look like numbers into phone links.
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    url: "/",
    siteName: brand.appName,
    title: seoTitle,
    description: seoDescription,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
  },
  appleWebApp: {
    capable: true,
    title: brand.appName,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // In-app status bar matches the dark app header; the manifest uses the splash green for launch.
  themeColor: brandColors.appDark,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Lets env(safe-area-inset-*) report the iPhone home-indicator area for the bottom tab bar.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Dark is the GetLaunchPH default; the app removes it if the student picked light.
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Static, no user data: marks returning visitors before paint so the splash skips its intro. */}
        <script dangerouslySetInnerHTML={{ __html: splashSeenScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
