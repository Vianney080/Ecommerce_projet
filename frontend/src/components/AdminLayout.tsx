import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export type AdminBreadcrumbItem = { label: string; to?: string };

export type AdminLayoutProps = {
  title: string;
  subtitle?: string;
  /** Fil d’Ariane sous la barre système (dernier segment = page courante, sans `to`) */
  breadcrumb?: AdminBreadcrumbItem[];
  /** Zone à droite du titre (ex. actualiser) */
  headerExtra?: ReactNode;
  /** Badge rouge sur l’entrée « Commandes » du menu (nouvelles commandes) */
  navBadgeCommandes?: number;
  children: ReactNode;
};

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6A2.25 2.25 0 0 1 15.75 3.75H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75A2.25 2.25 0 0 1 15.75 13.5H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25Z" />
    </svg>
  );
}

function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}

function IconStore({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3v-2.25H6.75V18Z" />
    </svg>
  );
}

export function AdminLayout({
  title,
  subtitle,
  breadcrumb,
  headerExtra,
  navBadgeCommandes = 0,
  children,
}: AdminLayoutProps) {
  const { utilisateur } = useAuth();
  const location = useLocation();
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);

  useEffect(() => {
    setMenuMobileOuvert(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 961px)");
    function onWide() {
      if (mq.matches) setMenuMobileOuvert(false);
    }
    mq.addEventListener("change", onWide);
    return () => mq.removeEventListener("change", onWide);
  }, []);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuMobileOuvert(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 960px)");
    function applyScrollLock() {
      if (!mq.matches) {
        document.body.style.overflow = "";
        return;
      }
      document.body.style.overflow = menuMobileOuvert ? "hidden" : "";
    }
    applyScrollLock();
    mq.addEventListener("change", applyScrollLock);
    return () => {
      mq.removeEventListener("change", applyScrollLock);
      document.body.style.overflow = "";
    };
  }, [menuMobileOuvert]);

  function fermerMenuMobile() {
    setMenuMobileOuvert(false);
  }

  return (
    <div className="admin-app">
      <a href="#admin-main-content" className="admin-skip-link">
        Aller au contenu principal
      </a>
      {menuMobileOuvert ? (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Fermer le menu administration"
          onClick={fermerMenuMobile}
        />
      ) : null}
      <aside
        id="admin-sidebar-nav"
        className={`admin-sidebar${menuMobileOuvert ? " is-open" : ""}`}
        aria-label="Menu administration"
      >
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-brand-mark" aria-hidden>
            CS
          </span>
          <div className="admin-sidebar-brand-text">
            <span className="admin-sidebar-brand-title">Administration</span>
            <span className="admin-sidebar-brand-sub">CosmétiShop</span>
          </div>
        </div>
        <p className="admin-sidebar-hint">Choisissez une section pour gérer la boutique.</p>
        <nav className="admin-nav" aria-label="Sections">
          <NavLink
            to="/admin/dashboard"
            end
            className={({ isActive }) => `admin-nav-item${isActive ? " is-active" : ""}`}
            onClick={fermerMenuMobile}
          >
            <IconDashboard className="admin-nav-icon" />
            <span className="admin-nav-label">Tableau de bord</span>
            <span className="admin-nav-desc">Statistiques et équipe</span>
          </NavLink>
          <NavLink
            to="/admin/produits"
            className={({ isActive }) => `admin-nav-item${isActive ? " is-active" : ""}`}
            onClick={fermerMenuMobile}
          >
            <IconBox className="admin-nav-icon" />
            <span className="admin-nav-label">Produits &amp; stock</span>
            <span className="admin-nav-desc">Catalogue, prix, catégories</span>
          </NavLink>
          <NavLink
            to="/admin/commandes"
            className={({ isActive }) => `admin-nav-item${isActive ? " is-active" : ""}`}
            onClick={fermerMenuMobile}
          >
            <IconClipboard className="admin-nav-icon" />
            <span className="admin-nav-label">Commandes</span>
            <span className="admin-nav-desc">Statuts et livraisons</span>
            {navBadgeCommandes > 0 && (
              <span className="admin-nav-badge" aria-label={`${navBadgeCommandes} nouvelle(s) commande(s)`}>
                {navBadgeCommandes > 99 ? "99+" : navBadgeCommandes}
              </span>
            )}
          </NavLink>
        </nav>
        <div className="admin-sidebar-divider" role="presentation" />
        <Link to="/" className="admin-nav-item admin-nav-item--ghost" onClick={fermerMenuMobile}>
          <IconStore className="admin-nav-icon" />
          <span className="admin-nav-label">Retour à la boutique</span>
          <span className="admin-nav-desc">Site public (clients)</span>
        </Link>
        <div className="admin-sidebar-user">
          <span className="admin-sidebar-user-label">Connecté</span>
          <span className="admin-sidebar-user-name">{utilisateur?.nom || utilisateur?.email || "—"}</span>
          <span className="admin-sidebar-user-role">{utilisateur?.role === "admin" ? "Administrateur" : utilisateur?.role}</span>
        </div>
      </aside>
      <div className="admin-main-column">
        <div className="admin-mobile-bar">
          <button
            type="button"
            className="admin-mobile-menu-btn"
            aria-expanded={menuMobileOuvert}
            aria-controls="admin-sidebar-nav"
            onClick={() => setMenuMobileOuvert((o) => !o)}
          >
            <span className="admin-mobile-menu-bars" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className="sr-only">{menuMobileOuvert ? "Fermer le menu" : "Ouvrir le menu"}</span>
          </button>
          <div className="admin-mobile-bar-text">
            <span className="admin-mobile-bar-kicker">CosmétiShop</span>
            <span className="admin-mobile-bar-title">Administration</span>
          </div>
          {navBadgeCommandes > 0 ? (
            <span className="admin-mobile-bar-badge" title={`${navBadgeCommandes} nouvelle(s) commande(s)`}>
              {navBadgeCommandes > 99 ? "99+" : navBadgeCommandes}
            </span>
          ) : null}
        </div>
        <header className="admin-topbar">
          {breadcrumb && breadcrumb.length > 0 ? (
            <nav className="admin-breadcrumb" aria-label="Fil d'Ariane">
              <ol className="admin-breadcrumb-list">
                {breadcrumb.map((item, idx) => (
                  <li key={`${item.label}-${idx}`} className="admin-breadcrumb-item">
                    {item.to ? (
                      <Link to={item.to} className="admin-breadcrumb-link">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="admin-breadcrumb-current" aria-current="page">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <div className="admin-topbar-row">
            <div className="admin-topbar-titles">
              <h1 className="admin-topbar-title">{title}</h1>
              {subtitle ? <p className="admin-topbar-subtitle">{subtitle}</p> : null}
            </div>
            {headerExtra ? <div className="admin-topbar-extra">{headerExtra}</div> : null}
          </div>
        </header>
        <main id="admin-main-content" className="admin-main-inner">
          {children}
        </main>
      </div>
    </div>
  );
}
