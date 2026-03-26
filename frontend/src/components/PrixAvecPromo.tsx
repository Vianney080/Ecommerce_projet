function formaterPrix(montant: number): string {
  return `${Number(montant).toFixed(2)} $`;
}

type Props = {
  prixUnitaire: number;
  prixBarre?: number | null;
  /** Carte produit compacte */
  variant?: "card" | "detail";
  className?: string;
};

/** Affichage type marketplace : prix barré + prix actuel + badge -X% si applicable */
export function PrixAvecPromo({ prixUnitaire, prixBarre, variant = "card", className = "" }: Props) {
  const pu = Number(prixUnitaire);
  const pb = prixBarre != null ? Number(prixBarre) : NaN;
  const afficherPromo = Number.isFinite(pu) && Number.isFinite(pb) && pb > pu;
  const pourcent =
    afficherPromo && pb > 0 ? Math.max(1, Math.min(99, Math.round((1 - pu / pb) * 100))) : null;

  const rootClass = `price-with-promo price-with-promo--${variant} ${className}`.trim();

  if (!afficherPromo) {
    return <span className={`${rootClass} price-with-promo--sans-promo`}>{formaterPrix(pu)}</span>;
  }

  return (
    <div className={rootClass}>
      <div className="price-with-promo-ligne">
        <span className="price-was" aria-label={`Ancien prix ${formaterPrix(pb)}`}>
          {formaterPrix(pb)}
        </span>
        {pourcent != null ? (
          <span className="price-discount-badge" aria-hidden="true">
            -{pourcent}%
          </span>
        ) : null}
      </div>
      <span className="price-now">{formaterPrix(pu)}</span>
    </div>
  );
}
