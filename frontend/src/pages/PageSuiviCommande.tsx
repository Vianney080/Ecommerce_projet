import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  numeroSuiviLivraison?: string;
  items: Array<{ nomProduit: string; quantite: number; prixUnitaire: number }>;
  adresseLivraison?: { ville?: string; province?: string; pays?: string };
};

function libellerStatut(statut: string) {
  const map: Record<string, string> = {
    en_attente: "En préparation",
    payee: "Expédiée / en transit",
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

/** Indice de la dernière étape atteinte (0..3), -1 si annulée */
function progressionLivraison(statut: string, numeroSuivi: string | undefined) {
  if (statut === "annulee") return -1;
  const suivi = String(numeroSuivi || "").trim();
  if (statut === "livree") return 3;
  if (suivi || statut === "payee") return 2;
  if (statut === "en_attente") return 1;
  return 0;
}

const ETIQUETES_ETAPES = [
  "Commande confirmée",
  "Préparation de la commande",
  "Expédition",
  "Livraison",
];

export function PageSuiviCommande() {
  const { utilisateur } = useAuth();
  const [searchParams] = useSearchParams();
  const [commandeId, setCommandeId] = useState("");
  const [email, setEmail] = useState(utilisateur?.email?.trim() || "");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<SuiviPayload | null>(null);

  useEffect(() => {
    const n = searchParams.get("numero") || searchParams.get("cmd") || "";
    const em = searchParams.get("email") || "";
    if (n) setCommandeId((prev) => prev || n);
    if (em) setEmail((prev) => prev || em);
  }, [searchParams]);

  useEffect(() => {
    const em = utilisateur?.email?.trim();
    if (!em) return;
    setEmail((prev) => (prev.trim() ? prev : em));
  }, [utilisateur?.email]);

  useDocumentTitle("Suivi de commande");
  useMetaDescription(
    "Suivez votre commande CosmétiShop avec votre numéro de commande (facture FAC-…) et l’email utilisé lors de l’achat."
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
      const res = await api.get<SuiviPayload>(
        `/commandes/suivi-public/${encodeURIComponent(id)}`,
        { params: { email: em } }
      );
      setResultat(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Impossible de trouver cette commande. Vérifiez le numéro (ex. FAC-…) et l’email.";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  async function copierNumero(texte: string) {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      /* ignore */
    }
  }

  const progression = resultat
    ? progressionLivraison(resultat.statut, resultat.numeroSuiviLivraison)
    : -2;
  const suiviBrut = resultat?.numeroSuiviLivraison?.trim() || "";
  const suiviEstUrl = /^https?:\/\//i.test(suiviBrut);

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
              Utilisez le <strong>numéro affiché sur votre confirmation</strong> (ex.{" "}
              <code className="suivi-code-inline">FAC-XXXXXXXX-XXXX</code>), pas l’identifiant technique. Même numéro
              que sur la facture. L’email doit être celui du compte ayant passé la commande.
            </p>
          </div>
        </header>

        <form className="suivi-commande-form" onSubmit={consulter}>
          <label className="suivi-commande-label">
            <span>Numéro de commande ou facture</span>
            <input
              className="suivi-commande-input"
              value={commandeId}
              onChange={(ev) => setCommandeId(ev.target.value)}
              placeholder="ex. FAC-MJY61OUTO-CUXX"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="suivi-commande-label">
            <span>Email (compte utilisé pour l’achat)</span>
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
              <h2 className="suivi-commande-resultat-title">Votre commande</h2>
              {resultat.numeroFacture && (
                <div className="suivi-numero-client">
                  <span className="suivi-numero-client-label">Numéro à conserver</span>
                  <div className="suivi-numero-client-row">
                    <strong className="suivi-numero-client-value">{resultat.numeroFacture.toUpperCase()}</strong>
                    <button
                      type="button"
                      className="suivi-copy-btn"
                      onClick={() => copierNumero(resultat.numeroFacture || "")}
                    >
                      Copier
                    </button>
                  </div>
                </div>
              )}
              <p className="suivi-commande-resultat-meta">
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

            {progression >= 0 && (
              <ol className="suivi-etapes" aria-label="Progression de la livraison">
                {ETIQUETES_ETAPES.map((label, i) => (
                  <li
                    key={label}
                    className={`suivi-etape ${i <= progression ? "is-done" : ""} ${
                      i === progression ? "is-current" : ""
                    }`}
                  >
                    <span className="suivi-etape-dot" aria-hidden="true" />
                    <span className="suivi-etape-label">{label}</span>
                  </li>
                ))}
              </ol>
            )}
            {progression === -1 && (
              <p className="suivi-commande-annulee">Cette commande a été annulée.</p>
            )}

            {suiviBrut && (
              <div className="suivi-transporteur">
                <p className="suivi-transporteur-title">Suivi transporteur</p>
                {suiviEstUrl ? (
                  <a href={suiviBrut} target="_blank" rel="noopener noreferrer" className="suivi-transporteur-lien">
                    Ouvrir le suivi en ligne
                  </a>
                ) : (
                  <p className="suivi-transporteur-numero">
                    <strong>{suiviBrut}</strong>
                    <button type="button" className="suivi-copy-btn" onClick={() => copierNumero(suiviBrut)}>
                      Copier
                    </button>
                  </p>
                )}
              </div>
            )}

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
