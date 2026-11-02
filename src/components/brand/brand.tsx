import { brand } from "@/lib/brand";
import { ShieldCheck } from "lucide-react";

// ─── shared logo geometry (mirrors launchph/src/components/brand.tsx) ─────────
const LOGO_HEX_PATH =
  "M24 2.6 43 13.5c1.2.7 2 2 2 3.4v14.2c0 1.4-.8 2.7-2 3.4L24 45.4 5 34.5a4 4 0 0 1-2-3.4V16.9c0-1.4.8-2.7 2-3.4L24 2.6Z";
const LOGO_NODES = [
  { cx: 24, cy: 12.2 },
  { cx: 14.5, cy: 20.2 },
  { cx: 33.8, cy: 19.2 },
];
const LOGO_LINES = [
  { className: "lm-trunk", d: "M24 38.2V15.8" },
  { className: "lm-left",  d: "M24 32.8h-9.5v-9.1" },
  { className: "lm-right", d: "M24 29.7h9.8v-7" },
];

// ─── BrandMark — used in the app header (light/dark aware) ────────────────────
export function BrandMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={LOGO_HEX_PATH} fill="var(--logo-hex)" />
      <g
        fill="none"
        stroke="var(--logo-ink)"
        strokeWidth="3.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 15.8v22.4M14.5 23.7v9.1H24M33.8 22.7v7H24" />
        {LOGO_NODES.map((node) => (
          <circle key={node.cx} {...node} r="4.5" fill="var(--logo-hex)" />
        ))}
      </g>
      <rect x="19.4" y="35.8" width="9.2" height="6.3" rx="1.9" fill="var(--logo-ink)" />
    </svg>
  );
}

// ─── BrandLockup — used in the app header ─────────────────────────────────────
export function BrandLockup({ size = "sm" }: { size?: "sm" | "lg" }) {
  const large = size === "lg";
  return (
    <span className={`flex min-w-0 items-center ${large ? "flex-col gap-4 text-center" : "gap-3"}`}>
      <BrandMark size={large ? 72 : 38} />
      <span className="min-w-0">
        <span
          className={`block font-bold leading-tight tracking-tight text-foreground ${
            large ? "text-4xl" : "text-lg"
          }`}
        >
          {brand.nameLead}
          <span className="text-brand-sage">{brand.nameAccent}</span>
        </span>
        <span
          className={`block font-mono font-medium uppercase text-muted ${
            large ? "mt-2 text-xs tracking-[0.35em]" : "mt-0.5 text-[10px] tracking-[0.3em]"
          }`}
        >
          By <span className="text-foreground/80">{brand.company}</span>
        </span>
      </span>
    </span>
  );
}

// ─── SplashScreen — exact GetLaunchPH animated loading screen ─────────────────
export function SplashScreen() {
  return (
    <div className="lm-screen" role="status" aria-label={`Loading ${brand.appName}`}>
      <div className="lm-stage">
        {/* animated emblem */}
        <div className="lm-emblem" aria-hidden="true">
          <span className="lm-halo" />
          <span className="lm-shadow" />
          <span className="lm-orbit">
            <span className="lm-orbit-arc" />
          </span>
          <svg viewBox="0 0 48 48">
            <defs>
              <clipPath id="lm-hex-clip">
                <path d={LOGO_HEX_PATH} />
              </clipPath>
              <linearGradient id="lm-sheen-gradient" x1="0" y1="0" x2="1" y2="0.35">
                <stop offset="0"   stopColor="#fff" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
                <stop offset="1"   stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="lm-hex-fill" d={LOGO_HEX_PATH} fill="currentColor" />
            <path className="lm-hex-line" d={LOGO_HEX_PATH} pathLength={1} />
            <g className="lm-ink">
              {LOGO_LINES.map((line) => (
                <path
                  key={line.className}
                  className={`lm-line ${line.className}`}
                  d={line.d}
                  pathLength={1}
                />
              ))}
              {LOGO_LINES.map((line) => (
                <path
                  key={`${line.className}-pulse`}
                  className={`lm-pulse ${line.className}`}
                  d={line.d}
                  pathLength={1}
                />
              ))}
              {LOGO_NODES.map((node, index) => (
                <circle
                  key={node.cx}
                  className={`lm-node lm-node-${index + 1}`}
                  {...node}
                  r="4.5"
                />
              ))}
              <rect className="lm-base" x="19.4" y="35.8" width="9.2" height="6.3" rx="1.9" />
            </g>
            <g clipPath="url(#lm-hex-clip)">
              <rect className="lm-sheen" x="0" y="0" width="14" height="48" fill="url(#lm-sheen-gradient)" />
            </g>
          </svg>
        </div>

        {/* "GetLaunchPH" letter-by-letter wordmark */}
        <p className="lm-wordmark" aria-hidden="true">
          {[..."GetLaunch"].map((letter, index) => (
            <span
              key={index}
              className="lm-letter"
              style={{ "--i": index } as React.CSSProperties}
            >
              {letter}
            </span>
          ))}
          <span className="lm-letter lm-letter-accent" style={{ "--i": 10 } as React.CSSProperties}>
            PH
          </span>
        </p>

        {/* caption */}
        <p className="lm-caption">
          <ShieldCheck aria-hidden="true" className="lm-caption-icon" />
          {brand.tagline}
        </p>
      </div>
    </div>
  );
}
