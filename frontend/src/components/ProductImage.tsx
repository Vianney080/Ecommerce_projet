import { useEffect, useMemo, useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
  /** Attribut `sizes` pour le navigateur (LCP / bande passante). */
  sizes?: string;
};

/** Affiche une image produit ; en cas d’échec (URL cassée, 404, blocage), repli visuel sans texte alt envahissant. */
export function ProductImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
}: Props) {
  const [broken, setBroken] = useState(false);
  const ok = Boolean(src?.trim()) && !broken;

  if (!ok) {
    return (
      <div
        className={`product-image-fallback ${className}`.trim()}
        role="img"
        aria-label={alt}
        title={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      {...(sizes ? { sizes } : {})}
      {...(fetchPriority ? { fetchPriority } : {})}
      onError={() => setBroken(true)}
    />
  );
}

type CascadeProps = {
  /** URLs déjà résolues (resolveAssetUrl) et idéalement triées par fiabilité */
  urls: string[];
  /** Index affiché (ex. carrousel au survol) : on essaie d’abord cette vignette, puis les suivantes si 404 */
  preferredIndex?: number;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
};

export function ProductImageCascade({
  urls,
  preferredIndex = 0,
  alt,
  className = "",
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
}: CascadeProps) {
  const ordreEssai = useMemo(() => {
    const u = urls.map((x) => String(x || "").trim()).filter(Boolean);
    if (!u.length) return [];
    const start = Math.max(0, Math.min(preferredIndex, u.length - 1));
    return [...u.slice(start), ...u.slice(0, start)];
  }, [urls, preferredIndex]);

  const [echecs, setEchecs] = useState(0);

  useEffect(() => {
    setEchecs(0);
  }, [JSON.stringify(ordreEssai)]);

  const src = ordreEssai[echecs] || "";

  if (!src) {
    return (
      <div
        className={`product-image-fallback ${className}`.trim()}
        role="img"
        aria-label={alt}
        title={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      {...(sizes ? { sizes } : {})}
      {...(fetchPriority ? { fetchPriority } : {})}
      onError={() => setEchecs((n) => n + 1)}
    />
  );
}
