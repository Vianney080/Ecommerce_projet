import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { api } from "../api";
import { AuthTextField } from "../components/AuthFormFields";
import {
  MSG_CODE_6,
  MSG_EMAIL_INVALIDE,
  messageErreurRequeteAuth,
} from "../utils/authMessages";
import "../styles.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EtatNavVerifier = {
  from?: string;
  avertissementEmail?: string;
  detailEnvoiEmail?: string;
  codeDev?: string;
} | null;

function destinationDepuisEtat(state: unknown): string {
  const from = (state as EtatNavVerifier)?.from;
  if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/";
}

export function PageVerifierEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const destinationApresConnexion = destinationDepuisEtat(location.state);
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRenvoi, setLoadingRenvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [codeDev, setCodeDev] = useState<string | null>(null);
  const [avertissementSmtp, setAvertissementSmtp] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<{ email?: string; code?: string }>({});

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
    setErreursChamps({});

    const emailNettoye = email.trim().toLowerCase();
    const chiffres = code.replace(/\D/g, "").slice(0, 6);
    const champs: { email?: string; code?: string } = {};

    if (!emailNettoye || !EMAIL_REGEX.test(emailNettoye)) {
      champs.email = MSG_EMAIL_INVALIDE;
    }
    if (chiffres.length !== 6) {
      champs.code = MSG_CODE_6;
    }
    if (Object.keys(champs).length > 0) {
      setErreursChamps(champs);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message?: string }>("/auth/verifier-email", {
        email: emailNettoye,
        code: chiffres,
      });
      setSucces(res.data?.message || "Votre adresse e-mail est vérifiée. Vous pouvez vous connecter.");
      window.setTimeout(
        () =>
          navigate("/connexion", {
            replace: true,
            state: { from: destinationApresConnexion },
          }),
        1400
      );
    } catch (err: unknown) {
      setErreur(messageErreurRequeteAuth(err, "La vérification n’a pas abouti."));
    } finally {
      setLoading(false);
    }
  }

  async function renvoyerCode() {
    setErreur(null);
    setSucces(null);
    setCodeDev(null);
    setErreursChamps({});

    const emailNettoye = email.trim().toLowerCase();
    if (!emailNettoye || !EMAIL_REGEX.test(emailNettoye)) {
      setErreursChamps({ email: MSG_EMAIL_INVALIDE });
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
      setSucces(res.data?.message || "Si un compte non vérifié existe, un nouveau code vient d’être envoyé.");
      const av = res.data?.avertissementEmail;
      const det = res.data?.detailEnvoiEmail;
      setAvertissementSmtp(av ? (det ? `${av}\n\nDétail : ${det}` : av) : null);
      if (res.data?.codeDev) {
        setCodeDev(res.data.codeDev);
      }
    } catch (err: unknown) {
      setErreur(messageErreurRequeteAuth(err, "Impossible d’envoyer un nouveau code pour le moment."));
    } finally {
      setLoadingRenvoi(false);
    }
  }

  return (
    <div className="client-page">
      <main className="auth-shell">
        <div className="auth-header">
          <Link to="/connexion" state={{ from: destinationApresConnexion }} className="client-back-link">
            ← Retour à la connexion
          </Link>
          <h1 className="auth-title">Vérifier mon e-mail</h1>
          <p className="auth-subtitle">
            Un code à 6 chiffres a été envoyé après votre inscription. Saisissez-le ci-dessous pour activer votre
            compte.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}
        {avertissementSmtp && (
          <div className="auth-alert auth-alert-warning" role="status">
            {avertissementSmtp}
          </div>
        )}

        <form onSubmit={soumettre} className="auth-form-modern" noValidate>
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

          <AuthTextField
            label="Code à 6 chiffres"
            required
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setErreursChamps((prev) => ({ ...prev, code: undefined }));
            }}
            placeholder="000000"
            autoComplete="one-time-code"
            hint={!erreursChamps.code ? "Vérifiez aussi le dossier courrier indésirable (spam)." : undefined}
            error={erreursChamps.code}
          />

          <button type="submit" disabled={loading} className="auth-submit-primary">
            {loading ? "Vérification…" : "Valider mon e-mail"}
          </button>
        </form>

        <p className="auth-switch-text" style={{ textAlign: "center", marginTop: "0.85rem" }}>
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
