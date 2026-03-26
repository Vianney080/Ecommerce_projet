import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { api } from "../api";
import "../styles.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EtatNavVerifier = { avertissementEmail?: string; detailEnvoiEmail?: string; codeDev?: string } | null;

export function PageVerifierEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRenvoi, setLoadingRenvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [codeDev, setCodeDev] = useState<string | null>(null);
  const [avertissementSmtp, setAvertissementSmtp] = useState<string | null>(null);

  useEffect(() => {
    const em = searchParams.get("email") || "";
    if (em && EMAIL_REGEX.test(em)) {
      setEmail((prev) => prev || em);
    }
  }, [searchParams]);

  useEffect(() => {
    const st = (location.state as EtatNavVerifier)?.avertissementEmail;
    const det = (location.state as EtatNavVerifier)?.detailEnvoiEmail;
    const cd = (location.state as EtatNavVerifier)?.codeDev;
    if (st) {
      setAvertissementSmtp(det ? `${st}\n\nDétail : ${det}` : st);
    }
    if (cd) {
      setCodeDev(String(cd));
    }
  }, [location.state]);

  async function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setCodeDev(null);
    const emailNettoye = email.trim().toLowerCase();
    const chiffres = code.replace(/\D/g, "").slice(0, 6);

    if (!EMAIL_REGEX.test(emailNettoye)) {
      setErreur("Adresse email invalide.");
      return;
    }
    if (chiffres.length !== 6) {
      setErreur("Saisissez les 6 chiffres du code reçu par email.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message?: string }>("/auth/verifier-email", {
        email: emailNettoye,
        code: chiffres,
      });
      setSucces(res.data?.message || "Email vérifié.");
      window.setTimeout(() => navigate("/connexion", { replace: true }), 1400);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Vérification impossible.";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  async function renvoyerCode() {
    setErreur(null);
    setSucces(null);
    setCodeDev(null);
    const emailNettoye = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailNettoye)) {
      setErreur("Indiquez d'abord une adresse email valide.");
      return;
    }
    setLoadingRenvoi(true);
    try {
      const res = await api.post<{
        message?: string;
        codeDev?: string;
        avertissementEmail?: string;
        detailEnvoiEmail?: string;
      }>("/auth/renvoyer-code-verification", {
        email: emailNettoye,
      });
      setSucces(res.data?.message || "Si un compte non vérifié existe, un code a été envoyé.");
      const av = res.data?.avertissementEmail;
      const det = res.data?.detailEnvoiEmail;
      setAvertissementSmtp(av ? (det ? `${av}\n\nDétail : ${det}` : av) : null);
      if (res.data?.codeDev) {
        setCodeDev(res.data.codeDev);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Erreur lors de l'envoi.";
      setErreur(msg);
    } finally {
      setLoadingRenvoi(false);
    }
  }

  return (
    <div className="client-page">
      <main className="auth-shell">
        <div className="auth-header">
          <Link to="/connexion" className="client-back-link">
            ← Retour à la connexion
          </Link>
          <h1 className="auth-title">Vérifier mon email</h1>
          <p className="auth-subtitle">
            Un code à 6 chiffres a été envoyé à votre adresse après l&apos;inscription. Saisissez-le ci-dessous pour
            activer votre compte.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}
        {avertissementSmtp && (
          <div className="auth-alert auth-alert-warning" role="status">
            {avertissementSmtp}
          </div>
        )}

        <form onSubmit={soumettre} className="auth-form-modern">
          <label className="auth-label">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-label">
            Code à 6 chiffres
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="auth-input"
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
          </label>

          <button type="submit" disabled={loading} className="client-action client-action-primary">
            {loading ? "Vérification…" : "Valider mon email"}
          </button>
        </form>

        <p className="auth-switch-text">
          Code non reçu ?{" "}
          <button
            type="button"
            className="auth-switch-link"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
            onClick={renvoyerCode}
            disabled={loadingRenvoi}
          >
            {loadingRenvoi ? "Envoi…" : "Renvoyer un code"}
          </button>
        </p>

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
