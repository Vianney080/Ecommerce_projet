import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

export function PageEspaceClient() {
  useDocumentTitle("Espace client");
  useMetaDescription(
    "Accédez à votre espace CosmétiShop : connexion, inscription, catalogue et panier."
  );
  const { utilisateur } = useAuth();

  return (
    <div className="client-page">
      <main className="client-shell">
        <div className="client-header">
          <Link to="/" className="client-back-link">
            ← Retour à l&apos;accueil
          </Link>
          <h1 className="client-title">Espace client</h1>
          <p className="client-subtitle">
            Choisissez une option pour accéder à votre compte ou en créer un nouveau.
          </p>
        </div>

        <div className="client-cards">
          {utilisateur && (
            <article className="client-card">
              <h2>Mon espace</h2>
              <p>Accédez au catalogue, à votre panier personnel et à vos commandes.</p>
              <div className="client-actions-inline">
                <Link to="/profil" className="client-action client-action-primary">
                  Mon profil
                </Link>
                <Link to="/catalogue" className="client-action client-action-secondary">
                  Catalogue
                </Link>
                <Link to="/panier" className="client-action client-action-secondary">
                  Mon panier
                </Link>
                <Link to="/commandes" className="client-action client-action-secondary">
                  Mes commandes
                </Link>
              </div>
            </article>
          )}

          <article className="client-card">
            <h2>Déjà client ?</h2>
            <p>Connectez-vous pour accéder à votre panier, vos commandes et votre historique.</p>
            <Link to="/connexion" className="client-action client-action-primary">
              Se connecter
            </Link>
          </article>

          <article className="client-card">
            <h2>Nouveau sur la boutique ?</h2>
            <p>Créez votre compte en quelques secondes pour commencer vos achats.</p>
            <Link to="/inscription" className="client-action client-action-secondary">
              Créer un compte
            </Link>
          </article>
        </div>
      </main>
    </div>
  );
}

