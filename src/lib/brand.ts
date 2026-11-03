/** GetLaunchPH family branding, shared by the header, splash screen and metadata. */
export const brand = {
  appName: "SmartSched",
  // Rendered as "Smart" + accent-coloured "Sched", like "Resume" + "Flow".
  nameLead: "Smart",
  nameAccent: "Sched",
  company: "GetLaunchPH",
  tagline: "Free class schedule planner and wallpaper maker",
  siteUrl: "https://smartschedule.getlaunchph.com",
} as const;

/** Brand colours used outside CSS (manifest, browser chrome). Keep in sync with `.lm-screen` in globals.css. */
export const brandColors = {
  splash: "#344c43",
  appDark: "#141414",
} as const;

/** GCash donation details, shared with ResumeFlow (same official QR). */
export const donation = {
  qrImage: "/gcash-donation-qr.jpg",
  qrDownloadName: "SmartSched-GCash-QR.jpg",
  charityNote: "goes to helping homeless people in Cebu City.",
  charityShare: "50% of every donation",
} as const;
