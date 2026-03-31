import {
  useCallback,
  useEffect,
  useMemo,
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
    <nav className="nav" ref={navRef}>
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
            <span className="nav-cart-info">Mon panier – {formatCAD(totalPanier)}</span>
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
                    <Link to="/panier" className="nav-cart-cta" onClick={() => setPanierOuvert(false)}>
                      Voir mon panier
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
