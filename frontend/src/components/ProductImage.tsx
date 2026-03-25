import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
};

/** Affiche une image produit ; en cas d’échec (URL cassée, 404, blocage), repli visuel sans texte alt envahissant. */
export function ProductImage({ src, alt, className = "", loading = "lazy", decoding = "async" }: Props) {
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
      onError={() => setBroken(true)}
    />
  );
}
