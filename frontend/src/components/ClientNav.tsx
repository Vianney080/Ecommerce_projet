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
import { LOGO_COSMETISHOP_PNG } from "../brandAssets";
import { lirePanierInvite, totalPanierInvite } from "../cartInvite";
import { PANIER_CHANGE_EVENT } from "../panierEvents";

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

/** Icône « entrer » / connexion (stroke Heroicons) */
function NavIconConnexion({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  );
}

/** Icône panier (contour, style e-commerce) */
function NavIconPanier({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 7h15l-1.5 9.5a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.4L4.5 4.5H2" />
      <path d="M9 11V6a3 3 0 0 1 6 0v5" />
    </svg>
  );
}

/** Icône inscription (utilisateur +) */
function NavIconInscription({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
      />
    </svg>
  );
}

/** Icône déconnexion (sortie) */
function NavIconDeconnexion({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
      />
    </svg>
  );
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

  useEffect(() => {
    function onPanierChange() {
      void chargerPanier();
    }
    window.addEventListener(PANIER_CHANGE_EVENT, onPanierChange);
    return () => window.removeEventListener(PANIER_CHANGE_EVENT, onPanierChange);
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

  /** Déconnexion dans le menu hamburger (icône + libellé), visible ≤900px */
  const menuMobileDeconnexion =
    utilisateur ? (
      <div className="nav-mobile-user-footer" role="group" aria-label="Déconnexion">
        <button
          type="button"
          className="nav-mobile-auth-tile nav-mobile-auth-tile--logout nav-mobile-auth-tile--row-full"
          onClick={() => {
            fermerMenuMobile();
            deconnexion();
          }}
        >
          <span className="nav-mobile-auth-icon-wrap nav-mobile-auth-icon-wrap--logout" aria-hidden>
            <NavIconDeconnexion className="nav-mobile-auth-svg" />
          </span>
          <span className="nav-mobile-auth-caption">Déconnexion</span>
        </button>
      </div>
    ) : null;

  const logoBloc = (
    <Link to="/" className="nav-logo-link" onClick={fermerMenuMobile}>
      <img
        src={LOGO_COSMETISHOP_PNG}
        alt="CosmétiShop — boutique beauté en ligne"
        className="nav-logo-png"
        decoding="async"
        width={220}
        height={72}
      />
      <span className="sr-only">{logoSubtitle}</span>
    </Link>
  );

  return (
    <nav className="nav" ref={assignNavRef}>
      <div className="nav-inner">
        <div className="nav-left">
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
          {logoBloc}
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
              {!utilisateur && (
                <div className="nav-mobile-auth-guest" role="group" aria-label="Compte">
                  <Link
                    to="/connexion"
                    state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                    className="nav-mobile-auth-tile"
                    onClick={() => {
                      onConnexionClick?.();
                      fermerMenuMobile();
                    }}
                  >
                    <span className="nav-mobile-auth-icon-wrap" aria-hidden>
                      <NavIconConnexion className="nav-mobile-auth-svg" />
                    </span>
                    <span className="nav-mobile-auth-caption">Connexion</span>
                  </Link>
                  <Link
                    to="/inscription"
                    state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                    className="nav-mobile-auth-tile nav-mobile-auth-tile--primary"
                    onClick={() => {
                      onConnexionClick?.();
                      fermerMenuMobile();
                    }}
                  >
                    <span className="nav-mobile-auth-icon-wrap" aria-hidden>
                      <NavIconInscription className="nav-mobile-auth-svg" />
                    </span>
                    <span className="nav-mobile-auth-caption">Inscription</span>
                  </Link>
                </div>
              )}
              {menuMobileDeconnexion}
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
              {!utilisateur && (
                <div className="nav-mobile-auth-guest" role="group" aria-label="Compte">
                  <Link
                    to="/connexion"
                    state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                    className="nav-mobile-auth-tile"
                    onClick={() => {
                      onConnexionClick?.();
                      fermerMenuMobile();
                    }}
                  >
                    <span className="nav-mobile-auth-icon-wrap" aria-hidden>
                      <NavIconConnexion className="nav-mobile-auth-svg" />
                    </span>
                    <span className="nav-mobile-auth-caption">Connexion</span>
                  </Link>
                  <Link
                    to="/inscription"
                    state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                    className="nav-mobile-auth-tile nav-mobile-auth-tile--primary"
                    onClick={() => {
                      onConnexionClick?.();
                      fermerMenuMobile();
                    }}
                  >
                    <span className="nav-mobile-auth-icon-wrap" aria-hidden>
                      <NavIconInscription className="nav-mobile-auth-svg" />
                    </span>
                    <span className="nav-mobile-auth-caption">Inscription</span>
                  </Link>
                </div>
              )}
              {menuMobileDeconnexion}
            </>
          )}
        </div>
        <div className="nav-right">
          {utilisateur ? (
            <div className="nav-auth-user-cluster">
              <Link
                to="/profil"
                className="nav-user-pill nav-user-pill-link nav-user-pill--desktop-pro"
                title={utilisateur.email}
              >
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
                className="nav-auth-desktop-btn nav-auth-desktop-btn--logout"
                onClick={deconnexion}
              >
                <span className="nav-auth-desktop-icon-wrap nav-auth-desktop-icon-wrap--logout" aria-hidden>
                  <NavIconDeconnexion className="nav-auth-desktop-svg" />
                </span>
                <span className="nav-auth-desktop-label">Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="nav-auth-guest-desktop">
              <Link
                to="/connexion"
                state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                className="nav-auth-desktop-btn nav-auth-desktop-btn--outline"
                onClick={() => {
                  onConnexionClick?.();
                  fermerMenuMobile();
                }}
              >
                <span className="nav-auth-desktop-icon-wrap" aria-hidden>
                  <NavIconConnexion className="nav-auth-desktop-svg" />
                </span>
                <span className="nav-auth-desktop-label">Connexion</span>
              </Link>
              <Link
                to="/inscription"
                state={connexionLinkState ? { from: connexionLinkState.from } : undefined}
                className="nav-auth-desktop-btn nav-auth-desktop-btn--primary"
                onClick={() => {
                  onConnexionClick?.();
                  fermerMenuMobile();
                }}
              >
                <span className="nav-auth-desktop-icon-wrap nav-auth-desktop-icon-wrap--on-primary" aria-hidden>
                  <NavIconInscription className="nav-auth-desktop-svg" />
                </span>
                <span className="nav-auth-desktop-label">Inscription</span>
              </Link>
            </div>
          )}
          <div
            className={`nav-cart ${itemsPanier.length > 0 ? "nav-cart-has-items" : ""}`}
            onClick={() => setPanierOuvert((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setPanierOuvert((o) => !o);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Panier, ${nbPiecesPanierNav} article${nbPiecesPanierNav !== 1 ? "s" : ""}, total ${formatCAD(totalPanier)}`}
          >
            <span className="nav-cart-icon-wrap">
              <NavIconPanier className="nav-cart-svg-icon" />
              <span
                className={`nav-cart-badge${nbPiecesPanierNav === 0 ? " nav-cart-badge--zero" : ""}`}
                aria-hidden
              >
                {nbPiecesPanierNav}
              </span>
            </span>
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
