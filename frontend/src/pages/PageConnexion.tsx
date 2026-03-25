import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PageConnexion() {
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destinationApresConnexion =
    (location.state as { from?: string } | null)?.from || "/";
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<{ email?: string; motDePasse?: string }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setErreursChamps({});

    const emailNettoye = email.trim().toLowerCase();
    const motDePasseTexte = motDePasse;
    const nouvellesErreurs: { email?: string; motDePasse?: string } = {};

    if (!EMAIL_REGEX.test(emailNettoye)) {
      nouvellesErreurs.email = "Veuillez saisir une adresse email valide.";
    }

    if (!motDePasseTexte.trim()) {
      nouvellesErreurs.motDePasse = "Veuillez saisir votre mot de passe.";
    }

    if (Object.keys(nouvellesErreurs).length > 0) {
      setErreursChamps(nouvellesErreurs);
      return;
    }

    setLoading(true);
    try {
      await connexion(emailNettoye, motDePasseTexte);
      navigate(destinationApresConnexion, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur de connexion";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="client-page">
      <main className="auth-shell">
        <div className="auth-header">
          <Link to="/espace-client" className="client-back-link">
            ← Retour a l'espace client
          </Link>
          <h1 className="auth-title">Connexion</h1>
          <p className="auth-subtitle">
            Connectez-vous pour acceder a votre panier et a vos commandes.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <label className="auth-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErreursChamps((prev) => ({ ...prev, email: undefined }));
              }}
              className="auth-input"
              autoComplete="email"
              required
            />
            {erreursChamps.email && <span className="auth-field-error">{erreursChamps.email}</span>}
          </label>

          <label className="auth-label">
            Mot de passe
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => {
                setMotDePasse(e.target.value);
                setErreursChamps((prev) => ({ ...prev, motDePasse: undefined }));
              }}
              className="auth-input"
              maxLength={128}
              autoComplete="current-password"
              required
            />
            {erreursChamps.motDePasse && (
              <span className="auth-field-error">{erreursChamps.motDePasse}</span>
            )}
          </label>

          <button type="submit" disabled={loading} className="client-action client-action-primary">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="auth-forgot">
          <Link to="/mot-de-passe-oublie" className="auth-switch-link">
            Mot de passe oublie ?
          </Link>
        </p>

        <p className="auth-switch-text">
          Pas encore de compte ?{" "}
          <Link to="/inscription" state={{ from: destinationApresConnexion }} className="auth-switch-link">
            Creer un compte
          </Link>
        </p>
      </main>
    </div>
  );
}

