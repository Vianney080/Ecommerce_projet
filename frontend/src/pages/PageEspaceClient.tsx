import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles.css";

export function PageEspaceClient() {
  const { utilisateur } = useAuth();

  return (
    <div className="client-page">
      <main className="client-shell">
        <div className="client-header">
          <Link to="/" className="client-back-link">
            ← Retour a l'accueil
          </Link>
          <h1 className="client-title">Espace client</h1>
          <p className="client-subtitle">
            Choisissez une option pour acceder a votre compte ou en creer un nouveau.
          </p>
        </div>

        <div className="client-cards">
          {utilisateur && (
            <article className="client-card">
              <h2>Mon espace</h2>
              <p>Accedez au catalogue, a votre panier personnel et a vos commandes.</p>
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
            <h2>Deja client ?</h2>
            <p>Connectez-vous pour acceder a votre panier, vos commandes et votre historique.</p>
            <Link to="/connexion" className="client-action client-action-primary">
              Se connecter
            </Link>
          </article>

          <article className="client-card">
            <h2>Nouveau sur la boutique ?</h2>
            <p>Creez votre compte en quelques secondes pour commencer vos achats.</p>
            <Link to="/inscription" className="client-action client-action-secondary">
              Creer un compte
            </Link>
          </article>
        </div>
      </main>
    </div>
  );
}

