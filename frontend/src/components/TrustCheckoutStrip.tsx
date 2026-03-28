import { Link } from "react-router-dom";

/** Rappels confiance / légal près du tunnel panier–paiement (e-commerce pro). */
export function TrustCheckoutStrip({ compact }: { compact?: boolean }) {
  return (
    <aside
      className={`trust-checkout-strip${compact ? " trust-checkout-strip--compact" : ""}`}
      role="note"
    >
      <p>
        <span className="trust-checkout-strip-title">Livraison &amp; transparence</span>
        Préparation sous 24–48&nbsp;h ouvrables, confirmation par e-mail. Consultez nos{" "}
        <Link to="/cgv">conditions générales de vente</Link>
        {" "}et notre{" "}
        <Link to="/politique-confidentialite">politique de confidentialité</Link>. Paiement
        sécurisé (démonstration pédagogique).
      </p>
    </aside>
  );
}
