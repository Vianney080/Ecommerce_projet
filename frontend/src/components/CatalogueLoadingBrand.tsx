/** Loader marque CosmétiShop (logo + anneau animé) pendant le chargement du catalogue. */
export function CatalogueLoadingBrand() {
  return (
    <div
      className="catalogue-loading-brand"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="catalogue-loading-brand-row">
        <span className="catalogue-loading-brand-icon" aria-hidden>
          💄
        </span>
        <div className="catalogue-loading-brand-text">
          <span className="catalogue-loading-brand-title">CosmétiShop</span>
          <span className="catalogue-loading-brand-sub">Chargement des produits…</span>
        </div>
      </div>
      <div className="catalogue-loading-spinner-wrap" aria-hidden>
        <div className="catalogue-loading-spinner" />
      </div>
    </div>
  );
}
