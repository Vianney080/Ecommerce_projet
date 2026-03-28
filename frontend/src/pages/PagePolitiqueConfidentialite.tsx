import { Link } from "react-router-dom";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

export function PagePolitiqueConfidentialite() {
  useDocumentTitle("Politique de confidentialité");
  useMetaDescription(
    "Comment CosmétiShop collecte et protège vos données personnelles (compte, commandes, livraison)."
  );
  return (
    <div className="legal-page">
      <main className="legal-shell">
        <div className="legal-header">
          <Link to="/" className="client-back-link">
            Retour à l&apos;accueil
          </Link>
          <h1 className="legal-title">Politique de confidentialité</h1>
          <p className="legal-subtitle">Dernière mise à jour : {new Date().toLocaleDateString("fr-CA")}</p>
        </div>

        <section className="legal-section">
          <h2>1. Donnees collectees</h2>
          <p>
            Nous collectons les informations necessaires a la gestion de votre compte et de vos commandes: nom, email,
            adresse de livraison, telephone, historique des achats et preferences.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Utilisation des donnees</h2>
          <p>Vos donnees sont utilisees pour:</p>
          <ul className="legal-list">
            <li>creer et securiser votre compte client,</li>
            <li>traiter, expedier et suivre vos commandes,</li>
            <li>assurer le service apres-vente et le support client,</li>
            <li>ameliorer l&apos;experience utilisateur sur la boutique.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Conservation et securite</h2>
          <p>
            Nous mettons en place des mesures techniques et organisationnelles pour proteger vos informations contre
            les acces non autorises, la perte ou l&apos;alteration.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Partage des donnees</h2>
          <p>
            Vos donnees ne sont partagees qu&apos;avec les services necessaires au traitement de votre commande (paiement,
            livraison, hebergement) ou lorsque la loi l&apos;exige.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Vos droits</h2>
          <p>
            Vous pouvez demander l&apos;acces, la correction, la mise a jour ou la suppression de vos donnees personnelles
            via votre espace client ou en nous contactant a <a href="mailto:contact@cosmetishop.com">contact@cosmetishop.com</a>.
          </p>
        </section>
      </main>
    </div>
  );
}
