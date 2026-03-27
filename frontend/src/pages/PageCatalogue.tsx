import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, resolveAssetUrl } from "../api";
import { ProductImageCascade } from "../components/ProductImage";
import { useAuth } from "../AuthContext";
import { ajouterAuPanierInvite, lirePanierInvite } from "../cartInvite";
import { Breadcrumb } from "../components/Breadcrumb";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import {
  NB_VIGNETES_IMAGES_PRIORITAIRES,
  trierUrlsImagesParFiabilite,
} from "../utils/imageUrlPriority";
import { PrixAvecPromo } from "../components/PrixAvecPromo";
import "../styles.css";

interface Categorie {
  _id: string;
  nom: string;
}

interface Produit {
  _id: string;
  nom: string;
  description?: string;
  categorie: string;
  quantite: number;
  prixUnitaire: number;
  prixBarre?: number | null;
  seuilMinimum: number;
  imageUrl?: string;
  imageUrls?: string[];
}

type PanierFeedback = {
  texte: string;
  type: "success" | "error";
};

const MOTS_VIDES_RECHERCHE = new Set([
  "a",
  "au",
  "aux",
  "de",
  "des",
  "du",
  "et",
  "en",
  "l",
  "la",
  "le",
  "les",
  "ou",
  "pour",
  "sur",
  "un",
  "une",
]);

function normaliserRecherche(valeur: string) {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extraireMotsClesRecherche(valeur: string) {
  const texte = normaliserRecherche(valeur).replace(/[^a-z0-9\s-]/g, " ");
  const tokens = texte
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 1 && !MOTS_VIDES_RECHERCHE.has(t));
  return Array.from(new Set(tokens));
}

function FeedbackIcon({ type }: { type: "success" | "error" }) {
  if (type === "error") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 7 10 17l-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PRODUITS_PAR_PAGE = 8;

export function PageCatalogue() {
  const { utilisateur, deconnexion } = useAuth();
  useDocumentTitle("Catalogue");
  useMetaDescription(
    "Catalogue CosmétiShop : parcourez les cosmétiques par catégorie, filtrez et ajoutez au panier."
  );
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [rechercheInput, setRechercheInput] = useState("");
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("");
  const [stockBas, setStockBas] = useState(false);
  const [tri, setTri] = useState<"" | "nom" | "quantite" | "categorie" | "prix_asc" | "prix_desc">("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [messagePanier, setMessagePanier] = useState<PanierFeedback | null>(null);
  const [pageCourante, setPageCourante] = useState(1);
  const [suggestionsRechercheOuvertes, setSuggestionsRechercheOuvertes] = useState(false);

  async function chargerProduits() {
    setLoading(true);
    setErreur(null);
    try {
      const params: any = {};
      if (recherche) params.recherche = recherche;
      if (categorie) params.categorie = categorie;
      if (stockBas) params.stockBas = "true";
      if (tri) params.tri = tri;
      const res = await api.get<Produit[]>("/produits", { params });
      setProduits(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors du chargement des produits";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  async function chargerCategories() {
    try {
      const res = await api.get<Categorie[]>("/categories");
      setCategories(res.data);
    } catch {
      // silencieux, pas bloquant
    }
  }

  useEffect(() => {
    chargerCategories();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const motsCles = extraireMotsClesRecherche(rechercheInput);
      setRecherche(motsCles.join(" "));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [rechercheInput]);

  useEffect(() => {
    chargerProduits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, categorie, stockBas, tri]);

  async function ajouterAuPanier(produitId: string) {
    setMessagePanier(null);
    const produit = produits.find((p) => p._id === produitId);
    if (!produit) return;

    if (!utilisateur) {
      const dejaPresent = lirePanierInvite().some((it) => it.produitId === produit._id);
      const ok = ajouterAuPanierInvite(
        {
          produitId: produit._id,
          nomProduit: produit.nom,
          prixUnitaire: produit.prixUnitaire,
          imageUrl: produit.imageUrl,
        },
        1,
        Math.max(0, Number(produit.quantite) || 0)
      );
      if (!ok) {
        setMessagePanier({
          texte: `Stock insuffisant pour ${produit.nom}.`,
          type: "error",
        });
        return;
      }
      setMessagePanier({
        texte: dejaPresent
          ? "Quantité mise à jour dans votre panier."
          : "Article ajouté au panier avec succès.",
        type: "success",
      });
      return;
    }

    try {
      const res = await api.post("/panier/ajouter", { produitId, quantite: 1 });
      setMessagePanier({
        texte: res.data?.message || "Article ajouté au panier avec succès.",
        type: "success",
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de l'ajout au panier";
      setMessagePanier({ texte: msg, type: "error" });
    }
  }

  const initialesUtilisateur = utilisateur?.nom
    ? utilisateur.nom
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("")
    : "U";
  const avatarUtilisateur = resolveAssetUrl(utilisateur?.avatarUrl);

  const totalProduits = useMemo(() => produits.length, [produits]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(produits.length / PRODUITS_PAR_PAGE)),
    [produits.length]
  );
  const produitsPageCourante = useMemo(() => {
    const debut = (pageCourante - 1) * PRODUITS_PAR_PAGE;
    return produits.slice(debut, debut + PRODUITS_PAR_PAGE);
  }, [produits, pageCourante]);
  const pageCatalogueCourte = produitsPageCourante.length > 0 && produitsPageCourante.length < 4;
  const paginationCompacte = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages]);
    const debutFenetre = Math.max(2, pageCourante - 1);
    const finFenetre = Math.min(totalPages - 1, pageCourante + 1);

    for (let page = debutFenetre; page <= finFenetre; page += 1) {
      pages.add(page);
    }

    // On force aussi une page proche du début/fin pour une navigation plus fluide.
    if (pageCourante <= 3) pages.add(2);
    if (pageCourante >= totalPages - 2) pages.add(totalPages - 1);

    const pagesTriees = Array.from(pages).sort((a, b) => a - b);
    const resultat: Array<number | "ellipsis"> = [];

    for (let i = 0; i < pagesTriees.length; i += 1) {
      const page = pagesTriees[i];
      const pagePrecedente = pagesTriees[i - 1];
      if (pagePrecedente && page - pagePrecedente > 1) {
        resultat.push("ellipsis");
      }
      resultat.push(page);
    }

    return resultat;
  }, [pageCourante, totalPages]);

  const suggestionsRecherche = useMemo(() => {
    const query = normaliserRecherche(rechercheInput).trim();
    if (!query) return [];

    const base = [...produits.map((p) => p.nom), ...categories.map((c) => c.nom)];
    const suggestions = Array.from(new Set(base))
      .filter((item) => normaliserRecherche(item).includes(query))
      .slice(0, 6);
    return suggestions;
  }, [rechercheInput, produits, categories]);

  function appliquerSuggestionRecherche(valeur: string) {
    setRechercheInput(valeur);
    setPageCourante(1);
    setSuggestionsRechercheOuvertes(false);
  }

  useEffect(() => {
    setPageCourante(1);
  }, [recherche, categorie, stockBas, tri]);

  useEffect(() => {
    if (!messagePanier) return;
    const id = window.setTimeout(() => setMessagePanier(null), 3200);
    return () => window.clearTimeout(id);
  }, [messagePanier]);

  useEffect(() => {
    setPageCourante((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <div className="catalogue-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <div className="nav-logo">
              <span className="nav-logo-icon">💄</span>
              <div className="nav-logo-text">
                <span className="nav-logo-title">CosmétiShop</span>
                <span className="nav-logo-subtitle">Boutique de produits cosmétiques</span>
              </div>
            </div>
          </div>
          <div className="nav-center">
            <Link to="/" className="nav-link">
              Accueil
            </Link>
            <Link to="/catalogue" className="nav-link">
              Catalogue
            </Link>
            <Link to="/panier" className="nav-link">
              Panier
            </Link>
            <Link to="/liste-souhaits" className="nav-link">
              Liste d&apos;envies
            </Link>
            {utilisateur && (
              <Link to="/commandes" className="nav-link">
                Commandes
              </Link>
            )}
          </div>
          <div className="nav-right">
            {utilisateur ? (
              <>
                <Link to="/profil" className="nav-user-pill nav-user-pill-link" title={utilisateur.email}>
                  <span className="nav-user-avatar">
                    {avatarUtilisateur ? (
                      <img src={avatarUtilisateur} alt={utilisateur.nom} className="nav-user-avatar-image" />
                    ) : (
                      initialesUtilisateur
                    )}
                  </span>
                  <span className="nav-user-meta">
                    <span className="nav-user-name">{utilisateur.nom}</span>
                    <span className="nav-user-role">{utilisateur.role}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="nav-auth-btn nav-auth-btn-logout"
                  onClick={deconnexion}
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/connexion" className="nav-auth-btn nav-auth-link">
                  Se connecter
                </Link>
                <Link to="/inscription" className="nav-auth-btn nav-auth-btn-primary nav-auth-link">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {messagePanier && (
        <div className="top-feedback-wrap is-right is-floating">
          <div className={`top-feedback ${messagePanier.type === "error" ? "top-feedback-error" : "top-feedback-success"}`}>
            <span className="top-feedback-icon">
              <FeedbackIcon type={messagePanier.type} />
            </span>
            <span>{messagePanier.texte}</span>
          </div>
        </div>
      )}

      <main className="catalogue-shell">
        <div className="breadcrumb-wrap">
          <Breadcrumb
            items={[
              { label: "Accueil", to: "/" },
              { label: "Catalogue" },
            ]}
          />
        </div>
        <section className="catalogue-hero">
          <div className="catalogue-hero-text">
            <p className="catalogue-kicker">Catalogue premium</p>
            <h1 className="catalogue-title">Catalogue</h1>
            <p className="catalogue-subtitle">
              Consultez les produits, filtrez par categorie et ajoutez vos articles en un clic.
            </p>
            <p className="catalogue-mode">
              {utilisateur
                ? "Mode compte actif: vos ajouts sont lies a votre panier personnel."
                : "Mode invite: vos ajouts sont conserves sur ce navigateur."}
            </p>
          </div>
          <div className="catalogue-hero-stats">
            <p className="catalogue-hero-stat-label">Produits affiches</p>
            <p className="catalogue-hero-stat-value">{totalProduits}</p>
          </div>
        </section>

        <section className="catalogue-filters">
          <div className="catalogue-filter-field">
            <label>Recherche</label>
            <div className="search-autocomplete">
              <input
                value={rechercheInput}
                onChange={(e) => {
                  setRechercheInput(e.target.value);
                  setSuggestionsRechercheOuvertes(true);
                }}
                onFocus={() => setSuggestionsRechercheOuvertes(true)}
                onBlur={() => window.setTimeout(() => setSuggestionsRechercheOuvertes(false), 120)}
                placeholder="Nom du produit..."
                className="catalogue-input"
              />
              {suggestionsRechercheOuvertes && suggestionsRecherche.length > 0 && (
                <div className="search-autocomplete-menu">
                  {suggestionsRecherche.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="search-autocomplete-item"
                      onClick={() => appliquerSuggestionRecherche(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="catalogue-filter-field">
            <label>Categorie</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="catalogue-select"
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c._id} value={c.nom}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="catalogue-filter-field">
            <label>Trier par</label>
            <select
              value={tri}
              onChange={(e) => setTri(e.target.value as any)}
              className="catalogue-select"
            >
              <option value="">Recent</option>
              <option value="nom">Nom</option>
              <option value="prix_asc">Prix croissant</option>
              <option value="prix_desc">Prix decroissant</option>
              <option value="quantite">Quantite</option>
              <option value="categorie">Categorie</option>
            </select>
          </div>
          <label className="catalogue-checkbox">
            <input
              type="checkbox"
              checked={stockBas}
              onChange={(e) => setStockBas(e.target.checked)}
            />
            <span>Afficher uniquement le stock bas</span>
          </label>
        </section>

        {erreur && <div className="catalogue-alert catalogue-alert-error">{erreur}</div>}
        {loading ? (
          <p className="catalogue-state">Chargement des produits...</p>
        ) : (
          <>
            <section className={`catalogue-grid ${pageCatalogueCourte ? "is-short-page" : ""}`}>
              {produitsPageCourante.map((p, index) => {
                const isStockBas = p.quantite < p.seuilMinimum;
                const ruptureStock = Number(p.quantite) <= 0;
                const chargementImagePrioritaire = index < NB_VIGNETES_IMAGES_PRIORITAIRES;
                const imagesCarte = trierUrlsImagesParFiabilite(
                  Array.from(
                    new Set(
                      [...(p.imageUrls || []), p.imageUrl]
                        .filter(Boolean)
                        .map((u) => resolveAssetUrl(String(u)))
                    )
                  )
                );
                return (
                  <article key={p._id} className="catalogue-card">
                    <div className="catalogue-card-image-wrap">
                      {ruptureStock && <span className="stock-out-badge">Rupture de stock</span>}
                      {imagesCarte.length > 0 ? (
                        <ProductImageCascade
                          urls={imagesCarte}
                          preferredIndex={0}
                          alt={p.nom}
                          className="catalogue-card-image"
                          loading={chargementImagePrioritaire ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={chargementImagePrioritaire ? "high" : undefined}
                        />
                      ) : (
                        <div className="catalogue-card-image catalogue-card-image-placeholder" />
                      )}
                      {imagesCarte.length > 1 && (
                        <span className="product-image-multi-badge" title={`${imagesCarte.length} photos`}>
                          +{imagesCarte.length - 1}
                        </span>
                      )}
                    </div>
                    <div className="catalogue-card-content">
                      <p className="catalogue-card-category">{p.categorie}</p>
                      <h2 className="catalogue-card-title">{p.nom}</h2>
                      <div className="catalogue-card-meta">
                        <span className="catalogue-card-price">
                          <PrixAvecPromo
                            prixUnitaire={p.prixUnitaire}
                            prixBarre={p.prixBarre}
                            variant="card"
                          />
                        </span>
                        <span className={`catalogue-stock-badge ${isStockBas ? "is-low" : "is-ok"}`}>
                          Stock: {p.quantite}
                        </span>
                      </div>
                      <p className="catalogue-card-threshold">Seuil minimum: {p.seuilMinimum}</p>
                      <div className="catalogue-actions">
                        <button
                          onClick={() => ajouterAuPanier(p._id)}
                          className="catalogue-btn"
                          disabled={ruptureStock}
                        >
                          {ruptureStock ? "Rupture de stock" : "Ajouter au panier"}
                        </button>
                        <Link
                          to={`/produit/${p._id}`}
                          state={{ produit: p }}
                          className="catalogue-btn catalogue-btn-secondary"
                        >
                          Voir produit
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!loading && produits.length === 0 && (
                <p className="catalogue-state">Aucun produit trouve avec ces filtres.</p>
              )}
            </section>
            {produits.length > 0 && totalPages > 1 && (
              <div className="catalogue-pagination">
                <p className="catalogue-pagination-info">
                  Page {pageCourante} sur {totalPages}
                </p>
                <div className="catalogue-pagination-controls">
                  <button
                    type="button"
                    className="catalogue-pagination-btn"
                    onClick={() => setPageCourante((page) => Math.max(1, page - 1))}
                    disabled={pageCourante === 1}
                  >
                    Precedent
                  </button>
                  {paginationCompacte.map((item, index) =>
                    item === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="catalogue-pagination-ellipsis">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        className={`catalogue-pagination-btn ${item === pageCourante ? "is-active" : ""}`}
                        onClick={() => setPageCourante(item)}
                      >
                        {item}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="catalogue-pagination-btn"
                    onClick={() => setPageCourante((page) => Math.min(totalPages, page + 1))}
                    disabled={pageCourante === totalPages}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

