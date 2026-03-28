import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { AuthFieldFooter, AuthPasswordField, AuthTextField } from "../components/AuthFormFields";
import {
  MSG_CONFIDENTIALITE,
  MSG_CONFIRMATION_MDP,
  MSG_EMAIL_INVALIDE,
  MSG_MDP_REGLES,
  MSG_NOM_INVALIDE,
  messageErreurRequeteAuth,
} from "../utils/authMessages";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

export function PageInscription() {
  useDocumentTitle("Inscription");
  useMetaDescription(
    "Créez votre compte CosmétiShop : catalogue cosmétiques, panier et commandes en ligne."
  );
  const { inscription } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destinationApresConnexion =
    (location.state as { from?: string } | null)?.from || "/";
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [accepteConfidentialite, setAccepteConfidentialite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [avertissementSmtp, setAvertissementSmtp] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<{
    nom?: string;
    email?: string;
    motDePasse?: string;
    confirmationMotDePasse?: string;
    confidentialite?: string;
  }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(null);
    setAvertissementSmtp(null);
    setErreursChamps({});

    const nomNettoye = nom.trim();
    const emailNettoye = email.trim().toLowerCase();
    const motDePasseTexte = motDePasse;
    const nouvellesErreurs: {
      nom?: string;
      email?: string;
      motDePasse?: string;
      confirmationMotDePasse?: string;
      confidentialite?: string;
    } = {};

    if (nomNettoye.length < 2 || nomNettoye.length > 60) {
      nouvellesErreurs.nom = MSG_NOM_INVALIDE;
    }

    if (!emailNettoye) {
      nouvellesErreurs.email = MSG_EMAIL_INVALIDE;
    } else if (!EMAIL_REGEX.test(emailNettoye)) {
      nouvellesErreurs.email = MSG_EMAIL_INVALIDE;
    }

    if (!PASSWORD_REGEX.test(motDePasseTexte)) {
      nouvellesErreurs.motDePasse = MSG_MDP_REGLES;
    }

    if (confirmationMotDePasse !== motDePasseTexte) {
      nouvellesErreurs.confirmationMotDePasse = MSG_CONFIRMATION_MDP;
    }

    if (!accepteConfidentialite) {
      nouvellesErreurs.confidentialite = MSG_CONFIDENTIALITE;
    }

    if (Object.keys(nouvellesErreurs).length > 0) {
      setErreursChamps(nouvellesErreurs);
      return;
    }

    setLoading(true);
    try {
      const data = await inscription({ nom: nomNettoye, email: emailNettoye, motDePasse: motDePasseTexte });
      if (data.verificationRequise) {
        setSucces(data.message || "Consultez votre boîte mail pour le code de vérification.");
        if (data.avertissementEmail) {
          setAvertissementSmtp(
            data.detailEnvoiEmail
              ? `${data.avertissementEmail}\n\nDétail : ${data.detailEnvoiEmail}`
              : data.avertissementEmail
          );
        }
        const delai = data.avertissementEmail ? 3500 : 900;
        setTimeout(
          () =>
            navigate(`/verifier-email?email=${encodeURIComponent(emailNettoye)}`, {
              state: {
                from: destinationApresConnexion,
                avertissementEmail: data.avertissementEmail,
                detailEnvoiEmail: data.detailEnvoiEmail,
                codeDev: data.codeDev,
              },
            }),
          delai
        );
      } else {
        setSucces("Compte créé avec succès. Vous pouvez vous connecter.");
        setTimeout(() => navigate("/connexion", { state: { from: destinationApresConnexion } }), 1000);
      }
    } catch (err: unknown) {
      setErreur(messageErreurRequeteAuth(err, "L’inscription n’a pas pu être finalisée."));
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
          <h1 className="auth-title">Créer un compte</h1>
          <p className="auth-subtitle">
            Créez votre compte pour suivre vos commandes et votre panier en toute simplicité.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}
        {avertissementSmtp && (
          <div className="auth-alert auth-alert-warning" role="status">
            {avertissementSmtp}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-modern" noValidate>
          <AuthTextField
            label="Nom complet"
            required
            type="text"
            value={nom}
            onChange={(e) => {
              setNom(e.target.value);
              setErreursChamps((prev) => ({ ...prev, nom: undefined }));
            }}
            minLength={2}
            maxLength={60}
            autoComplete="name"
            error={erreursChamps.nom}
          />

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
            autoComplete="new-password"
            hint={!erreursChamps.motDePasse ? MSG_MDP_REGLES : undefined}
            error={erreursChamps.motDePasse}
          />

          <AuthPasswordField
            label="Confirmer le mot de passe"
            required
            value={confirmationMotDePasse}
            onChange={(e) => {
              setConfirmationMotDePasse(e.target.value);
              setErreursChamps((prev) => ({ ...prev, confirmationMotDePasse: undefined }));
            }}
            autoComplete="new-password"
            error={erreursChamps.confirmationMotDePasse}
          />

          <div className="auth-privacy-box">
            <p className="auth-privacy-title">Données personnelles</p>
            <p className="auth-privacy-text">
              En créant un compte, vous acceptez que vos données (nom, e-mail, commandes et adresse de livraison)
              soient utilisées pour traiter vos achats et assurer le suivi client.
            </p>
            <p className="auth-privacy-text">
              Vous pouvez demander la mise à jour ou la suppression de vos données à tout moment depuis votre espace
              client.
            </p>
            <p className="auth-privacy-link-row">
              <Link to="/politique-confidentialite" className="auth-switch-link">
                Lire la politique de confidentialité
              </Link>
            </p>
            <AuthFieldFooter error={erreursChamps.confidentialite}>
              <label className="auth-privacy-check">
                <input
                  type="checkbox"
                  checked={accepteConfidentialite}
                  onChange={(e) => {
                    setAccepteConfidentialite(e.target.checked);
                    setErreursChamps((prev) => ({ ...prev, confidentialite: undefined }));
                  }}
                />
                <span>
                  J’accepte la{" "}
                  <Link to="/politique-confidentialite" className="auth-switch-link">
                    politique de confidentialité
                  </Link>
                  <abbr className="auth-required-mark" title="Champ obligatoire">
                    *
                  </abbr>
                </span>
              </label>
            </AuthFieldFooter>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-primary">
            {loading ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        <p className="auth-divider-text">Vous avez déjà un compte ?</p>
        <p className="auth-switch-text" style={{ marginTop: "0.35rem", textAlign: "center" }}>
          <Link to="/connexion" state={{ from: destinationApresConnexion }} className="auth-switch-link">
            Se connecter
          </Link>
        </p>
      </main>
    </div>
  );
}
