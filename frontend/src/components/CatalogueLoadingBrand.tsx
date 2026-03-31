import { LOGO_COSMETISHOP_PNG } from "../brandAssets";

/** Loader marque CosmétiShop (logo PNG + anneau animé) pendant le chargement du catalogue. */
export function CatalogueLoadingBrand() {
  return (
    <div
      className="catalogue-loading-brand"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="catalogue-loading-brand-row catalogue-loading-brand-row--png">
        <img
          src={LOGO_COSMETISHOP_PNG}
          alt="CosmétiShop"
          className="catalogue-loading-brand-logo-png"
          decoding="async"
          width={240}
          height={80}
        />
        <span className="catalogue-loading-brand-sub">Chargement des produits…</span>
      </div>
      <div className="catalogue-loading-spinner-wrap" aria-hidden>
        <div className="catalogue-loading-spinner" />
      </div>
    </div>
  );
}
