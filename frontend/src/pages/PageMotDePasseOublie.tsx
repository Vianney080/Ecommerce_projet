import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "../styles.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PageMotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [codeDev, setCodeDev] = useState<string | null>(null);
  const [avertissementSmtp, setAvertissementSmtp] = useState<string | null>(null);
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setCodeDev(null);
    setAvertissementSmtp(null);
    setErreurEmail(null);

    const emailNettoye = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailNettoye)) {
      setErreurEmail("Veuillez saisir une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        message: string;
        codeDev?: string;
        avertissementEmail?: string;
      }>("/auth/mot-de-passe-oublie", {
        email: emailNettoye
      });
      setSucces(
        res.data?.message ||
          "Si un compte existe avec cet email, un code de réinitialisation a été envoyé."
      );
      setAvertissementSmtp(res.data?.avertissementEmail || null);
      if (res.data?.codeDev) {
        setCodeDev(res.data.codeDev);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la demande de reinitialisation.";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="client-page">
      <main className="auth-shell">
        <div className="auth-header">
          <Link to="/connexion" className="client-back-link">
            ← Retour a la connexion
          </Link>
          <h1 className="auth-title">Mot de passe oublie</h1>
          <p className="auth-subtitle">
            Entrez votre email : vous recevrez un code à 6 chiffres pour choisir un nouveau mot de passe.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}
        {avertissementSmtp && (
          <div className="auth-alert auth-alert-warning" role="status">
            {avertissementSmtp}
          </div>
        )}
        {succes && (
          <p className="auth-switch-text" style={{ marginTop: "0.5rem" }}>
            <Link
              to="/reinitialiser-mot-de-passe"
              state={{ email: email.trim().toLowerCase() }}
              className="client-action client-action-primary"
              style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}
            >
              Saisir le code et nouveau mot de passe
            </Link>
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <label className="auth-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErreurEmail(null);
              }}
              className="auth-input"
              autoComplete="email"
              required
            />
            {erreurEmail && <span className="auth-field-error">{erreurEmail}</span>}
          </label>

          <button type="submit" disabled={loading} className="client-action client-action-primary">
            {loading ? "Envoi..." : "Envoyer le code"}
          </button>
        </form>

        {codeDev && (
          <div className="auth-debug-box">
            <p className="auth-helper">Mode développement (EMAIL_DEV_AFFICHER_CODE sur le serveur) :</p>
            <code className="auth-debug-link">{codeDev}</code>
          </div>
        )}
      </main>
    </div>
  );
}

