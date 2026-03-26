import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles.css";

type ItemCommande = {
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
};

type AdresseLivraison = {
  nomComplet?: string;
  rue?: string;
  ville?: string;
  province?: string;
  codePostal?: string;
  pays?: string;
  telephone?: string;
};

type CommandeSucces = {
  _id: string;
  items: ItemCommande[];
  sousTotal?: number;
  remiseCode?: string;
  remiseMontant?: number;
  taxe?: number;
  total: number;
  numeroFacture?: string;
  statutPaiement?: "en_attente" | "paye" | "echoue" | "rembourse" | string;
  adresseLivraison?: AdresseLivraison;
  createdAt?: string;
};

function formatAdresse(adresse?: AdresseLivraison) {
  if (!adresse) return "Adresse non disponible";
  const lignes = [
    adresse.nomComplet || "",
    adresse.telephone ? `Tel: ${adresse.telephone}` : "",
    adresse.rue || "",
    [adresse.ville, adresse.province, adresse.codePostal].filter(Boolean).join(", "),
    adresse.pays || "",
  ].filter(Boolean);
  return lignes.join("\n");
}

type EtatSucces = { commande?: CommandeSucces; emailConfirmation?: string } | null;

export function PageCommandeSucces() {
  const location = useLocation();
  const navigate = useNavigate();
  const etat = location.state as EtatSucces;
  const commande = etat?.commande;
  const emailConfirmation = (etat?.emailConfirmation || "").trim();

  if (!commande) {
    return (
      <div className="orders-page">
        <div className="orders-shell">
          <div className="orders-alert orders-alert-info">
            Informations de commande non disponibles. Consultez votre historique.
          </div>
          <div className="orders-actions">
            <Link to="/commandes" className="orders-link-btn">
              Mes commandes
            </Link>
            <Link to="/" className="orders-link-btn">
              Retour accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const commandeValidee = commande;
  const facAffiche = (commandeValidee.numeroFacture || `CMD-${commandeValidee._id.slice(-8).toUpperCase()}`).toUpperCase();

  async function copierTexte(texte: string) {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      /* ignore */
    }
  }

  function telechargerFacturePDF() {
    const numero = facAffiche;
    const dateTexte = new Date(commandeValidee.createdAt || Date.now()).toLocaleString();
    const lignes = commandeValidee.items
      .map(
        (it) =>
          `<tr><td>${it.nomProduit}</td><td>${it.quantite}</td><td>${it.prixUnitaire.toFixed(
            2
          )} $</td><td>${(it.quantite * it.prixUnitaire).toFixed(2)} $</td></tr>`
      )
      .join("");

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Facture ${numero}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 6px; }
            .meta { color: #475569; margin-bottom: 16px; }
            .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 12px; white-space: pre-line; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 8px; font-size: 14px; }
            th { background: #f8fafc; }
            .total { margin-top: 12px; font-size: 18px; font-weight: 700; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Facture CosmétiShop</h1>
          <p class="meta">Commande #${numero} - ${dateTexte}</p>
          <div class="box"><strong>Adresse de livraison</strong><br/>${formatAdresse(
            commandeValidee.adresseLivraison
          ).replace(/\n/g, "<br/>")}</div>
          <table>
            <thead>
              <tr><th>Produit</th><th>Quantité</th><th>Prix</th><th>Sous-total</th></tr>
            </thead>
            <tbody>${lignes}</tbody>
          </table>
          <p class="total">Total: ${commandeValidee.total.toFixed(2)} $</p>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="orders-page">
      <div className="orders-shell">
        <div className="checkout-card">
          <p className="panier-kicker">Paiement confirmé</p>
          <h1 className="panier-title">Commande validée</h1>
          <p className="panier-subtitle">
            Merci pour votre achat. Conservez votre numéro de commande pour le suivi (comme sur un reçu Amazon).
          </p>
          <div className="commande-succes-numero-bloc">
            <p className="orders-card-id">Référence commande (à noter ou copier)</p>
            <div className="commande-succes-fac-row">
              <span className="commande-succes-fac-value">{facAffiche}</span>
              <button type="button" className="suivi-copy-btn" onClick={() => copierTexte(facAffiche)}>
                Copier le numéro
              </button>
            </div>
            {emailConfirmation && (
              <p className="orders-card-date" style={{ marginTop: "0.5rem" }}>
                Suivi avec cet email : <strong>{emailConfirmation}</strong>
              </p>
            )}
            <Link
              className="orders-link-btn"
              style={{ marginTop: "0.65rem", display: "inline-block" }}
              to={`/suivi-commande?numero=${encodeURIComponent(commandeValidee.numeroFacture || facAffiche)}&email=${encodeURIComponent(emailConfirmation)}`}
            >
              Suivre ma commande
            </Link>
          </div>
          <p className="orders-card-date">
            Paiement : {commandeValidee.statutPaiement || "paye"} ·{" "}
            {new Date(commandeValidee.createdAt || Date.now()).toLocaleString()}
          </p>
        </div>

        <div className="checkout-grid">
          <div className="checkout-card">
            <h2 className="checkout-title">Adresse de livraison</h2>
            <pre className="orders-address-line checkout-address-pre">
              {formatAdresse(commandeValidee.adresseLivraison)}
            </pre>
          </div>

          <div className="checkout-card">
            <h2 className="checkout-title">Résumé de la commande</h2>
            <ul className="checkout-items">
              {commandeValidee.items.map((it, idx) => (
                <li key={`${it.nomProduit}-${idx}`}>
                  <span>{it.nomProduit}</span>
                  <span>
                    {it.quantite} x {it.prixUnitaire.toFixed(2)} $
                  </span>
                </li>
              ))}
            </ul>
            <div className="checkout-total">
              <span>Sous-total</span>
              <span>{(commandeValidee.sousTotal ?? commandeValidee.total).toFixed(2)} $</span>
            </div>
            <div className="checkout-total">
              <span>Reduction {commandeValidee.remiseCode ? `(${commandeValidee.remiseCode})` : ""}</span>
              <span>- {(commandeValidee.remiseMontant || 0).toFixed(2)} $</span>
            </div>
            <div className="checkout-total">
              <span>Taxe (15%)</span>
              <span>{(commandeValidee.taxe || 0).toFixed(2)} $</span>
            </div>
            <div className="checkout-total">
              <span>Total</span>
              <span>{commandeValidee.total.toFixed(2)} $</span>
            </div>
          </div>
        </div>

        <div className="checkout-actions">
          <button className="panier-btn panier-btn-primary" onClick={telechargerFacturePDF}>
            Télécharger facture (PDF)
          </button>
          <button className="panier-btn panier-btn-ghost" onClick={() => navigate("/commandes")}>
            Voir mes commandes
          </button>
          <button className="panier-btn panier-btn-ghost" onClick={() => navigate("/")}>
            Retour accueil
          </button>
        </div>
      </div>
    </div>
  );
}

