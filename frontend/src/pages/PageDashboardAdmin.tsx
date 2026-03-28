import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
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

  return (
    <div className="admin-page">
      {toast && (
        <div className={`admin-toast ${toast.type === "error" ? "is-error" : "is-success"}`} role="status">
          {toast.message}
        </div>
      )}
      <div className="admin-shell">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">Tableau de bord admin</h1>
            <p className="admin-subtitle">Bienvenue {utilisateur?.nom || "admin"}.</p>
          </div>
          <div className="admin-refresh-box">
            <p className="admin-refresh-meta">
              {lastRefreshAt
                ? `Derniere mise a jour: ${lastRefreshAt.toLocaleTimeString()}`
                : "Mise a jour en attente..."}
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
              {refreshing ? "Actualisation..." : "Actualiser"}
            </button>
          </div>
        </div>

        <p className="admin-description">
          Surveillez le stock, les commandes et les ventes de votre boutique.
        </p>
        <div className="admin-toolbar admin-toolbar-actions">
          <Link to="/" className="orders-link-btn">
            Retour accueil
          </Link>
          <Link to="/admin/produits" className="orders-link-btn">
            Gerer les produits
          </Link>
          <Link to="/admin/commandes" className="orders-link-btn" onClick={() => setNouvellesCommandes(0)}>
            Gerer les commandes
            {nouvellesCommandes > 0 && <span className="orders-badge-count">{nouvellesCommandes}</span>}
          </Link>
        </div>
        <div className="admin-quick-grid">
          <Link to="/admin/produits" className="admin-quick-card">
            <p className="admin-quick-title">Ajout rapide produit</p>
            <p className="admin-quick-text">Creer un produit avec image et categorie.</p>
          </Link>
          <Link to="/admin/commandes" className="admin-quick-card" onClick={() => setNouvellesCommandes(0)}>
            <p className="admin-quick-title">Commandes a traiter</p>
            <p className="admin-quick-text">Verifier les nouvelles commandes en attente.</p>
            {nouvellesCommandes > 0 && (
              <p className="admin-quick-text admin-quick-highlight">
                {nouvellesCommandes} nouvelle(s) commande(s)
              </p>
            )}
          </Link>
          <Link to="/admin/produits" className="admin-quick-card">
            <p className="admin-quick-title">Verifier le stock</p>
            <p className="admin-quick-text">
              {stats?.produitsStockBas ?? 0} produit(s) sous le seuil minimum.
            </p>
          </Link>
          <Link to="/admin/produits?stockBas=1" className="admin-quick-card">
            <p className="admin-quick-title">Voir seulement stock bas</p>
            <p className="admin-quick-text">Acceder directement aux produits critiques.</p>
          </Link>
        </div>

        {(stats?.produitsStockBas ?? 0) > 0 && (
          <div className="admin-alert admin-alert-stock">
            Attention: {stats?.produitsStockBas} produit(s) sont en stock bas. Pensez au
            reapprovisionnement.
          </div>
        )}

        {erreur && (
        <div className="admin-alert admin-alert-error">
          {erreur}
        </div>
      )}

      {loading && !stats && !resume && utilisateurs.length === 0 ? (
        <p className="admin-loading">Chargement des statistiques...</p>
      ) : (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Produits au catalogue</p>
              <p className="admin-stat-value">
                {stats?.totalProduits ?? resume?.totalProduits ?? 0}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Produits en stock bas</p>
              <p className="admin-stat-value admin-stat-value-danger">
                {stats?.produitsStockBas ?? resume?.produitsStockBas ?? 0}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Commandes totales</p>
              <p className="admin-stat-value">{stats?.totalCommandes ?? 0}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Revenu total</p>
              <p className="admin-stat-value admin-stat-value-success">
                {(stats?.revenuTotal ?? 0).toFixed(2)} $
              </p>
            </div>
          </div>

          <div className="admin-panels-grid">
            <div className="admin-panel">
              <p className="admin-panel-title">Valeur totale du stock</p>
              <p className="admin-stock-value">
                {(resume?.valeurTotaleStock ?? 0).toFixed(2)} $
              </p>
              <p className="admin-panel-note">
                Somme des quantités en stock x prix unitaire de chaque produit.
              </p>
            </div>
            <div className="admin-panel">
              <p className="admin-panel-title">Top produits vendus</p>
              <ul className="admin-top-list">
                {stats?.topProduits?.length ? (
                  stats.topProduits.map((p) => (
                    <li
                      key={p._id}
                      className="admin-top-item"
                    >
                      <span>{p._id}</span>
                      <span className="admin-top-qty">{p.quantiteVendue}</span>
                    </li>
                  ))
                ) : (
                  <li className="admin-empty">Pas encore de ventes enregistrées.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <p className="admin-panel-title">Gestion des roles utilisateurs</p>
              <p className="admin-panel-note">
                Seul un admin peut promouvoir un compte client en admin.
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

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Role actuel</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisateursFiltres.map((u) => (
                    <tr key={u._id}>
                      <td>{u.nom}</td>
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
                        <div className="admin-action-row">
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
                        Aucun utilisateur ne correspond a votre recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-panel">
            <p className="admin-panel-title">Historique des changements de role</p>
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
                        Aucun changement de role enregistre pour le moment.
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
                          {" -> "}
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
          </div>
        </>
      )}
      </div>
    </div>
  );
}

