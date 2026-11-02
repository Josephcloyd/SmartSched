import { ShieldCheck } from "lucide-react";
import { brand } from "@/lib/brand";

// Official GetLaunchPH mark (from launchph/src/components/brand.tsx) so every tool shares it.
const LOGO_HEX_PATH =
  "M24 2.6 43 13.5c1.2.7 2 2 2 3.4v14.2c0 1.4-.8 2.7-2 3.4L24 45.4 5 34.5a4 4 0 0 1-2-3.4V16.9c0-1.4.8-2.7 2-3.4L24 2.6Z";
const LOGO_NODES = [
  { cx: 24, cy: 12.2 },
  { cx: 14.5, cy: 20.2 },
  { cx: 33.8, cy: 19.2 },
];

/**
 * GetLaunchPH hexagon with its "circuit tree" glyph.
 * Default: cream hex + dark-green ink (light bg).
 * splash=true: inverts to cream hex + dark-green ink against the dark-green splash bg
 *   (hex becomes cream so it pops; ink pulls from the same --brand-green-strong).
 */
export function BrandMark({
  size = 40,
  className = "",
  splash = false,
}: {
  size?: number;
  className?: string;
  splash?: boolean;
}) {
  const hexFill = splash ? "#f6f5f0" : "var(--logo-hex)";
  const inkStroke = splash ? "var(--brand-green-strong)" : "var(--logo-ink)";
  const inkFill = splash ? "var(--brand-green-strong)" : "var(--logo-ink)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={LOGO_HEX_PATH} fill={hexFill} />
      <g
        fill="none"
        stroke={inkStroke}
        strokeWidth="3.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 15.8v22.4M14.5 23.7v9.1H24M33.8 22.7v7H24" />
        {LOGO_NODES.map((node) => (
          <circle key={node.cx} {...node} r="4.5" fill={hexFill} />
        ))}
      </g>
      <rect x="19.4" y="35.8" width="9.2" height="6.3" rx="1.9" fill={inkFill} />
    </svg>
  );
}

/**
 * "SmartSched" wordmark + "By GetLaunchPH" sub-label.
 * splash=true renders all text in cream tones for the dark-green splash background.
 */
export function BrandLockup({
  size = "sm",
  splash = false,
}: {
  size?: "sm" | "lg";
  splash?: boolean;
}) {
  const large = size === "lg";

  return (
    <span className={`flex min-w-0 items-center ${large ? "flex-col gap-4 text-center" : "gap-3"}`}>
      <BrandMark size={large ? 72 : 38} splash={splash} />
      <span className="min-w-0">
        {/* App name */}
        <span
          className={`block font-bold leading-tight tracking-tight ${large ? "text-4xl" : "text-lg"}`}
          style={{ color: splash ? "#f6f5f0" : "var(--foreground)" }}
        >
          {brand.nameLead}
          <span style={{ color: splash ? "rgba(246,245,240,0.6)" : "var(--brand-sage)" }}>
            {brand.nameAccent}
          </span>
        </span>
        {/* "By GetLaunchPH" */}
        <span
          className={`block font-mono font-medium uppercase ${large ? "mt-2 text-xs tracking-[0.35em]" : "mt-0.5 text-[10px] tracking-[0.3em]"}`}
          style={{ color: splash ? "rgba(246,245,240,0.4)" : "var(--muted)" }}
        >
          By{" "}
          <span style={{ color: splash ? "rgba(246,245,240,0.65)" : "var(--foreground)" }}>
            {brand.company}
          </span>
        </span>
      </span>
    </span>
  );
}

/** Full-screen loading splash — GetLaunchPH dark-green brand background. */
export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--brand-green-strong)" }}
      role="status"
      aria-label={`Loading ${brand.appName}`}
    >
      <div className="animate-fade-in flex flex-col items-center">
        <BrandLockup size="lg" splash />
        {/* Slim shimmer bar — cream on dark green */}
        <div
          className="mt-10 h-px w-32 overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(246,245,240,0.15)" }}
        >
          <div
            className="splash-progress h-full w-1/3 rounded-full"
            style={{ backgroundColor: "rgba(246,245,240,0.6)" }}
          />
        </div>
        <p
          className="mt-5 flex items-center gap-1.5 text-[11px] tracking-wide"
          style={{ color: "rgba(246,245,240,0.4)" }}
        >
          <ShieldCheck
            aria-hidden="true"
            className="size-3"
            style={{ color: "rgba(246,245,240,0.55)" }}
          />
          {brand.tagline}
        </p>
      </div>
    </div>
  );
}
