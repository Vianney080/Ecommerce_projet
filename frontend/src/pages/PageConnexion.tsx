import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { AuthPasswordField, AuthTextField } from "../components/AuthFormFields";
import {
  MSG_EMAIL_INVALIDE,
  MSG_MDP_REQUIS,
  messageErreurRequeteAuth,
} from "../utils/authMessages";
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

    if (!emailNettoye) {
      nouvellesErreurs.email = MSG_EMAIL_INVALIDE;
    } else if (!EMAIL_REGEX.test(emailNettoye)) {
      nouvellesErreurs.email = MSG_EMAIL_INVALIDE;
    }

    if (!motDePasseTexte.trim()) {
      nouvellesErreurs.motDePasse = MSG_MDP_REQUIS;
    }

    if (Object.keys(nouvellesErreurs).length > 0) {
      setErreursChamps(nouvellesErreurs);
      return;
    }

    setLoading(true);
    try {
      await connexion(emailNettoye, motDePasseTexte);
      navigate(destinationApresConnexion, { replace: true });
    } catch (err: unknown) {
      if ((err as { response?: { data?: { code?: string } } })?.response?.data?.code === "EMAIL_NON_VERIFIE") {
        navigate(`/verifier-email?email=${encodeURIComponent(emailNettoye)}`, { replace: false });
        return;
      }
      setErreur(messageErreurRequeteAuth(err, "Connexion impossible pour le moment."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="client-page">
      <main className="auth-shell">
        <div className="auth-header">
          <Link to="/espace-client" className="client-back-link">
            ← Retour à l’espace client
          </Link>
          <h1 className="auth-title">Connexion</h1>
          <p className="auth-subtitle">
            Connectez-vous pour accéder à votre panier et à vos commandes.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}

        <form onSubmit={handleSubmit} className="auth-form-modern" noValidate>
          <AuthTextField
            label="Adresse e-mail"
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErreursChamps((prev) => ({ ...prev, email: undefined }));
            }}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            error={erreursChamps.email}
          />

          <AuthPasswordField
            label="Mot de passe"
            required
            value={motDePasse}
            onChange={(e) => {
              setMotDePasse(e.target.value);
              setErreursChamps((prev) => ({ ...prev, motDePasse: undefined }));
            }}
            autoComplete="current-password"
            error={erreursChamps.motDePasse}
          />

          <button type="submit" disabled={loading} className="auth-submit-primary">
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="auth-forgot">
          <Link to="/mot-de-passe-oublie" className="auth-switch-link">
            Mot de passe oublié ?
          </Link>
        </p>

        <p className="auth-divider-text">Nouveau sur CosmétiShop ?</p>
        <p className="auth-switch-text" style={{ marginTop: "0.35rem", textAlign: "center" }}>
          <Link to="/inscription" state={{ from: destinationApresConnexion }} className="auth-switch-link">
            Créer un compte
          </Link>
        </p>
      </main>
    </div>
  );
}
