import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { api } from "../api";
import "../styles.css";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PageReinitialiserMotDePasse() {
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
              La réinitialisation se fait désormais avec un <strong>code à 6 chiffres</strong> envoyé par email.
            </p>
          </div>
          <div className="auth-alert auth-alert-info">
            Demandez un nouveau code depuis la page « Mot de passe oublié ».
          </div>
          <Link to="/mot-de-passe-oublie" className="client-action client-action-primary" style={{ textDecoration: "none", textAlign: "center", display: "inline-block" }}>
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

    if (!EMAIL_REGEX.test(emailNettoye)) {
      nouvellesErreurs.email = "Adresse email invalide.";
    }
    if (chiffres.length !== 6) {
      nouvellesErreurs.code = "Le code doit contenir 6 chiffres.";
    }
    if (!PASSWORD_REGEX.test(motDePasse)) {
      nouvellesErreurs.motDePasse =
        "Minimum 8 caracteres, avec majuscule, minuscule, chiffre et caractere special.";
    }
    if (motDePasse !== confirmation) {
      nouvellesErreurs.confirmation = "La confirmation ne correspond pas au mot de passe.";
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
      setSucces(res.data?.message || "Mot de passe réinitialisé avec succès.");
      window.setTimeout(() => navigate("/connexion"), 1200);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de la réinitialisation du mot de passe.";
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
            ← Retour à la connexion
          </Link>
          <h1 className="auth-title">Réinitialiser le mot de passe</h1>
          <p className="auth-subtitle">
            Saisissez l&apos;email utilisé, le code reçu par courriel, puis votre nouveau mot de passe.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}

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
            Code à 6 chiffres (email)
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setErreursChamps((prev) => ({ ...prev, code: undefined }));
              }}
              className="auth-input"
              placeholder="000000"
              autoComplete="one-time-code"
              required
            />
            {erreursChamps.code && <span className="auth-field-error">{erreursChamps.code}</span>}
          </label>

          <label className="auth-label">
            Nouveau mot de passe
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => {
                setMotDePasse(e.target.value);
                setErreursChamps((prev) => ({ ...prev, motDePasse: undefined }));
              }}
              className="auth-input"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
            <span className="auth-helper">
              8+ caracteres, avec majuscule, minuscule, chiffre et caractere special.
            </span>
            {erreursChamps.motDePasse && (
              <span className="auth-field-error">{erreursChamps.motDePasse}</span>
            )}
          </label>

          <label className="auth-label">
            Confirmer le mot de passe
            <input
              type="password"
              value={confirmation}
              onChange={(e) => {
                setConfirmation(e.target.value);
                setErreursChamps((prev) => ({ ...prev, confirmation: undefined }));
              }}
              className="auth-input"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
            {erreursChamps.confirmation && (
              <span className="auth-field-error">{erreursChamps.confirmation}</span>
            )}
          </label>

          <button type="submit" disabled={loading} className="client-action client-action-primary">
            {loading ? "Mise à jour…" : "Enregistrer le nouveau mot de passe"}
          </button>
        </form>

        <p className="auth-switch-text">
          <Link to="/mot-de-passe-oublie" className="auth-switch-link">
            Je n&apos;ai pas reçu de code
          </Link>
        </p>
      </main>
    </div>
  );
}
