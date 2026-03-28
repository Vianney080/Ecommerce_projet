import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { api, resolveAssetUrl } from "./api";
import { ProductImageCascade } from "./components/ProductImage";
import { PrixAvecPromo } from "./components/PrixAvecPromo";
import { ajouterAuPanierInvite, lirePanierInvite, totalPanierInvite } from "./cartInvite";
import { Breadcrumb } from "./components/Breadcrumb";
import { useDocumentTitle, useMetaDescription } from "./hooks/useDocumentTitle";
import { basculerListeSouhaits, estDansListeSouhaits } from "./wishlistInvite";
import { NB_VIGNETES_IMAGES_PRIORITAIRES, trierUrlsImagesParFiabilite } from "./utils/imageUrlPriority";
import { buildPaginationItems } from "./utils/pagination";
import "./styles.css";

type TriAccueil = "recent" | "nom" | "prix_asc" | "prix_desc";

type Produit = {
  id: string | number;
  nom: string;
  categorie: string;
  prix: number;
  /** Prix « avant réduction », affiché barré si > prix de vente */
  prixBarre?: number;
  image: string;
  backendId?: string;
  description?: string;
  quantite?: number;
  seuilMinimum?: number;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt?: string;
};

type ItemPanier = {
  produitId: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
};

type PanierApi = {
  items: ItemPanier[];
  total: number;
};

type PanierFeedback = {
  texte: string;
  type: "success" | "error";
};

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

function normaliserTexte(valeur: string) {
  return valeur.trim().toLowerCase();
}

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

type Slide = {
  id: number;
  image: string;
  alt: string;
  surtitre?: string;
  titre?: string;
  sousTitre?: string;
  cta?: string;
};

// IMPORTANT:
// - Les 4 slides ci-dessous pointent vers des fichiers dans `frontend/public/slider/`.
// - Tu peux remplacer ces fichiers par TES captures (même noms), et ça s’affichera automatiquement.
const SLIDES: Slide[] = [
  {
    id: 1,
    image:
      "https://glowrabeautysupply.com/modules/bonslick/views/img/01c9b3b07d47def02f1eef5f6419be1746689089_slider%20new%20victoria2.jpg",
    alt: "Bannière promotionnelle 1",
    surtitre: "VICTORIA'S SECRET",
  },
  {
    id: 2,
    image:
      "https://glowrabeautysupply.com/modules/bonslick/views/img/bdc883460cb0cde06ca215bbc8efb3e639c54693_Prada3.jpg",
    alt: "Bannière promotionnelle 2",
    surtitre: "Maui",
  },
  {
    id: 3,
    image:
      "https://glowrabeautysupply.com/modules/bonslick/views/img/e2b2c2a2fcbf0be23c90414b963d9939ab588d46_slider%20new%20VIOLET.jpg",
    alt: "Bannière promotionnelle 3",
    surtitre: "Maison Maïssa",
  },
  {
    id: 4,
    image:
      "https://glowrabeautysupply.com/modules/bonslick/views/img/07349cd8d7654a755540f9eabf51a81b698a464b_slider%20new%201.jpg",
    alt: "Bannière promotionnelle 4",
    surtitre: "Violet Glow",
  },
];

const PRODUITS_PAR_PAGE = 8;

function App() {
  const { utilisateur, deconnexion } = useAuth();
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("Toutes");
  const [produitsBackend, setProduitsBackend] = useState<Produit[]>([]);
  /** Premier chargement : squelettes tant que l’API n’a pas répondu. */
  const [chargementInitialCatalogue, setChargementInitialCatalogue] = useState(true);
  const [catalogueAccueilErreur, setCatalogueAccueilErreur] = useState(false);
  const catalogueRecuAvecSuccesRef = useRef(false);
  const [itemsPanier, setItemsPanier] = useState<ItemPanier[]>([]);
  const [totalPanier, setTotalPanier] = useState(0);
  const [slideActif, setSlideActif] = useState(0);
  const [panierOuvert, setPanierOuvert] = useState(false);
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [messagePanier, setMessagePanier] = useState<PanierFeedback | null>(null);
  const [pageCourante, setPageCourante] = useState(1);
  const [triAccueil, setTriAccueil] = useState<TriAccueil>("recent");
  const [, setWishlistTick] = useState(0);
  const [suggestionsRechercheOuvertes, setSuggestionsRechercheOuvertes] = useState(false);
  /** Carrousel images au survol (une carte à la fois, pas de timer global) */
  const [hoverCarouselCarte, setHoverCarouselCarte] = useState<{
    id: string | number;
    n: number;
    i: number;
  } | null>(null);
  const sectionProduitsRef = useRef<HTMLElement | null>(null);
  const rechercheActivePrecedenteRef = useRef(false);

  const motsClesRecherche = useMemo(() => extraireMotsClesRecherche(recherche), [recherche]);
  const rechercheOuFiltreActif = recherche.trim() !== "" || categorie !== "Toutes";

  const produitsSource = useMemo(() => produitsBackend, [produitsBackend]);

  const categoriesDisponibles = useMemo(() => {
    return ["Toutes", ...Array.from(new Set(produitsSource.map((p) => p.categorie)))];
  }, [produitsSource]);

  useDocumentTitle("Accueil");
  useMetaDescription(
    "CosmétiShop : cosmétiques et soins en ligne. Parcourez le catalogue, liste d'envies et commande sécurisée."
  );

  useEffect(() => {
    const handler = () => setWishlistTick((n) => n + 1);
    window.addEventListener("wishlist-updated", handler);
    return () => window.removeEventListener("wishlist-updated", handler);
  }, []);

  useEffect(() => {
    const h = hoverCarouselCarte;
    if (!h || h.n <= 1) return;
    const timer = window.setInterval(() => {
      setHoverCarouselCarte((prev) => {
        if (!prev || prev.n <= 1) return prev;
        return { ...prev, i: (prev.i + 1) % prev.n };
      });
    }, 2200);
    return () => window.clearInterval(timer);
  }, [hoverCarouselCarte?.id, hoverCarouselCarte?.n]);

  const produitsFiltres = useMemo(() => {
    return produitsSource.filter((p) => {
      const nom = normaliserRecherche(p.nom);
      const cat = normaliserRecherche(p.categorie);
      const desc = normaliserRecherche(p.description || "");
      const okRecherche =
        motsClesRecherche.length === 0 ||
        motsClesRecherche.every(
          (motCle) => nom.includes(motCle) || cat.includes(motCle) || desc.includes(motCle)
        );
      const okCategorie = categorie === "Toutes" || p.categorie === categorie;
      return okRecherche && okCategorie;
    });
  }, [produitsSource, motsClesRecherche, categorie]);

  const produitsAffiches = useMemo(() => {
    const arr = [...produitsFiltres];
    switch (triAccueil) {
      case "nom":
        return arr.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
      case "prix_asc":
        return arr.sort((a, b) => (Number(a.prix) || 0) - (Number(b.prix) || 0));
      case "prix_desc":
        return arr.sort((a, b) => (Number(b.prix) || 0) - (Number(a.prix) || 0));
      case "recent":
      default:
        return arr.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : Number(a.id) || 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : Number(b.id) || 0;
          return tb - ta;
        });
    }
  }, [produitsFiltres, triAccueil]);

  const totalPagesProduits = useMemo(() => {
    return Math.ceil(produitsAffiches.length / PRODUITS_PAR_PAGE);
  }, [produitsAffiches.length]);

  const produitsAffichesPageCourante = useMemo(() => {
    const debut = (pageCourante - 1) * PRODUITS_PAR_PAGE;
    return produitsAffiches.slice(debut, debut + PRODUITS_PAR_PAGE);
  }, [produitsAffiches, pageCourante]);
  const pageProduitsCourte = produitsAffichesPageCourante.length > 0 && produitsAffichesPageCourante.length < 4;
  const paginationCompacteProduits = useMemo(() => {
    if (totalPagesProduits <= 0) return [];
    return buildPaginationItems(pageCourante, totalPagesProduits);
  }, [pageCourante, totalPagesProduits]);

  const suggestionsRecherche = useMemo(() => {
    const query = normaliserRecherche(recherche).trim();
    if (!query) return [];

    const base = [
      ...produitsSource.map((p) => p.nom),
      ...produitsSource.map((p) => p.categorie),
    ];

    const uniques = Array.from(new Set(base));
    const suggestions = uniques
      .filter((item) => normaliserRecherche(item).includes(query))
      .slice(0, 6);

    return suggestions;
  }, [recherche, produitsSource]);

  function appliquerPanier(panier: PanierApi) {
    setItemsPanier(panier.items || []);
    setTotalPanier(panier.total || 0);
  }

  const chargerProduitsBackend = useCallback(async (options?: { avecSquelettes?: boolean }) => {
    if (options?.avecSquelettes) {
      setChargementInitialCatalogue(true);
      setCatalogueAccueilErreur(false);
    }
    try {
      const res = await api.get<
        Array<{
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
          createdAt?: string;
        }>
      >("/produits");
      const mapped = res.data.map((p) => {
        const urlsBrutes = [
          ...(p.imageUrls || []).map((u) => resolveAssetUrl(u)),
          resolveAssetUrl(p.imageUrl),
        ].filter(Boolean);
        const urlsTriees = trierUrlsImagesParFiabilite(Array.from(new Set(urlsBrutes)));
        const pu = Number(p.prixUnitaire);
        const pb = p.prixBarre != null ? Number(p.prixBarre) : NaN;
        const prixBarre = Number.isFinite(pb) && Number.isFinite(pu) && pb > pu ? pb : undefined;
        return {
          id: p._id,
          backendId: p._id,
          nom: p.nom,
          description: p.description || "",
          categorie: p.categorie,
          quantite: p.quantite,
          prix: p.prixUnitaire,
          prixBarre,
          seuilMinimum: p.seuilMinimum,
          imageUrl: p.imageUrl,
          imageUrls: p.imageUrls || [],
          image: urlsTriees[0] || "",
          createdAt: p.createdAt,
        };
      });
      setProduitsBackend(mapped);
      catalogueRecuAvecSuccesRef.current = true;
      setCatalogueAccueilErreur(false);
    } catch {
      if (!catalogueRecuAvecSuccesRef.current) {
        setCatalogueAccueilErreur(true);
      }
    } finally {
      setChargementInitialCatalogue(false);
    }
  }, []);

  async function chargerPanier() {
    if (!utilisateur) {
      const itemsInvites = lirePanierInvite();
      setItemsPanier(itemsInvites);
      setTotalPanier(totalPanierInvite(itemsInvites));
      return;
    }
    try {
      const res = await api.get<PanierApi>("/panier");
      appliquerPanier(res.data);
    } catch {
      setItemsPanier([]);
      setTotalPanier(0);
    }
  }

  async function ajouterAuPanier(produit: Produit) {
    setMessagePanier(null);
    if (!utilisateur) {
      const produitId = String(produit.backendId || produit.id);
      const dejaPresent = lirePanierInvite().some((it) => it.produitId === produitId);
      const stockDisponible = Number(produit.quantite);
      const maxQuantite = Number.isFinite(stockDisponible) ? Math.max(0, stockDisponible) : undefined;
      const ok = ajouterAuPanierInvite(
        {
          produitId,
          nomProduit: produit.nom,
          prixUnitaire: produit.prix,
          imageUrl: produit.image,
        },
        1,
        maxQuantite
      );
      if (!ok) {
        setMessagePanier({
          texte: "Stock insuffisant pour ce produit.",
          type: "error",
        });
        return;
      }
      await chargerPanier();
      setMessagePanier({
        texte: dejaPresent
          ? "Quantité mise à jour dans votre panier."
          : "Article ajouté au panier avec succès.",
        type: "success",
      });
      return;
    }
    const produitBackendId =
      produit.backendId ||
      produitsBackend.find(
        (p) =>
          normaliserTexte(p.nom) === normaliserTexte(produit.nom) &&
          normaliserTexte(p.categorie) === normaliserTexte(produit.categorie)
      )?.backendId ||
      produitsBackend.find((p) => normaliserTexte(p.nom) === normaliserTexte(produit.nom))?.backendId;

    if (!produitBackendId) {
      setMessagePanier({
        texte: "Article indisponible pour le panier. Actualisez la page.",
        type: "error",
      });
      return;
    }

    try {
      const dejaPresent = itemsPanier.some((it) => it.produitId === String(produitBackendId));
      const res = await api.post<{ message?: string; panier: PanierApi }>("/panier/ajouter", {
        produitId: produitBackendId,
        quantite: 1,
      });
      appliquerPanier(res.data.panier);
      setMessagePanier({
        texte:
          res.data.message ||
          (dejaPresent
            ? "Quantité mise à jour dans votre panier."
            : "Article ajouté au panier avec succès."),
        type: "success",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de l'ajout au panier.";
      setMessagePanier({ texte: msg, type: "error" });
    }
  }

  const formatCAD = useMemo(() => {
    return (montant: number) => `${montant.toFixed(2)} $`;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlideActif((i) => (i + 1) % SLIDES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    chargerProduitsBackend();
    chargerPanier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur, chargerProduitsBackend]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      chargerProduitsBackend();
    }, 180000);
    return () => window.clearInterval(intervalId);
  }, [chargerProduitsBackend]);

  useEffect(() => {
    if (!messagePanier) return;
    const id = window.setTimeout(() => setMessagePanier(null), 3200);
    return () => window.clearTimeout(id);
  }, [messagePanier]);

  useEffect(() => {
    const rechercheVientDEtreActivee =
      rechercheOuFiltreActif && !rechercheActivePrecedenteRef.current;

    if (rechercheVientDEtreActivee) {
      sectionProduitsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    rechercheActivePrecedenteRef.current = rechercheOuFiltreActif;
  }, [rechercheOuFiltreActif]);

  useEffect(() => {
    setPageCourante(1);
  }, [motsClesRecherche, categorie, triAccueil]);

  useEffect(() => {
    if (totalPagesProduits <= 0) return;
    setPageCourante((page) => Math.min(page, totalPagesProduits));
  }, [totalPagesProduits]);

  function slidePrecedent() {
    setSlideActif((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  }

  function slideSuivant() {
    setSlideActif((i) => (i + 1) % SLIDES.length);
  }

  function allerAccueil() {
    setRecherche("");
    setCategorie("Toutes");
    setPageCourante(1);
    setMenuMobileOuvert(false);
  }

  function fermerMenuMobile() {
    setMenuMobileOuvert(false);
  }

  function appliquerSuggestionRecherche(valeur: string) {
    setRecherche(valeur);
    setPageCourante(1);
    setSuggestionsRechercheOuvertes(false);
  }

  const initialesUtilisateur = useMemo(() => {
    if (!utilisateur?.nom) return "U";
    const parts = utilisateur.nom.trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  }, [utilisateur]);
  const avatarUtilisateur = resolveAssetUrl(utilisateur?.avatarUrl);

  return (
    <div className="app" id="accueil">
      {/* Barre de navigation */}
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
            <button
              type="button"
              className="nav-mobile-toggle"
              aria-label={menuMobileOuvert ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuMobileOuvert}
              onClick={() => setMenuMobileOuvert((ouvert) => !ouvert)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
          <div className={`nav-center ${menuMobileOuvert ? "is-open" : ""}`}>
            <a href="#accueil" className="nav-link" onClick={allerAccueil}>
              Accueil
            </a>
            <a href="#produits" className="nav-link" onClick={fermerMenuMobile}>
              Produits
            </a>
            <Link to="/espace-client" className="nav-link" onClick={fermerMenuMobile}>
              Espace client
            </Link>
            <Link to="/catalogue" className="nav-link" onClick={fermerMenuMobile}>
              Catalogue
            </Link>
            <Link to="/liste-souhaits" className="nav-link" onClick={fermerMenuMobile}>
              Liste d&apos;envies
            </Link>
            {utilisateur && (
              <Link to="/commandes" className="nav-link" onClick={fermerMenuMobile}>
                Commandes
              </Link>
            )}
            {utilisateur?.role === "admin" && (
              <>
                <Link to="/admin/dashboard" className="nav-link" onClick={fermerMenuMobile}>
                  Admin
                </Link>
                <Link to="/admin/commandes" className="nav-link" onClick={fermerMenuMobile}>
                  Cmd admin
                </Link>
              </>
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
            <div
              className={`nav-cart ${itemsPanier.length > 0 ? "nav-cart-has-items" : ""}`}
              onClick={() => setPanierOuvert((ouvert) => !ouvert)}
            >
              <span className="nav-cart-icon">🛒</span>
              {itemsPanier.length > 0 && (
                <span className="nav-cart-badge">
                  {itemsPanier.reduce((acc, it) => acc + it.quantite, 0)}
                </span>
              )}
              <span className="nav-cart-info">
                Mon panier – {formatCAD(totalPanier)}
              </span>
              {panierOuvert && (
                <div className="nav-cart-panel">
                  {itemsPanier.length === 0 ? (
                    <p className="nav-cart-empty">Votre panier est vide.</p>
                  ) : (
                    <>
                      <ul className="nav-cart-list">
                        {itemsPanier.map((it) => (
                          <li key={it.produitId} className="nav-cart-item">
                            <span className="nav-cart-item-name">
                              {it.nomProduit} x {it.quantite}
                            </span>
                            <span className="nav-cart-item-price">
                              {formatCAD(it.prixUnitaire * it.quantite)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="nav-cart-total">
                        <span>Total</span>
                        <span>{formatCAD(totalPanier)}</span>
                      </div>
                      <Link to="/panier" className="nav-link">
                        Voir mon panier
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Barre de recherche + filtre catégorie intégrées au navbar */}
        <div className="nav-filters">
          <div className="search-autocomplete">
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setSuggestionsRechercheOuvertes(true);
              }}
              onFocus={() => setSuggestionsRechercheOuvertes(true)}
              onBlur={() => window.setTimeout(() => setSuggestionsRechercheOuvertes(false), 120)}
              className="products-search"
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
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="products-select"
          >
            {categoriesDisponibles.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={triAccueil}
            onChange={(e) => setTriAccueil(e.target.value as TriAccueil)}
            className="products-select products-select-tri"
            aria-label="Trier les produits"
          >
            <option value="recent">Plus recents</option>
            <option value="nom">Nom (A-Z)</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix decroissant</option>
          </select>
        </div>
      </nav>

      <div className="breadcrumb-wrap">
        <Breadcrumb
          items={[
            { label: "Accueil", to: "/" },
            { label: "Boutique" },
          ]}
        />
      </div>

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

      {/* Slider (4 images) sous la navbar – masqué lorsqu'il y a une recherche */}
      {!rechercheOuFiltreActif && (
        <header className="slider" aria-label="Bannières promotionnelles">
          <div className="slider-inner">
            <div className="slider-stage">
              <div
                className="slider-track"
                style={{ transform: `translateX(-${slideActif * 100}%)` }}
              >
                {SLIDES.map((s) => (
                  <div className="slider-slide" key={s.id}>
                    <img className="slider-image" src={s.image} alt={s.alt} />
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="slider-arrow slider-arrow-left"
                onClick={slidePrecedent}
                aria-label="Slide précédent"
              >
                ‹
              </button>
              <button
                type="button"
                className="slider-arrow slider-arrow-right"
                onClick={slideSuivant}
                aria-label="Slide suivant"
              >
                ›
              </button>
            </div>

            <div className="slider-dots" role="tablist" aria-label="Sélection du slide">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`slider-dot ${idx === slideActif ? "is-active" : ""}`}
                  onClick={() => setSlideActif(idx)}
                  aria-label={`Aller au slide ${idx + 1}`}
                  aria-selected={idx === slideActif}
                  role="tab"
                />
              ))}
            </div>
          </div>
        </header>
      )}

      {/* Section Produits */}
      <section ref={sectionProduitsRef} className="section section-products" id="produits">
        <div className="section-header">
          <h2>Nos produits cosmétiques</h2>
          <p>
            Parcourez notre catalogue et ajoutez vos articles préférés au panier lié à votre
            compte client.
          </p>
        </div>
        <div
          className={`products-grid ${pageProduitsCourte ? "is-short-page" : ""}${chargementInitialCatalogue ? " products-grid--skeleton" : ""}`}
          aria-busy={chargementInitialCatalogue}
        >
          {chargementInitialCatalogue
            ? Array.from({ length: PRODUITS_PAR_PAGE }, (_, sk) => (
                <article
                  key={`catalogue-skeleton-${sk}`}
                  className="product-card product-card--skeleton"
                  aria-hidden="true"
                >
                  <div className="product-card-skeleton-image" />
                  <div className="product-card-skeleton-body">
                    <div className="product-card-skeleton-line product-card-skeleton-line--cat" />
                    <div className="product-card-skeleton-line product-card-skeleton-line--title" />
                    <div className="product-card-skeleton-line product-card-skeleton-line--price" />
                    <div className="product-card-skeleton-actions">
                      <span className="product-card-skeleton-btn" />
                      <span className="product-card-skeleton-btn product-card-skeleton-btn--ghost" />
                    </div>
                  </div>
                </article>
              ))
            : null}
          {!chargementInitialCatalogue &&
            produitsAffichesPageCourante.map((produit, index) => {
            const imagesCarte = trierUrlsImagesParFiabilite(
              Array.from(
                new Set(
                  [...(produit.imageUrls || []), produit.imageUrl]
                    .filter(Boolean)
                    .map((u) => resolveAssetUrl(String(u)))
                )
              )
            );
            const survolCetteCarte =
              hoverCarouselCarte?.id === produit.id && imagesCarte.length > 1;
            const indexImageAffichee =
              imagesCarte.length > 0
                ? survolCetteCarte
                  ? hoverCarouselCarte!.i % imagesCarte.length
                  : 0
                : 0;
            const stockDisponible = Number(produit.quantite);
            const ruptureStock = Number.isFinite(stockDisponible) && stockDisponible <= 0;

            const idListe = String(produit.backendId || produit.id);
            const chargementImagePrioritaire = index < NB_VIGNETES_IMAGES_PRIORITAIRES;
            return (
              <article key={produit.id} className="product-card">
                <div
                  className="product-image-wrapper"
                  onMouseEnter={() => {
                    if (imagesCarte.length <= 1) return;
                    setHoverCarouselCarte({ id: produit.id, n: imagesCarte.length, i: 0 });
                  }}
                  onMouseLeave={() => {
                    setHoverCarouselCarte((prev) => (prev?.id === produit.id ? null : prev));
                  }}
                >
                  <button
                    type="button"
                    className="product-wishlist-btn"
                    aria-label={
                      estDansListeSouhaits(idListe)
                        ? "Retirer de la liste d'envies"
                        : "Ajouter a la liste d'envies"
                    }
                    onClick={() => {
                      basculerListeSouhaits(idListe);
                      setWishlistTick((t) => t + 1);
                    }}
                  >
                    {estDansListeSouhaits(idListe) ? "♥" : "♡"}
                  </button>
                  {ruptureStock && <span className="stock-out-badge">Rupture de stock</span>}
                  {imagesCarte.length > 0 ? (
                    <ProductImageCascade
                      key={produit.id}
                      urls={imagesCarte}
                      preferredIndex={indexImageAffichee}
                      alt={produit.nom}
                      className="product-image"
                      loading={chargementImagePrioritaire ? "eager" : "lazy"}
                      decoding="async"
                      fetchPriority={chargementImagePrioritaire ? "high" : undefined}
                    />
                  ) : (
                    <div className="product-image product-image-fallback" aria-hidden="true" />
                  )}
                  {imagesCarte.length > 1 && (
                    <>
                      <div className="product-image-carousel-dots" aria-hidden="true">
                        {imagesCarte.map((_, idx) => (
                          <span
                            key={`${produit.id}-dot-${idx}`}
                            className={`product-image-dot ${idx === indexImageAffichee ? "is-active" : ""}`}
                          />
                        ))}
                      </div>
                      <span className="product-image-multi-badge" title={`${imagesCarte.length} photos`}>
                        +{imagesCarte.length - 1}
                      </span>
                    </>
                  )}
                </div>
                <div className="product-content">
                  <p className="product-category">{produit.categorie}</p>
                  <h3 className="product-title">{produit.nom}</h3>
                  <div className="product-price">
                    <PrixAvecPromo prixUnitaire={produit.prix} prixBarre={produit.prixBarre} variant="card" />
                  </div>
                  <div className="product-actions">
                    <button
                      className="btn btn-product"
                      onClick={() => ajouterAuPanier(produit)}
                      disabled={ruptureStock}
                    >
                      {ruptureStock ? "Rupture de stock" : "Ajouter au panier"}
                    </button>
                    <Link
                      to={`/produit/${produit.backendId || produit.id}`}
                      state={{ produit }}
                      className="btn btn-product btn-product-secondary"
                    >
                      Voir produit
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
          {!chargementInitialCatalogue && catalogueAccueilErreur && produitsBackend.length === 0 ? (
            <div className="products-empty products-empty-state" role="status">
              <p className="products-empty-title">Catalogue indisponible</p>
              <p className="products-empty-hint">
                Vérifiez votre connexion ou que l’API est démarrée, puis réessayez.
              </p>
              <button
                type="button"
                className="btn btn-product products-empty-retry"
                onClick={() => void chargerProduitsBackend({ avecSquelettes: true })}
              >
                Réessayer
              </button>
            </div>
          ) : null}
          {!chargementInitialCatalogue &&
          !catalogueAccueilErreur &&
          produitsBackend.length === 0 &&
          produitsFiltres.length === 0 ? (
            <div className="products-empty products-empty-state" role="status">
              <p className="products-empty-title">Aucun produit pour le moment</p>
              <p className="products-empty-hint">
                Les articles ajoutés dans l’administration s’affichent ici automatiquement, avec leurs photos.
              </p>
            </div>
          ) : null}
          {!chargementInitialCatalogue &&
          produitsBackend.length > 0 &&
          produitsFiltres.length === 0 ? (
            <p className="products-empty">Aucun produit ne correspond à votre recherche ou à ce filtre.</p>
          ) : null}
        </div>
        {!chargementInitialCatalogue && produitsFiltres.length > 0 && totalPagesProduits > 1 ? (
          <div className="products-pagination">
            <p className="products-pagination-info">
              Page {pageCourante} sur {totalPagesProduits}
            </p>
            <div className="products-pagination-controls">
              <button
                type="button"
                className="products-pagination-btn"
                onClick={() => setPageCourante((page) => Math.max(1, page - 1))}
                disabled={pageCourante === 1}
              >
                Precedent
              </button>
              {paginationCompacteProduits.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="products-pagination-ellipsis"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`products-pagination-btn ${item === pageCourante ? "is-active" : ""}`}
                    onClick={() => setPageCourante(item)}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                className="products-pagination-btn"
                onClick={() =>
                  setPageCourante((page) => Math.min(totalPagesProduits, page + 1))
                }
                disabled={pageCourante === totalPagesProduits}
              >
                Suivant
              </button>
            </div>
          </div>
        ) : null}
      </section>

    </div>
  );
}

export default App;
