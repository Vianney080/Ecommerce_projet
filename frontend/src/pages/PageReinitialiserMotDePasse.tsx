import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { api } from "../api";
import { AuthPasswordField, AuthTextField } from "../components/AuthFormFields";
import {
  MSG_CODE_6,
  MSG_CONFIRMATION_MDP,
  MSG_EMAIL_INVALIDE,
  MSG_MDP_REGLES,
  messageErreurRequeteAuth,
} from "../utils/authMessages";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PageReinitialiserMotDePasse() {
  useDocumentTitle("Nouveau mot de passe");
  useMetaDescription("Choisissez un nouveau mot de passe sécurisé pour votre compte CosmétiShop.");
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const emailState = (location.state as { email?: string } | null)?.email || "";

  const [email, setEmail] = useState(emailState);
  const [code, setCode] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<{
    email?: string;
    code?: string;
    motDePasse?: string;
    confirmation?: string;
  }>({});

  useEffect(() => {
    if (emailState && !email) {
      setEmail(emailState);
    }
  }, [emailState, email]);

  if (token) {
    return (
      <div className="client-page">
        <main className="auth-shell">
          <div className="auth-header">
            <Link to="/connexion" className="client-back-link">
              ← Retour à la connexion
            </Link>
            <h1 className="auth-title">Lien expiré</h1>
            <p className="auth-subtitle">
              La réinitialisation se fait avec un <strong>code à 6 chiffres</strong> envoyé par e-mail.
            </p>
          </div>
          <div className="auth-alert auth-alert-info">
            Demandez un nouveau code depuis la page « Mot de passe oublié ».
          </div>
          <Link to="/mot-de-passe-oublie" className="auth-submit-primary">
            Mot de passe oublié
          </Link>
        </main>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setErreursChamps({});

    const emailNettoye = email.trim().toLowerCase();
    const chiffres = code.replace(/\D/g, "").slice(0, 6);
    const nouvellesErreurs: typeof erreursChamps = {};

    if (!emailNettoye || !EMAIL_REGEX.test(emailNettoye)) {
      nouvellesErreurs.email = MSG_EMAIL_INVALIDE;
    }
    if (chiffres.length !== 6) {
      nouvellesErreurs.code = MSG_CODE_6;
    }
    if (!PASSWORD_REGEX.test(motDePasse)) {
      nouvellesErreurs.motDePasse = MSG_MDP_REGLES;
    }
    if (motDePasse !== confirmation) {
      nouvellesErreurs.confirmation = MSG_CONFIRMATION_MDP;
    }

    if (Object.keys(nouvellesErreurs).length > 0) {
      setErreursChamps(nouvellesErreurs);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/auth/reinitialiser-mot-de-passe", {
        email: emailNettoye,
        code: chiffres,
        motDePasse,
      });
      setSucces(res.data?.message || "Votre mot de passe a bien été mis à jour.");
      window.setTimeout(() => navigate("/connexion"), 1200);
    } catch (err: unknown) {
      setErreur(messageErreurRequeteAuth(err, "La réinitialisation n’a pas pu être enregistrée."));
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
          <h1 className="auth-title">Nouveau mot de passe</h1>
          <p className="auth-subtitle">
            Saisissez l’e-mail du compte, le code reçu par courriel, puis votre nouveau mot de passe.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}

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
            hint={!erreursChamps.code ? "Le code figure dans l’e-mail « Mot de passe oublié »." : undefined}
            error={erreursChamps.code}
          />

          <AuthPasswordField
            label="Nouveau mot de passe"
            required
            value={motDePasse}
            onChange={(e) => {
              setMotDePasse(e.target.value);
              setErreursChamps((prev) => ({ ...prev, motDePasse: undefined }));
            }}
            autoComplete="new-password"
            hint={!erreursChamps.motDePasse ? MSG_MDP_REGLES : undefined}
            error={erreursChamps.motDePasse}
          />

          <AuthPasswordField
            label="Confirmer le nouveau mot de passe"
            required
            value={confirmation}
            onChange={(e) => {
              setConfirmation(e.target.value);
              setErreursChamps((prev) => ({ ...prev, confirmation: undefined }));
            }}
            autoComplete="new-password"
            error={erreursChamps.confirmation}
          />

          <button type="submit" disabled={loading} className="auth-submit-primary">
            {loading ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
          </button>
        </form>

        <p className="auth-switch-text" style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link to="/mot-de-passe-oublie" className="auth-switch-link">
            Je n’ai pas reçu de code
          </Link>
        </p>
      </main>
    </div>
  );
}
