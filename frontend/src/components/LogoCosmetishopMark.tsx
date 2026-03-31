import { useId } from "react";

/**
 * Logo CosmétiShop en SVG inline (affichage fiable sans requête vers /public).
 * L’id du dégradé est unique pour éviter les collisions si plusieurs instances.
 */
export function LogoCosmetishopMark({
  className,
  "aria-hidden": ariaHidden = true,
}: {
  className?: string;
  "aria-hidden"?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `csg-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ec4899" />
          <stop offset="0.55" stopColor="#f472b6" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill={`url(#${gradId})`} />
      <path
        fill="none"
        stroke="#ffffff"
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M44 19.5c-11.5 0-20 8.2-20 12.5s8.5 12.5 20 12.5"
        opacity={0.98}
      />
      <path
        fill="#ffffff"
        fillOpacity={0.9}
        d="M47.5 24.2 48.8 27l3.1.4-2.3 2.2.7 3.1-2.8-1.5-2.8 1.5.7-3.1-2.3-2.2 3.1-.4 1.3-2.8z"
      />
    </svg>
  );
}
