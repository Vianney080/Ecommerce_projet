import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { AuthTextField } from "../components/AuthFormFields";
import { MSG_EMAIL_INVALIDE, messageErreurRequeteAuth } from "../utils/authMessages";
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
    if (!emailNettoye || !EMAIL_REGEX.test(emailNettoye)) {
      setErreurEmail(MSG_EMAIL_INVALIDE);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        message: string;
        codeDev?: string;
        avertissementEmail?: string;
        detailEnvoiEmail?: string;
      }>("/auth/mot-de-passe-oublie", {
        email: emailNettoye,
      });
      setSucces(
        res.data?.message ||
          "Si un compte existe avec cette adresse e-mail, un code à 6 chiffres vient d’être envoyé."
      );
      const av = res.data?.avertissementEmail;
      const det = res.data?.detailEnvoiEmail;
      setAvertissementSmtp(av ? (det ? `${av}\n\nDétail : ${det}` : av) : null);
      if (res.data?.codeDev) {
        setCodeDev(res.data.codeDev);
      }
    } catch (err: unknown) {
      setErreur(messageErreurRequeteAuth(err, "Impossible d’envoyer le code pour le moment."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="client-page">
      <main className="auth-shell">
        <div className="auth-header">
          <Link to="/connexion" className="client-back-link">
            ← Retour à la connexion
          </Link>
          <h1 className="auth-title">Mot de passe oublié</h1>
          <p className="auth-subtitle">
            Indiquez l’adresse e-mail de votre compte. Nous vous enverrons un code à 6 chiffres pour choisir un nouveau
            mot de passe.
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
          <p className="auth-switch-text" style={{ marginTop: "0.25rem" }}>
            <Link
              to="/reinitialiser-mot-de-passe"
              state={{ email: email.trim().toLowerCase() }}
              className="auth-submit-primary"
            >
              Saisir le code et le nouveau mot de passe
            </Link>
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form-modern" noValidate>
          <AuthTextField
            label="Adresse e-mail"
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErreurEmail(null);
            }}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            error={erreurEmail ?? undefined}
          />

          <button type="submit" disabled={loading} className="auth-submit-primary">
            {loading ? "Envoi en cours…" : "M’envoyer le code"}
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
