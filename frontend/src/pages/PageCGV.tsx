import { Link } from "react-router-dom";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

export function PageCGV() {
  useDocumentTitle("CGV");
  useMetaDescription(
    "Conditions générales de vente CosmétiShop : commandes, livraison, prix et droits du client."
  );
  return (
    <div className="legal-page">
      <main className="legal-shell">
        <div className="legal-header">
          <Link to="/" className="client-back-link">
            Retour à l&apos;accueil
          </Link>
          <h1 className="legal-title">Conditions générales de vente (CGV)</h1>
          <p className="legal-subtitle">Règles applicables à vos commandes sur CosmétiShop</p>
        </div>

        <section className="legal-section">
          <h2>1. Objet</h2>
          <p>
            Les presentes CGV definissent les droits et obligations de CosmetiShop et du client dans le cadre des
            ventes effectuees sur la boutique en ligne.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Produits et prix</h2>
          <p>
            Les caracteristiques principales des produits sont indiquees sur les fiches articles. Les prix sont affiches
            en dollars canadiens et peuvent etre modifies sans preavis, hors commandes deja validees.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Commande et paiement</h2>
          <p>
            La commande est consideree comme definitive apres validation du paiement. Le client garantit l&apos;exactitude
            des informations fournies lors du checkout.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Livraison</h2>
          <p>
            Les delais de livraison sont indicatifs. En cas de retard, le client est informe dans les meilleurs delais.
            Les frais eventuels sont precises avant confirmation de la commande.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Retours et remboursement</h2>
          <p>
            En cas de produit defectueux ou non conforme, le client peut contacter le service client pour une solution
            adaptee (echange, avoir ou remboursement selon le cas).
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Service client</h2>
          <p>
            Toute demande peut etre adressee a <a href="mailto:contact@cosmetishop.com">contact@cosmetishop.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
