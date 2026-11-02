/** GetLaunchPH family branding, shared by the header, splash screen and metadata. */
export const brand = {
  appName: "SmartSched",
  // Rendered as "Smart" + accent-coloured "Sched", like "Resume" + "Flow".
  nameLead: "Smart",
  nameAccent: "Sched",
  company: "GetLaunchPH",
  tagline: "Free class schedule planner and wallpaper maker",
} as const;

/** GCash donation details, shared with ResumeFlow (same official QR). */
export const donation = {
  qrImage: "/gcash-donation-qr.jpg",
  qrDownloadName: "SmartSched-GCash-QR.jpg",
  charityNote: "goes to helping homeless people in Cebu City.",
  charityShare: "50% of every donation",
} as const;
