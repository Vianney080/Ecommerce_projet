import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type Ref,
  type SetStateAction,
} from "react";
import { Link } from "react-router-dom";
import { api, resolveAssetUrl } from "../api";
import { useAuth } from "../AuthContext";
import { lirePanierInvite, totalPanierInvite } from "../cartInvite";

export type ClientNavItemPanier = {
  produitId: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
  /** Présent quand l’API ou le panier invité fournit une image */
  imageUrl?: string;
};

type PanierApi = {
  items: ClientNavItemPanier[];
  total: number;
};

export type ClientNavPanierExterne = {
  items: ClientNavItemPanier[];
  total: number;
  ouvert: boolean;
  setOuvert: Dispatch<SetStateAction<boolean>>;
};

export type ClientNavProps = {
  variant: "home" | "default";
  logoSubtitle?: string;
  /** Réf sur <nav> (ex. mesure hauteur sticky catalogue) */
  navRef?: Ref<HTMLElement | null>;
  onNavAccueil?: () => void;
  onNavProduits?: () => void;
  accueilFilters?: ReactNode;
  panierExterne?: ClientNavPanierExterne;
  connexionLinkState?: { from: string };
  /** Ex. panier invité : marquer la fusion au clic sur connexion */
  onConnexionClick?: () => void;
};

function formatCAD(montant: number) {
  return `${montant.toFixed(2)} $`;
}

export function ClientNav({
  variant,
  logoSubtitle = "Boutique de produits cosmétiques",
  navRef,
  onNavAccueil,
  onNavProduits,
  accueilFilters,
  panierExterne,
  connexionLinkState,
  onConnexionClick,
}: ClientNavProps) {
  const { utilisateur, deconnexion } = useAuth();
  const navNodeRef = useRef<HTMLElement | null>(null);

  const assignNavRef = useCallback(
    (el: HTMLElement | null) => {
      navNodeRef.current = el;
      if (navRef == null) return;
      if (typeof navRef === "function") {
        navRef(el);
      } else {
        (navRef as { current: HTMLElement | null }).current = el;
      }
    },
    [navRef]
  );

  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [interneItems, setInterneItems] = useState<ClientNavItemPanier[]>([]);
  const [interneTotal, setInterneTotal] = useState(0);
  const [internePanierOuvert, setInternePanierOuvert] = useState(false);

  const chargerPanier = useCallback(async () => {
    if (panierExterne) return;
    if (!utilisateur) {
      const itemsInvites = lirePanierInvite();
      setInterneItems(itemsInvites);
      setInterneTotal(totalPanierInvite(itemsInvites));
      return;
    }
    try {
      const res = await api.get<PanierApi>("/panier");
      setInterneItems(res.data.items || []);
      setInterneTotal(res.data.total || 0);
    } catch {
      setInterneItems([]);
      setInterneTotal(0);
    }
  }, [utilisateur, panierExterne]);

  useEffect(() => {
    chargerPanier();
  }, [chargerPanier]);

  /**
   * Le footer est en dehors du bloc route (.app, .catalogue-page, etc.) : en sticky, la nav
   * disparaissait en bas de page. En ≤900px (hamburger), nav en fixed + padding body mesuré.
   */
  useLayoutEffect(() => {
    const el = navNodeRef.current;
    if (!el) return;
    const root = document.documentElement;
    const mq = window.matchMedia("(max-width: 900px)");

    function clearFixed() {
      root.classList.remove("client-nav-fixed");
      root.style.removeProperty("--client-nav-fixed-h");
    }

    function apply() {
      const node = navNodeRef.current;
      if (!mq.matches || !node) {
        clearFixed();
        return;
      }
      root.classList.add("client-nav-fixed");
      root.style.setProperty(
        "--client-nav-fixed-h",
        `${Math.ceil(node.getBoundingClientRect().height)}px`
      );
    }

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    mq.addEventListener("change", apply);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", apply);
      clearFixed();
    };
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "cosmetishop_panier_invite_v1" || e.key === null) {
        chargerPanier();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [chargerPanier]);

  const itemsPanier = panierExterne?.items ?? interneItems;
  const totalPanier = panierExterne?.total ?? interneTotal;
  const nbPiecesPanierNav = itemsPanier.reduce((n, it) => n + it.quantite, 0);
  const panierOuvert = panierExterne?.ouvert ?? internePanierOuvert;
  const setPanierOuvert = panierExterne?.setOuvert ?? setInternePanierOuvert;

  const initialesUtilisateur = useMemo(() => {
    if (!utilisateur?.nom) return "U";
    const parts = utilisateur.nom.trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  }, [utilisateur]);

  const avatarUtilisateur = resolveAssetUrl(utilisateur?.avatarUrl);

  function fermerMenuMobile() {
    setMenuMobileOuvert(false);
  }

  const logoBloc = (
    <div className="nav-logo">
      <span className="nav-logo-icon">💄</span>
      <div className="nav-logo-text">
        <span className="nav-logo-title">CosmétiShop</span>
        <span className="nav-logo-subtitle">{logoSubtitle}</span>
      </div>
    </div>
  );

  return (
    <nav className="nav" ref={assignNavRef}>
      <div className="nav-inner">
        <div className="nav-left">
          {variant === "default" ? (
            <Link to="/" className="nav-logo-link" onClick={fermerMenuMobile}>
              {logoBloc}
            </Link>
          ) : (
            logoBloc
          )}
          <button
            type="button"
            className="nav-mobile-toggle"
            aria-label={menuMobileOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuMobileOuvert}
            onClick={() => setMenuMobileOuvert((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
        <div className={`nav-center ${menuMobileOuvert ? "is-open" : ""}`}>
          {variant === "home" ? (
            <>
              <a
                href="#accueil"
                className="nav-link"
                onClick={() => {
                  fermerMenuMobile();
                  onNavAccueil?.();
                }}
              >
                Accueil
              </a>
              <a
                href="#produits"
                className="nav-link"
                onClick={() => {
                  fermerMenuMobile();
                  onNavProduits?.();
                }}
              >
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
            </>
          ) : (
            <>
              <Link to="/" className="nav-link" onClick={fermerMenuMobile}>
                Accueil
              </Link>
              <Link to="/espace-client" className="nav-link" onClick={fermerMenuMobile}>
                Espace client
              </Link>
              <Link to="/catalogue" className="nav-link" onClick={fermerMenuMobile}>
                Catalogue
              </Link>
              <Link to="/panier" className="nav-link" onClick={fermerMenuMobile}>
                Panier
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
              <button type="button" className="nav-auth-btn nav-auth-btn-logout" onClick={deconnexion}>
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/connexion"
                state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                className="nav-auth-btn nav-auth-link"
                onClick={() => {
                  onConnexionClick?.();
                  fermerMenuMobile();
                }}
              >
                Se connecter
              </Link>
              <Link
                to="/inscription"
                state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                className="nav-auth-btn nav-auth-btn-primary nav-auth-link"
                onClick={() => {
                  onConnexionClick?.();
                  fermerMenuMobile();
                }}
              >
                Créer un compte
              </Link>
            </>
          )}
          <div
            className={`nav-cart ${itemsPanier.length > 0 ? "nav-cart-has-items" : ""}`}
            onClick={() => setPanierOuvert((o) => !o)}
          >
            <span className="nav-cart-icon">🛒</span>
            {itemsPanier.length > 0 && (
              <span className="nav-cart-badge">
                {itemsPanier.reduce((acc, it) => acc + it.quantite, 0)}
              </span>
            )}
            <span className="nav-cart-info">Mon sac – {formatCAD(totalPanier)}</span>
            {panierOuvert && (
              <div className="nav-cart-panel">
                {itemsPanier.length === 0 ? (
                  <p className="nav-cart-empty">Votre sac est vide.</p>
                ) : (
                  <>
                    <div className="nav-cart-panel-head">
                      <span className="nav-cart-panel-title">Mon sac</span>
                      <span className="nav-cart-panel-sub">
                        {nbPiecesPanierNav} article{nbPiecesPanierNav !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ul className="nav-cart-list">
                      {itemsPanier.map((it) => {
                        const thumb = it.imageUrl ? resolveAssetUrl(it.imageUrl) : "";
                        return (
                          <li key={it.produitId} className="nav-cart-item">
                            {thumb ? (
                              <span className="nav-cart-item-thumb">
                                <img src={thumb} alt="" className="nav-cart-item-thumb-img" />
                              </span>
                            ) : (
                              <span className="nav-cart-item-thumb nav-cart-item-thumb--placeholder" aria-hidden />
                            )}
                            <span className="nav-cart-item-body">
                              <span className="nav-cart-item-name">
                                {it.nomProduit}
                                <span className="nav-cart-item-qty"> × {it.quantite}</span>
                              </span>
                              <span className="nav-cart-item-price">
                                {formatCAD(it.prixUnitaire * it.quantite)}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="nav-cart-total">
                      <span>Sous-total</span>
                      <span>{formatCAD(totalPanier)}</span>
                    </div>
                    <Link to="/panier" className="nav-cart-cta" onClick={() => setPanierOuvert(false)}>
                      Voir mon sac
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {variant === "home" && accueilFilters}
    </nav>
  );
}
