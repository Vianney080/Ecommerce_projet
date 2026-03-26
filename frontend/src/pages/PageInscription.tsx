import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

export function PageInscription() {
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
      nouvellesErreurs.nom = "Le nom doit contenir entre 2 et 60 caracteres.";
    }

    if (!EMAIL_REGEX.test(emailNettoye)) {
      nouvellesErreurs.email = "Veuillez saisir une adresse email valide.";
    }

    if (!PASSWORD_REGEX.test(motDePasseTexte)) {
      nouvellesErreurs.motDePasse =
        "Minimum 8 caracteres, avec majuscule, minuscule, chiffre et caractere special.";
    }

    if (confirmationMotDePasse !== motDePasseTexte) {
      nouvellesErreurs.confirmationMotDePasse = "La confirmation du mot de passe ne correspond pas.";
    }

    if (!accepteConfidentialite) {
      nouvellesErreurs.confidentialite =
        "Vous devez accepter la politique de confidentialite pour creer un compte.";
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de l'inscription";
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
          <h1 className="auth-title">Inscription</h1>
          <p className="auth-subtitle">
            Creez votre compte pour gerer vos commandes et votre panier.
          </p>
        </div>

        {erreur && <div className="auth-alert auth-alert-error">{erreur}</div>}
        {succes && <div className="auth-alert auth-alert-success">{succes}</div>}
        {avertissementSmtp && (
          <div className="auth-alert auth-alert-warning" role="status">
            {avertissementSmtp}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <label className="auth-label">
            Nom complet
            <input
              type="text"
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                setErreursChamps((prev) => ({ ...prev, nom: undefined }));
              }}
              className="auth-input"
              minLength={2}
              maxLength={60}
              required
            />
            {erreursChamps.nom && <span className="auth-field-error">{erreursChamps.nom}</span>}
          </label>

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
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
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
              value={confirmationMotDePasse}
              onChange={(e) => {
                setConfirmationMotDePasse(e.target.value);
                setErreursChamps((prev) => ({ ...prev, confirmationMotDePasse: undefined }));
              }}
              className="auth-input"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            {erreursChamps.confirmationMotDePasse && (
              <span className="auth-field-error">{erreursChamps.confirmationMotDePasse}</span>
            )}
          </label>

          <div className="auth-privacy-box">
            <p className="auth-privacy-title">Politique de confidentialite</p>
            <p className="auth-privacy-text">
              En creant un compte, vous acceptez que vos donnees (nom, email, commandes et adresse de livraison)
              soient utilisees pour traiter vos achats, assurer le suivi client et ameliorer votre experience sur la
              boutique.
            </p>
            <p className="auth-privacy-text">
              Vous pouvez demander la mise a jour ou la suppression de vos donnees a tout moment via votre espace
              client.
            </p>
            <p className="auth-privacy-link-row">
              <Link to="/politique-confidentialite" className="auth-switch-link">
                Consulter la politique complete
              </Link>
            </p>
            <label className="auth-privacy-check">
              <input
                type="checkbox"
                checked={accepteConfidentialite}
                onChange={(e) => {
                  setAccepteConfidentialite(e.target.checked);
                  setErreursChamps((prev) => ({ ...prev, confidentialite: undefined }));
                }}
                required
              />
              <span>
                J&apos;accepte la{" "}
                <Link to="/politique-confidentialite" className="auth-switch-link">
                  politique de confidentialite
                </Link>
                .
              </span>
            </label>
            {erreursChamps.confidentialite && (
              <span className="auth-field-error">{erreursChamps.confidentialite}</span>
            )}
          </div>

          <button type="submit" disabled={loading} className="client-action client-action-primary">
            {loading ? "Creation..." : "Creer mon compte"}
          </button>
        </form>

        <p className="auth-switch-text">
          Vous avez deja un compte ?{" "}
          <Link to="/connexion" state={{ from: destinationApresConnexion }} className="auth-switch-link">
            Se connecter
          </Link>
        </p>
      </main>
    </div>
  );
}

