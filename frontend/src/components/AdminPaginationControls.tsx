import { useMemo } from "react";
import { buildPaginationItems } from "../utils/pagination";

export type AdminPaginationControlsProps = {
  pageCourante: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Libellé accessibilité du bloc */
  ariaLabel?: string;
  /** Mot au singulier pour le compteur (ex. « produit », « utilisateur », « commande ») */
  entiteSingulier?: string;
  entitePluriel?: string;
};

export function AdminPaginationControls({
  pageCourante,
  totalItems,
  pageSize,
  onPageChange,
  ariaLabel = "Pagination",
  entiteSingulier = "élément",
  entitePluriel,
}: AdminPaginationControlsProps) {
  const pluriel = entitePluriel ?? `${entiteSingulier}s`;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const p = Math.min(Math.max(1, pageCourante), totalPages);

  const compact = useMemo(() => buildPaginationItems(p, totalPages), [p, totalPages]);

  const debut = totalItems === 0 ? 0 : (p - 1) * pageSize + 1;
  const fin = Math.min(p * pageSize, totalItems);

  if (totalItems === 0) {
    return null;
  }

  const libelleCount = totalItems === 1 ? `1 ${entiteSingulier}` : `${totalItems} ${pluriel}`;

  return (
    <nav className="admin-pagination" aria-label={ariaLabel}>
      <p className="admin-pagination-info">
        {totalPages > 1 ? (
          <>
            Affichage <strong>{debut}</strong>–<strong>{fin}</strong> sur {totalItems} · Page {p} /{" "}
            {totalPages}
          </>
        ) : (
          <>{libelleCount} — tout affiché sur une page.</>
        )}
      </p>
      {totalPages > 1 ? (
        <div className="admin-pagination-controls">
          <button
            type="button"
            className="admin-pagination-btn"
            disabled={p <= 1}
            onClick={() => onPageChange(p - 1)}
          >
            Précédent
          </button>
          {compact.map((item, index) =>
            item === "ellipsis" ? (
              <span key={`e-${index}`} className="admin-pagination-ellipsis" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`admin-pagination-btn ${item === p ? "is-active" : ""}`}
                onClick={() => onPageChange(item)}
                aria-current={item === p ? "page" : undefined}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            className="admin-pagination-btn"
            disabled={p >= totalPages}
            onClick={() => onPageChange(p + 1)}
          >
            Suivant
          </button>
        </div>
      ) : null}
    </nav>
  );
}
