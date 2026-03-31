import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, resolveAssetUrl } from "../api";
import { AdminLayout } from "../components/AdminLayout";
import { useAuth } from "../AuthContext";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

interface UtilisateurAdmin {
  _id: string;
  nom: string;
  email: string;
  role: "admin" | "client" | string;
  estActif?: boolean;
  createdAt?: string;
  avatarUrl?: string;
}

interface StatsAdmin {
  totalProduits: number;
  produitsStockBas: number;
  totalCommandes: number;
  revenuTotal: number;
  topProduits: { _id: string; quantiteVendue: number }[];
}

interface ResumeStock {
  totalProduits: number;
  produitsStockBas: number;
  valeurTotaleStock: number;
}

function initialesDepuisNom(nom: string) {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

interface RoleHistoriqueItem {
  _id: string;
  ancienRole: "admin" | "client";
  nouveauRole: "admin" | "client";
  modifieParEmail?: string;
  createdAt: string;
  utilisateurCible?: { nom?: string; email?: string };
  modifiePar?: { nom?: string; email?: string };
}

export function PageDashboardAdmin() {
  useDocumentTitle("Admin · Tableau de bord");
  useMetaDescription("Tableau de bord administrateur CosmétiShop : statistiques, stock et utilisateurs.");
  const { utilisateur } = useAuth();
  const [stats, setStats] = useState<StatsAdmin | null>(null);
  const [resume, setResume] = useState<ResumeStock | null>(null);
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurAdmin[]>([]);
  const [rolesEdition, setRolesEdition] = useState<Record<string, "admin" | "client">>({});
  const [historiqueRoles, setHistoriqueRoles] = useState<RoleHistoriqueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoleId, setLoadingRoleId] = useState<string | null>(null);
  const [loadingDeleteId, setLoadingDeleteId] = useState<string | null>(null);
  const [loadingStatutId, setLoadingStatutId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [rechercheUtilisateur, setRechercheUtilisateur] = useState("");
  const [filtreRole, setFiltreRole] = useState<"tous" | "admin" | "client">("tous");
  const [filtreStatut, setFiltreStatut] = useState<"tous" | "actif" | "inactif">("tous");
  const [nouvellesCommandes, setNouvellesCommandes] = useState(0);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const requeteCouranteRef = useRef(0);
  const precedentTotalCommandesRef = useRef<number | null>(null);

  function afficherToast(type: "success" | "error", message: string) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }

  const charger = useCallback(async (options?: { silencieux?: boolean }) => {
    const silencieux = options?.silencieux ?? false;
    const requeteId = ++requeteCouranteRef.current;

    if (silencieux) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setErreur(null);
    }

    try {
      const [statsRes, resumeRes] = await Promise.all([
        api.get<StatsAdmin>("/admin/stats"),
        api.get<ResumeStock>("/tableau-de-bord/resume"),
      ]);
      const usersRes = await api.get<UtilisateurAdmin[]>("/admin/utilisateurs");
      const historiqueRes = await api.get<RoleHistoriqueItem[]>("/admin/roles/historique");

      if (requeteId !== requeteCouranteRef.current) return;

      const totalCommandesActuel = Number(statsRes.data?.totalCommandes || 0);
      const totalPrecedent = precedentTotalCommandesRef.current;
      if (totalPrecedent !== null && totalCommandesActuel > totalPrecedent) {
        const diff = totalCommandesActuel - totalPrecedent;
        setNouvellesCommandes((valeur) => valeur + diff);
        afficherToast("success", `${diff} nouvelle(s) commande(s) reçue(s).`);
      }
      precedentTotalCommandesRef.current = totalCommandesActuel;

      setStats(statsRes.data);
      setResume(resumeRes.data);
      setUtilisateurs(usersRes.data);
      setHistoriqueRoles(historiqueRes.data);
      const map: Record<string, "admin" | "client"> = {};
      usersRes.data.forEach((u) => {
        map[u._id] = u.role === "admin" ? "admin" : "client";
      });
      setRolesEdition(map);
      setLastRefreshAt(new Date());
    } catch (err: any) {
      if (requeteId !== requeteCouranteRef.current) return;
      const msg = err?.response?.data?.message || "Erreur lors du chargement du tableau de bord";
      setErreur(msg);
    } finally {
      if (requeteId === requeteCouranteRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    charger();
    const intervalId = window.setInterval(() => {
      charger({ silencieux: true });
    }, 20000);
    return () => window.clearInterval(intervalId);
  }, [charger]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  async function changerRole(utilisateurId: string) {
    setToast(null);
    const role = rolesEdition[utilisateurId];
    if (!role) return;

    setLoadingRoleId(utilisateurId);
    try {
      const res = await api.patch("/admin/utilisateurs/" + utilisateurId + "/role", { role });
      afficherToast("success", res.data?.message || "Role mis a jour");
      await charger({ silencieux: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la mise a jour du role";
      afficherToast("error", msg);
    } finally {
      setLoadingRoleId(null);
    }
  }

  async function supprimerUtilisateur(utilisateurId: string, nom: string) {
    const ok = window.confirm(
      `Supprimer le compte de "${nom}" ? Cette action supprimera aussi son panier et ses commandes.`
    );
    if (!ok) return;

    setToast(null);
    setLoadingDeleteId(utilisateurId);
    try {
      const res = await api.delete("/admin/utilisateurs/" + utilisateurId);
      afficherToast("success", res.data?.message || "Utilisateur supprime");
      await charger({ silencieux: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la suppression";
      afficherToast("error", msg);
    } finally {
      setLoadingDeleteId(null);
    }
  }

  async function basculerStatutUtilisateur(u: UtilisateurAdmin) {
    const cibleActive = !(u.estActif ?? true);
    const question = cibleActive
      ? `Reactiver le compte de "${u.nom}" ?`
      : `Desactiver le compte de "${u.nom}" ?`;

    const ok = window.confirm(question);
    if (!ok) return;

    setToast(null);
    setLoadingStatutId(u._id);
    try {
      const res = await api.patch("/admin/utilisateurs/" + u._id + "/statut", {
        estActif: cibleActive,
      });
      afficherToast("success", res.data?.message || "Statut utilisateur mis a jour");
      await charger({ silencieux: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la mise a jour du statut";
      afficherToast("error", msg);
    } finally {
      setLoadingStatutId(null);
    }
  }

  const utilisateursFiltres = useMemo(() => {
    const terme = rechercheUtilisateur.trim().toLowerCase();
    return utilisateurs
      .filter((u) => {
        const okRecherche =
          !terme || u.nom.toLowerCase().includes(terme) || u.email.toLowerCase().includes(terme);
        const okRole = filtreRole === "tous" || u.role === filtreRole;
        const actif = u.estActif ?? true;
        const okStatut =
          filtreStatut === "tous" ||
          (filtreStatut === "actif" && actif) ||
          (filtreStatut === "inactif" && !actif);
        return okRecherche && okRole && okStatut;
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [utilisateurs, rechercheUtilisateur, filtreRole, filtreStatut]);

  const headerExtra = (
    <div className="admin-refresh-box">
      <p className="admin-refresh-meta">
        {lastRefreshAt
          ? `Dernière mise à jour : ${lastRefreshAt.toLocaleTimeString()}`
          : "Chargement des données…"}
      </p>
      <button
        type="button"
        className={`admin-btn admin-btn-refresh ${refreshing ? "is-loading" : ""}`}
        onClick={() => charger({ silencieux: true })}
        disabled={loading || refreshing}
      >
        <span className="admin-refresh-icon" aria-hidden="true">
          ↻
        </span>
        {refreshing ? "Actualisation…" : "Actualiser"}
      </button>
    </div>
  );

  return (
    <>
      {toast && (
        <div className={`admin-toast ${toast.type === "error" ? "is-error" : "is-success"}`} role="status">
          {toast.message}
        </div>
      )}
      <AdminLayout
        title="Tableau de bord"
        subtitle="Vue d’ensemble de la boutique — stocks, ventes et comptes."
        breadcrumb={[
          { label: "Administration", to: "/admin/dashboard" },
          { label: "Tableau de bord" },
        ]}
        headerExtra={headerExtra}
        navBadgeCommandes={nouvellesCommandes}
      >
        <div className="admin-dashboard">
          <p className="admin-dashboard-lead">
            Bonjour <strong>{utilisateur?.nom || "administrateur"}</strong>. Les chiffres ci-dessous se
            rafraîchissent automatiquement toutes les 20 secondes ; utilisez « Actualiser » pour forcer une
            mise à jour.
          </p>

          <section className="admin-dash-section" aria-labelledby="dash-shortcuts-heading">
            <h2 id="dash-shortcuts-heading" className="admin-dash-section-title">
              Raccourcis
            </h2>
            <p className="admin-dash-section-intro">
              Accès direct aux tâches les plus courantes.
            </p>
            <div className="admin-shortcuts-grid">
              <Link to="/admin/produits" className="admin-shortcut-card">
                <span className="admin-shortcut-icon admin-shortcut-icon--violet" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
                <div>
                  <span className="admin-shortcut-title">Ajouter / gérer des produits</span>
                  <span className="admin-shortcut-desc">Catalogue, images, prix et catégories</span>
                </div>
              </Link>
              <Link
                to="/admin/commandes"
                className="admin-shortcut-card"
                onClick={() => setNouvellesCommandes(0)}
              >
                <span className="admin-shortcut-icon admin-shortcut-icon--rose" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                    />
                  </svg>
                </span>
                <div>
                  <span className="admin-shortcut-title">Traiter les commandes</span>
                  <span className="admin-shortcut-desc">Statuts, paiements et livraisons</span>
                  {nouvellesCommandes > 0 && (
                    <span className="admin-shortcut-badge">{nouvellesCommandes} nouvelle(s)</span>
                  )}
                </div>
              </Link>
              <Link to="/admin/produits" className="admin-shortcut-card">
                <span className="admin-shortcut-icon admin-shortcut-icon--amber" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0-6.75h-3m3 0h3"
                    />
                  </svg>
                </span>
                <div>
                  <span className="admin-shortcut-title">Surveiller le stock</span>
                  <span className="admin-shortcut-desc">
                    {stats?.produitsStockBas ?? 0} produit(s) sous le seuil minimum
                  </span>
                </div>
              </Link>
              <Link to="/admin/produits?stockBas=1" className="admin-shortcut-card">
                <span className="admin-shortcut-icon admin-shortcut-icon--red" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </span>
                <div>
                  <span className="admin-shortcut-title">Uniquement stock bas</span>
                  <span className="admin-shortcut-desc">Filtrer les articles à réapprovisionner</span>
                </div>
              </Link>
            </div>
          </section>

          {(stats?.produitsStockBas ?? 0) > 0 && (
            <div className="admin-alert admin-alert-stock" role="status">
              <strong>Stock bas :</strong> {stats?.produitsStockBas} produit(s) sous le seuil — pensez au
              réapprovisionnement.
            </div>
          )}

          {erreur && <div className="admin-alert admin-alert-error">{erreur}</div>}

          {loading && !stats && !resume && utilisateurs.length === 0 ? (
            <p className="admin-loading">Chargement des statistiques…</p>
          ) : (
            <>
              <section className="admin-dash-section" aria-labelledby="dash-kpi-heading">
                <h2 id="dash-kpi-heading" className="admin-dash-section-title">
                  Indicateurs clés
                </h2>
                <div className="admin-stats-grid">
                  <div className="admin-stat-card admin-stat-card--kpi">
                    <span className="admin-stat-kpi-icon admin-stat-kpi-icon--slate" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="admin-stat-label">Produits au catalogue</p>
                      <p className="admin-stat-value">
                        {stats?.totalProduits ?? resume?.totalProduits ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="admin-stat-card admin-stat-card--kpi">
                    <span className="admin-stat-kpi-icon admin-stat-kpi-icon--danger" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="admin-stat-label">Produits en stock bas</p>
                      <p className="admin-stat-value admin-stat-value-danger">
                        {stats?.produitsStockBas ?? resume?.produitsStockBas ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="admin-stat-card admin-stat-card--kpi">
                    <span className="admin-stat-kpi-icon admin-stat-kpi-icon--indigo" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 18.75v-9.75m0 9.75c0 .621.504 1.125 1.125 1.125h18.75c.621 0 1.125-.504 1.125-1.125v-9.75M8.25 6h.75v.75h-.75V6zM12 6h.75v.75H12V6zm4.5 0h.75v.75h-.75V6z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="admin-stat-label">Commandes (total)</p>
                      <p className="admin-stat-value">{stats?.totalCommandes ?? 0}</p>
                    </div>
                  </div>
                  <div className="admin-stat-card admin-stat-card--kpi">
                    <span className="admin-stat-kpi-icon admin-stat-kpi-icon--success" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="admin-stat-label">Revenu total</p>
                      <p className="admin-stat-value admin-stat-value-success">
                        {(stats?.revenuTotal ?? 0).toFixed(2)} $
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="admin-panels-grid">
                <div className="admin-panel admin-panel--emphasis">
                  <p className="admin-panel-title">Valeur du stock (inventaire)</p>
                  <p className="admin-stock-value">{(resume?.valeurTotaleStock ?? 0).toFixed(2)} $</p>
                  <p className="admin-panel-note">
                    Estimation : quantités en stock × prix unitaire de chaque produit.
                  </p>
                </div>
                <div className="admin-panel">
                  <p className="admin-panel-title">Meilleures ventes (IDs produits)</p>
                  <ul className="admin-top-list">
                    {stats?.topProduits?.length ? (
                      stats.topProduits.map((p) => (
                        <li key={p._id} className="admin-top-item">
                          <span className="admin-table-muted">{p._id}</span>
                          <span className="admin-top-qty">{p.quantiteVendue} vendu(s)</span>
                        </li>
                      ))
                    ) : (
                      <li className="admin-empty">Pas encore de ventes enregistrées.</li>
                    )}
                  </ul>
                </div>
              </div>

              <section
                className="admin-panel admin-panel--section"
                aria-labelledby="dash-users-heading"
                id="admin-comptes-utilisateurs"
              >
                <nav className="admin-panel-breadcrumb" aria-label="Fil d'Ariane de la section">
                  <ol className="admin-breadcrumb-list">
                    <li className="admin-breadcrumb-item">
                      <span className="admin-breadcrumb-segment-muted">Tableau de bord</span>
                    </li>
                    <li className="admin-breadcrumb-item">
                      <span className="admin-breadcrumb-current" aria-current="page">
                        Comptes utilisateurs
                      </span>
                    </li>
                  </ol>
                </nav>
                <div className="admin-panel-head">
                  <h2 id="dash-users-heading" className="admin-panel-title admin-panel-title--lg">
                    Comptes utilisateurs
                  </h2>
                  <p className="admin-panel-note">
                    Rôles (client / admin), activation des comptes et suppression. Vous ne pouvez pas modifier
                    votre propre compte ici.
                  </p>
                </div>

            <div className="admin-toolbar">
              <input
                type="text"
                value={rechercheUtilisateur}
                onChange={(e) => setRechercheUtilisateur(e.target.value)}
                className="admin-search"
                placeholder="Rechercher par nom ou email..."
              />
              <div className="admin-filters-inline">
                <select
                  className="admin-select"
                  value={filtreRole}
                  onChange={(e) => setFiltreRole(e.target.value as "tous" | "admin" | "client")}
                >
                  <option value="tous">Tous les roles</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  className="admin-select"
                  value={filtreStatut}
                  onChange={(e) => setFiltreStatut(e.target.value as "tous" | "actif" | "inactif")}
                >
                  <option value="tous">Tous statuts</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Desactive</option>
                </select>
              </div>
            </div>

            <div className="admin-table-wrap admin-table-wrap--users">
              <table className="admin-table admin-table--users">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Rôle actuel</th>
                    <th>Nouveau rôle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateursFiltres.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-avatar-wrap">
                            {u.avatarUrl ? (
                              <img
                                src={resolveAssetUrl(u.avatarUrl)}
                                alt=""
                                className="admin-user-avatar-img"
                              />
                            ) : (
                              <span className="admin-user-avatar-fallback" aria-hidden>
                                {initialesDepuisNom(u.nom)}
                              </span>
                            )}
                          </span>
                          <span className="admin-user-name-text">{u.nom}</span>
                        </div>
                      </td>
                      <td className="admin-table-muted">{u.email}</td>
                      <td>
                        <span className={`admin-status-badge ${(u.estActif ?? true) ? "is-active" : "is-inactive"}`}>
                          {(u.estActif ?? true) ? "Actif" : "Desactive"}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-role-badge ${u.role === "admin" ? "is-admin" : "is-client"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <select
                          value={rolesEdition[u._id] || (u.role === "admin" ? "admin" : "client")}
                          onChange={(e) =>
                            setRolesEdition((prev) => ({
                              ...prev,
                              [u._id]: e.target.value as "admin" | "client",
                            }))
                          }
                          className="admin-select"
                        >
                          <option value="client">client</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        <div className="admin-action-row admin-action-row--tight">
                          <button
                            onClick={() => changerRole(u._id)}
                            disabled={
                              loadingRoleId === u._id ||
                              loadingDeleteId === u._id ||
                              loadingStatutId === u._id ||
                              utilisateur?.id === u._id ||
                              rolesEdition[u._id] === u.role
                            }
                            className="admin-btn"
                            title={
                              utilisateur?.id === u._id
                                ? "Vous ne pouvez pas modifier votre propre role"
                                : rolesEdition[u._id] === u.role
                                  ? "Aucun changement detecte"
                                  : ""
                            }
                          >
                            {loadingRoleId === u._id ? "Maj..." : "Enregistrer"}
                          </button>
                          <button
                            onClick={() => basculerStatutUtilisateur(u)}
                            disabled={
                              loadingRoleId === u._id ||
                              loadingDeleteId === u._id ||
                              loadingStatutId === u._id ||
                              utilisateur?.id === u._id
                            }
                            className={`admin-btn ${(u.estActif ?? true) ? "admin-btn-warn" : "admin-btn-success"}`}
                            title={utilisateur?.id === u._id ? "Vous ne pouvez pas changer votre propre statut" : ""}
                          >
                            {loadingStatutId === u._id
                              ? "Maj statut..."
                              : (u.estActif ?? true)
                                ? "Desactiver"
                                : "Reactiver"}
                          </button>
                          <button
                            onClick={() => supprimerUtilisateur(u._id, u.nom)}
                            disabled={
                              loadingRoleId === u._id ||
                              loadingDeleteId === u._id ||
                              loadingStatutId === u._id ||
                              utilisateur?.id === u._id
                            }
                            className="admin-btn admin-btn-danger"
                            title={utilisateur?.id === u._id ? "Vous ne pouvez pas supprimer votre propre compte" : ""}
                          >
                            {loadingDeleteId === u._id ? "Suppression..." : "Supprimer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {utilisateursFiltres.length === 0 && (
                    <tr>
                      <td className="admin-empty" colSpan={6}>
                        Aucun utilisateur ne correspond à votre recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
              </section>

              <section className="admin-panel admin-panel--section" aria-labelledby="dash-history-heading">
                <nav className="admin-panel-breadcrumb" aria-label="Fil d'Ariane de la section">
                  <ol className="admin-breadcrumb-list">
                    <li className="admin-breadcrumb-item">
                      <span className="admin-breadcrumb-segment-muted">Tableau de bord</span>
                    </li>
                    <li className="admin-breadcrumb-item">
                      <span className="admin-breadcrumb-current" aria-current="page">
                        Historique des rôles
                      </span>
                    </li>
                  </ol>
                </nav>
                <h2 id="dash-history-heading" className="admin-panel-title admin-panel-title--lg">
                  Historique des changements de rôle
                </h2>
                <p className="admin-panel-note admin-panel-note--below-title">
                  Qui a modifié le rôle d’un compte (client ↔ administrateur).
                </p>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Utilisateur cible</th>
                        <th>Modification</th>
                        <th>Par</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historiqueRoles.length === 0 ? (
                        <tr>
                          <td className="admin-empty" colSpan={4}>
                            Aucun changement de rôle enregistré pour le moment.
                          </td>
                        </tr>
                      ) : (
                        historiqueRoles.map((h) => (
                          <tr key={h._id}>
                            <td className="admin-table-muted">
                              {new Date(h.createdAt).toLocaleString()}
                            </td>
                            <td>
                              {h.utilisateurCible?.nom || h.utilisateurCible?.email || "-"}
                            </td>
                            <td>
                              {h.ancienRole}
                              {" → "}
                              <span className="admin-top-qty">{h.nouveauRole}</span>
                            </td>
                            <td>
                              {h.modifiePar?.nom || h.modifiePar?.email || h.modifieParEmail || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

