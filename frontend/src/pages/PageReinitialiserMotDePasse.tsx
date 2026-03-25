import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import "../styles.css";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

export function PageReinitialiserMotDePasse() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<{
    motDePasse?: string;
    confirmation?: string;
  }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setErreursChamps({});

    const nouvellesErreurs: { motDePasse?: string; confirmation?: string } = {};

    if (!PASSWORD_REGEX.test(motDePasse)) {
      nouvellesErreurs.motDePasse =
        "Minimum 8 caracteres, avec majuscule, minuscule, chiffre et caractere special.";
    }

    if (motDePasse !== confirmation) {
      nouvellesErreurs.confirmation = "La confirmation ne correspond pas au mot de passe.";
    }

    if (!token) {
      setErreur("Lien invalide. Veuillez refaire la demande de reinitialisation.");
      return;
    }

    if (Object.keys(nouvellesErreurs).length > 0) {
      setErreursChamps(nouvellesErreurs);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/auth/reinitialiser-mot-de-passe", {
        token,
        motDePasse
      });
      setSucces(res.data?.message || "Mot de passe reinitialise avec succes.");
      window.setTimeout(() => navigate("/connexion"), 1200);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la reinitialisation du mot de passe.";
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
          <h1 className="auth-title">Reinitialiser le mot de passe</h1>
          <p className="auth-subtitle">Choisissez un nouveau mot de passe securise.</p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}

        <form onSubmit={handleSubmit} className="auth-form-modern">
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
            {loading ? "Mise a jour..." : "Mettre a jour le mot de passe"}
          </button>
        </form>
      </main>
    </div>
  );
}

