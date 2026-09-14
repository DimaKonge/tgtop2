import type { SVGProps } from "react";

type TgTopAnimatedPyramidAvatarProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  title?: string;
};

/**
 * TG TOP's exact 1–2–4 / seven-cell silhouette, animated with CSS only.
 * It is visual identity for an explicitly configured TOP placement, never a
 * fallback for arbitrary catalogue groups.
 */
export function TgTopAnimatedPyramidAvatar({ title = "TG TOP", className, ...props }: TgTopAnimatedPyramidAvatarProps) {
  return (
    <svg viewBox="0 0 84 70" role="img" aria-label={title} className={`tg-top-pyramid-avatar ${className ?? ""}`.trim()} {...props}>
      <rect className="tg-top-pyramid-avatar__tile tg-top-pyramid-avatar__tile--1" x="31" y="4" width="22" height="18" rx="5" />
      <rect className="tg-top-pyramid-avatar__tile tg-top-pyramid-avatar__tile--2" x="18" y="27" width="22" height="18" rx="5" />
      <rect className="tg-top-pyramid-avatar__tile tg-top-pyramid-avatar__tile--3" x="44" y="27" width="22" height="18" rx="5" />
      <rect className="tg-top-pyramid-avatar__tile tg-top-pyramid-avatar__tile--4" x="5" y="50" width="17" height="16" rx="4.5" />
      <rect className="tg-top-pyramid-avatar__tile tg-top-pyramid-avatar__tile--5" x="25" y="50" width="17" height="16" rx="4.5" />
      <rect className="tg-top-pyramid-avatar__tile tg-top-pyramid-avatar__tile--6" x="45" y="50" width="17" height="16" rx="4.5" />
      <rect className="tg-top-pyramid-avatar__tile tg-top-pyramid-avatar__tile--7" x="65" y="50" width="14" height="16" rx="4.5" />
    </svg>
  );
}
