import { Link } from "react-router-dom";
import "../styles.css";

export function PageMentionsLegales() {
  return (
    <div className="legal-page">
      <main className="legal-shell">
        <div className="legal-header">
          <Link to="/" className="client-back-link">
            Retour a l&apos;accueil
          </Link>
          <h1 className="legal-title">Mentions legales</h1>
          <p className="legal-subtitle">Informations legales de la boutique</p>
        </div>

        <section className="legal-section">
          <h2>1. Editeur du site</h2>
          <p>
            CosmetiShop est une boutique en ligne specialisee dans la vente de produits cosmetiques.
            Pour toute question, contactez-nous a <a href="mailto:contact@cosmetishop.com">contact@cosmetishop.com</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Hebergement</h2>
          <p>
            Le site est heberge sur une infrastructure cloud securisee. Les donnees sont proteges selon les bonnes
            pratiques de securite applicables au commerce en ligne.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Propriete intellectuelle</h2>
          <p>
            Les contenus (textes, logos, elements graphiques) sont proteges. Toute reproduction totale ou partielle
            sans autorisation prealable est interdite.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Responsabilite</h2>
          <p>
            Nous nous efforcons de maintenir des informations exactes et a jour. Toutefois, des erreurs ponctuelles
            peuvent survenir. L&apos;utilisateur est invite a verifier les informations importantes avant achat.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Contact</h2>
          <p>
            Service client: <a href="mailto:contact@cosmetishop.com">contact@cosmetishop.com</a> | 514 435 9870.
          </p>
        </section>
      </main>
    </div>
  );
}
