import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { Breadcrumb } from "../components/Breadcrumb";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

type SuiviPayload = {
  _id: string;
  numeroFacture?: string;
  statut: string;
  statutPaiement?: string;
  total: number;
  taxe?: number;
  sousTotal?: number;
  createdAt: string;
  items: Array<{ nomProduit: string; quantite: number; prixUnitaire: number }>;
  adresseLivraison?: { ville?: string; province?: string; pays?: string };
};

function libellerStatut(statut: string) {
  const map: Record<string, string> = {
    en_attente: "En attente",
    confirmee: "Confirmée",
    expediee: "Expédiée",
    livree: "Livrée",
    annulee: "Annulée",
  };
  return map[statut] || statut;
}

function libellerPaiement(s?: string) {
  if (!s) return "—";
  const map: Record<string, string> = {
    en_attente: "En attente",
    paye: "Payé",
    echoue: "Échoué",
    rembourse: "Remboursé",
  };
  return map[s] || s;
}

export function PageSuiviCommande() {
  const { utilisateur } = useAuth();
  const [commandeId, setCommandeId] = useState("");
  const [email, setEmail] = useState(utilisateur?.email?.trim() || "");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<SuiviPayload | null>(null);

  useDocumentTitle("Suivi de commande");
  useMetaDescription(
    "Suivez l'état de votre commande CosmétiShop avec votre numéro de commande et l'email utilisé lors de l'achat."
  );

  async function consulter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setResultat(null);
    const id = commandeId.trim();
    const em = email.trim().toLowerCase();
    if (!id || !em) {
      setErreur("Renseignez le numéro de commande et votre email.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<SuiviPayload>(`/commandes/suivi-public/${encodeURIComponent(id)}`, {
        params: { email: em },
      });
      setResultat(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Impossible de trouver cette commande. Vérifiez l'identifiant et l'email.";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="catalogue-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <Link to="/" className="nav-logo" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="nav-logo-icon">💄</span>
              <div className="nav-logo-text">
                <span className="nav-logo-title">CosmétiShop</span>
                <span className="nav-logo-subtitle">Suivi de commande</span>
              </div>
            </Link>
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
            {utilisateur && (
              <Link to="/commandes" className="nav-link">
                Mes commandes
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="catalogue-shell suivi-commande-shell">
        <div className="breadcrumb-wrap">
          <Breadcrumb
            items={[
              { label: "Accueil", to: "/" },
              { label: "Suivi de commande" },
            ]}
          />
        </div>

        <header className="catalogue-hero">
          <div>
            <p className="catalogue-kicker">Après achat</p>
            <h1 className="catalogue-title">Suivi de commande</h1>
            <p className="catalogue-subtitle">
              Saisissez l&apos;identifiant de commande (fourni après paiement) et l&apos;email du compte ayant passé la
              commande. Les invités doivent utiliser l&apos;email du compte utilisé lors du paiement.
            </p>
          </div>
        </header>

        <form className="suivi-commande-form" onSubmit={consulter}>
          <label className="suivi-commande-label">
            <span>Numéro de commande (ID MongoDB)</span>
            <input
              className="suivi-commande-input"
              value={commandeId}
              onChange={(ev) => setCommandeId(ev.target.value)}
              placeholder="ex. 674a1b2c3d4e5f6789012345"
              autoComplete="off"
            />
          </label>
          <label className="suivi-commande-label">
            <span>Email</span>
            <input
              className="suivi-commande-input"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
          </label>
          <button type="submit" className="catalogue-btn suivi-commande-submit" disabled={loading}>
            {loading ? "Recherche…" : "Afficher le suivi"}
          </button>
        </form>

        {erreur && <p className="suivi-commande-erreur">{erreur}</p>}

        {resultat && (
          <section className="suivi-commande-resultat" aria-live="polite">
            <div className="suivi-commande-resultat-head">
              <h2 className="suivi-commande-resultat-title">Commande</h2>
              <p className="suivi-commande-resultat-meta">
                {resultat.numeroFacture && (
                  <>
                    Facture <strong>{resultat.numeroFacture}</strong>
                    {" · "}
                  </>
                )}
                Statut : <strong>{libellerStatut(resultat.statut)}</strong>
                {" · "}
                Paiement : <strong>{libellerPaiement(resultat.statutPaiement)}</strong>
              </p>
              <p className="suivi-commande-resultat-date">
                Passée le{" "}
                {new Date(resultat.createdAt).toLocaleString("fr-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <ul className="suivi-commande-items">
              {resultat.items.map((it, i) => (
                <li key={`${it.nomProduit}-${i}`} className="suivi-commande-item">
                  <span className="suivi-commande-item-nom">{it.nomProduit}</span>
                  <span className="suivi-commande-item-qty">× {it.quantite}</span>
                  <span className="suivi-commande-item-prix">{(it.prixUnitaire * it.quantite).toFixed(2)} $</span>
                </li>
              ))}
            </ul>
            <div className="suivi-commande-totaux">
              {resultat.sousTotal != null && (
                <p>
                  Sous-total : <strong>{Number(resultat.sousTotal).toFixed(2)} $</strong>
                </p>
              )}
              {resultat.taxe != null && (
                <p>
                  Taxes : <strong>{Number(resultat.taxe).toFixed(2)} $</strong>
                </p>
              )}
              <p className="suivi-commande-total">
                Total : <strong>{Number(resultat.total).toFixed(2)} $</strong>
              </p>
            </div>
            {resultat.adresseLivraison &&
              (resultat.adresseLivraison.ville || resultat.adresseLivraison.pays) && (
                <p className="suivi-commande-adresse">
                  Livraison :{" "}
                  {[resultat.adresseLivraison.ville, resultat.adresseLivraison.province, resultat.adresseLivraison.pays]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
          </section>
        )}
      </main>
    </div>
  );
}
