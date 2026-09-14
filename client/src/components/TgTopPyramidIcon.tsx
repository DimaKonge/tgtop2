import type { SVGProps } from "react";

/** Compact 1–2–4 TG TOP pyramid, matching the Mini App launch mark. */
export function TgTopPyramidIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 28 20" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="11.5" y="0.75" width="5" height="5" rx="1.25" fill="currentColor" />
      <rect x="8" y="7.25" width="5" height="5" rx="1.25" fill="currentColor" />
      <rect x="15" y="7.25" width="5" height="5" rx="1.25" fill="currentColor" />
      <rect x="0.75" y="13.75" width="5" height="5" rx="1.25" fill="currentColor" />
      <rect x="7.25" y="13.75" width="5" height="5" rx="1.25" fill="currentColor" />
      <rect x="13.75" y="13.75" width="5" height="5" rx="1.25" fill="currentColor" />
      <rect x="20.25" y="13.75" width="5" height="5" rx="1.25" fill="currentColor" />
    </svg>
  );
}
