import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_ORIGIN } from "../api";
import { useAuth } from "../AuthContext";
import { getCountryOptions, getRegionOptions, resolveCountryCode } from "../locationData";
import { AuthPasswordField } from "../components/AuthFormFields";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

type ProfilForm = {
  nom: string;
  email: string;
  telephone: string;
  bio: string;
  adresse: string;
  ville: string;
  province: string;
  codePostal: string;
  pays: string;
  themeInterface: "clair" | "sombre" | "systeme";
  newsletterActive: boolean;
  notificationsEmailActives: boolean;
};

function imageUtilisateurUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  return `${API_ORIGIN}/${url}`;
}

export function PageProfilClient() {
  useDocumentTitle("Mon profil");
  useMetaDescription(
    "Gérez vos informations personnelles, adresse, préférences et sécurité du compte CosmétiShop."
  );
  const { utilisateur, rafraichirProfil, majUtilisateurLocal } = useAuth();
  const [form, setForm] = useState<ProfilForm>({
    nom: "",
    email: "",
    telephone: "",
    bio: "",
    adresse: "",
    ville: "",
    province: "",
    codePostal: "",
    pays: "CA",
    themeInterface: "clair",
    newsletterActive: false,
    notificationsEmailActives: true,
  });
  const [avatarApercu, setAvatarApercu] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; texte: string } | null>(null);
  const [sauvegardeProfil, setSauvegardeProfil] = useState(false);
  const [sauvegardeMotDePasse, setSauvegardeMotDePasse] = useState(false);
  const [uploadAvatar, setUploadAvatar] = useState(false);
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!utilisateur) return;
    setForm({
      nom: utilisateur.nom || "",
      email: utilisateur.email || "",
      telephone: utilisateur.telephone || "",
      bio: utilisateur.bio || "",
      adresse: utilisateur.adresse || "",
      ville: utilisateur.ville || "",
      province: utilisateur.province || "",
      codePostal: utilisateur.codePostal || "",
      pays: resolveCountryCode(utilisateur.pays || "CA") || "CA",
      themeInterface: (utilisateur.themeInterface as "clair" | "sombre" | "systeme") || "clair",
      newsletterActive: Boolean(utilisateur.newsletterActive),
      notificationsEmailActives: utilisateur.notificationsEmailActives !== false,
    });
    setAvatarApercu(imageUtilisateurUrl(utilisateur.avatarUrl));
  }, [utilisateur]);

  useEffect(() => {
    if (!utilisateur) return;
    if (utilisateur.telephone !== undefined || utilisateur.avatarUrl !== undefined) return;
    rafraichirProfil().catch(() => {
      // silencieux
    });
  }, [rafraichirProfil, utilisateur]);

  const initiales = useMemo(() => {
    const base = (form.nom || utilisateur?.nom || "U").trim();
    return base
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [form.nom, utilisateur?.nom]);
  const paysOptions = useMemo(() => getCountryOptions("fr-CA"), []);
  const provinceOptions = useMemo(() => getRegionOptions(form.pays), [form.pays]);
  const provinceObligatoire = provinceOptions.length > 0;

  async function enregistrerProfil() {
    setMessage(null);
    setSauvegardeProfil(true);
    try {
      const res = await api.put("/auth/me", form);
      majUtilisateurLocal(res.data.utilisateur);
      try {
        const cleAdresse = `adresse_livraison:${utilisateur?.id || "invite"}`;
        const adresseLivraison = JSON.parse(localStorage.getItem(cleAdresse) || "{}");
        localStorage.setItem(
          cleAdresse,
          JSON.stringify({
            ...adresseLivraison,
            nomComplet: form.nom || adresseLivraison.nomComplet || "",
            telephone: form.telephone || adresseLivraison.telephone || "",
            rue: form.adresse || adresseLivraison.rue || "",
            ville: form.ville || adresseLivraison.ville || "",
            province: form.province || adresseLivraison.province || "",
            codePostal: form.codePostal || adresseLivraison.codePostal || "",
            pays: form.pays || adresseLivraison.pays || "CA",
          })
        );
      } catch {
        // silencieux
      }
      setMessage({ type: "success", texte: res.data?.message || "Profil mis a jour avec succes." });
    } catch (err: any) {
      setMessage({
        type: "error",
        texte: err?.response?.data?.message || "Erreur lors de la mise a jour du profil.",
      });
    } finally {
      setSauvegardeProfil(false);
    }
  }

  async function viderInfosLivraison() {
    if (!utilisateur) return;
    setMessage(null);
    setSauvegardeProfil(true);
    try {
      const payload = {
        ...form,
        adresse: "",
        ville: "",
        province: "",
        codePostal: "",
        pays: "CA",
      };
      const res = await api.put("/auth/me", payload);
      majUtilisateurLocal(res.data.utilisateur);
      setForm((precedent) => ({
        ...precedent,
        adresse: "",
        ville: "",
        province: "",
        codePostal: "",
        pays: "CA",
      }));
      localStorage.removeItem(`adresse_livraison:${utilisateur.id}`);
      setMessage({ type: "success", texte: "Infos de livraison videes avec succes." });
    } catch (err: any) {
      setMessage({
        type: "error",
        texte: err?.response?.data?.message || "Impossible de vider les informations de livraison.",
      });
    } finally {
      setSauvegardeProfil(false);
    }
  }

  async function televerserAvatar(fichier?: File) {
    if (!fichier) return;
    setMessage(null);
    setUploadAvatar(true);
    try {
      const data = new FormData();
      data.append("avatar", fichier);
      const res = await api.put("/auth/me/avatar", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      majUtilisateurLocal(res.data.utilisateur);
      setAvatarApercu(imageUtilisateurUrl(res.data?.utilisateur?.avatarUrl));
      setMessage({ type: "success", texte: res.data?.message || "Photo de profil mise a jour." });
    } catch (err: any) {
      setMessage({
        type: "error",
        texte: err?.response?.data?.message || "Impossible de televerser la photo.",
      });
    } finally {
      setUploadAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function changerMotDePasse() {
    setMessage(null);
    if (!motDePasseActuel || !nouveauMotDePasse || !confirmationMotDePasse) {
      setMessage({ type: "error", texte: "Veuillez remplir tous les champs de securite." });
      return;
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setMessage({ type: "error", texte: "La confirmation du mot de passe ne correspond pas." });
      return;
    }
    setSauvegardeMotDePasse(true);
    try {
      const res = await api.put("/auth/me/mot-de-passe", {
        motDePasseActuel,
        nouveauMotDePasse,
      });
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmationMotDePasse("");
      setMessage({ type: "success", texte: res.data?.message || "Mot de passe mis a jour." });
    } catch (err: any) {
      setMessage({
        type: "error",
        texte: err?.response?.data?.message || "Erreur lors de la mise a jour du mot de passe.",
      });
    } finally {
      setSauvegardeMotDePasse(false);
    }
  }

  if (!utilisateur) {
    return (
      <div className="client-page">
        <main className="client-shell">
          <div className="client-header">
            <Link to="/" className="client-back-link">
              Retour a l&apos;accueil
            </Link>
            <h1 className="client-title">Profil client</h1>
            <p className="client-subtitle">
              Connectez-vous pour accéder à vos paramètres personnalisés.
            </p>
          </div>
          <div className="client-cards">
            <article className="client-card">
              <h2>Acces requis</h2>
              <p>Vous devez etre connecte pour modifier votre profil.</p>
              <Link to="/connexion" className="client-action client-action-primary">
                Se connecter
              </Link>
            </article>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="profil-page">
      <main className="profil-shell">
        <div className="profil-head">
          <div>
            <Link to="/espace-client" className="client-back-link">
              Retour a l&apos;espace client
            </Link>
            <h1 className="profil-title">Mon profil</h1>
            <p className="profil-subtitle">
              Personnalisez votre compte: photo, informations, preferences et securite.
            </p>
          </div>
        </div>

        {message && (
          <div className={`profil-alert ${message.type === "error" ? "profil-alert-error" : "profil-alert-success"}`}>
            {message.texte}
          </div>
        )}

        <section className="profil-card profil-avatar-card">
          <button
            type="button"
            className="profil-avatar-wrap"
            onClick={() => fileRef.current?.click()}
            disabled={uploadAvatar}
            title="Cliquez pour changer votre photo"
          >
            {avatarApercu ? (
              <img src={avatarApercu} alt={form.nom || "Avatar client"} className="profil-avatar-image" />
            ) : (
              <span className="profil-avatar-fallback">{initiales || "U"}</span>
            )}
          </button>
          <div className="profil-avatar-content">
            <h2>Photo de profil</h2>
            <p>Ajoutez votre photo pour personnaliser votre espace client.</p>
            <div className="profil-avatar-actions">
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="profil-file-input"
                onChange={(event) => televerserAvatar(event.target.files?.[0])}
              />
              <button
                type="button"
                className="client-action client-action-primary"
                onClick={() => fileRef.current?.click()}
                disabled={uploadAvatar}
              >
                {uploadAvatar ? "Televersement..." : "Changer la photo"}
              </button>
            </div>
          </div>
        </section>

        <section className="profil-card">
          <h2>Informations personnelles</h2>
          <div className="profil-grid">
            <label>
              Nom complet
              <input
                className="auth-input"
                value={form.nom}
                onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                placeholder="Votre nom"
              />
            </label>
            <label>
              Email
              <input
                className="auth-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="votre@email.com"
              />
            </label>
            <label>
              Telephone
              <input
                className="auth-input"
                value={form.telephone}
                onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))}
                placeholder="514 123 4567"
              />
            </label>
            <label>
              Bio
              <textarea
                className="profil-textarea"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Parlez un peu de vous..."
                maxLength={280}
              />
            </label>
          </div>
        </section>

        <section className="profil-card">
          <h2>Adresse et livraison</h2>
          <div className="profil-grid">
            <label>
              Adresse
              <input
                className="auth-input"
                value={form.adresse}
                onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))}
                placeholder="Numero, rue"
              />
            </label>
            <label>
              Ville
              <input
                className="auth-input"
                value={form.ville}
                onChange={(e) => setForm((p) => ({ ...p, ville: e.target.value }))}
                placeholder="Montreal"
              />
            </label>
            <label>
              Province / Etat
              {provinceOptions.length > 0 ? (
                <select
                  className="auth-input"
                  value={form.province}
                  onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                >
                  <option value="">Selectionnez une province/un etat</option>
                  {provinceOptions.map((province) => (
                    <option key={province.code} value={province.label}>
                      {province.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="auth-input"
                  value={form.province}
                  onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                  placeholder="Province / Etat"
                />
              )}
              <span
                key={`province-helper-${form.pays}-${provinceObligatoire ? "required" : "optional"}`}
                className={`auth-helper ${
                  provinceObligatoire ? "auth-helper-required" : "auth-helper-optional"
                } field-helper-animated`}
              >
                <span className="field-helper-icon" aria-hidden="true">
                  {provinceObligatoire ? "!" : "✓"}
                </span>{" "}
                {provinceObligatoire ? "Obligatoire pour ce pays." : "Optionnel pour ce pays."}
              </span>
            </label>
            <label>
              Code postal
              <input
                className="auth-input"
                value={form.codePostal}
                onChange={(e) => setForm((p) => ({ ...p, codePostal: e.target.value }))}
                placeholder="H1H 1H1"
              />
            </label>
            <label>
              Pays
              <select
                className="auth-input"
                value={form.pays}
                onChange={(e) =>
                  setForm((p) => {
                    const nouveauPays = e.target.value;
                    const regions = getRegionOptions(nouveauPays);
                    const provinceToujoursValide =
                      regions.length === 0 || regions.some((region) => region.label === p.province);
                    return {
                      ...p,
                      pays: nouveauPays,
                      province: provinceToujoursValide ? p.province : "",
                    };
                  })
                }
              >
                <option value="">Selectionnez un pays</option>
                {paysOptions.map((pays) => (
                  <option key={pays.code} value={pays.code}>
                    {pays.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="profil-actions">
            <button
              type="button"
              className="client-action client-action-secondary"
              onClick={viderInfosLivraison}
              disabled={sauvegardeProfil}
            >
              Vider mes infos de livraison
            </button>
          </div>
        </section>

        <section className="profil-card">
          <h2>Preferences</h2>
          <div className="profil-grid">
            <label>
              Theme interface
              <select
                className="auth-input"
                value={form.themeInterface}
                onChange={(e) =>
                  setForm((p) => ({ ...p, themeInterface: e.target.value as "clair" | "sombre" | "systeme" }))
                }
              >
                <option value="clair">Clair</option>
                <option value="sombre">Sombre</option>
                <option value="systeme">Systeme</option>
              </select>
            </label>
            <label className="profil-check">
              <input
                type="checkbox"
                checked={form.newsletterActive}
                onChange={(e) => setForm((p) => ({ ...p, newsletterActive: e.target.checked }))}
              />
              <span>Recevoir la newsletter et les promos</span>
            </label>
            <label className="profil-check">
              <input
                type="checkbox"
                checked={form.notificationsEmailActives}
                onChange={(e) => setForm((p) => ({ ...p, notificationsEmailActives: e.target.checked }))}
              />
              <span>Notifications email sur mes commandes</span>
            </label>
          </div>
          <div className="profil-actions">
            <button
              type="button"
              className="client-action client-action-primary"
              onClick={enregistrerProfil}
              disabled={sauvegardeProfil}
            >
              {sauvegardeProfil ? "Enregistrement..." : "Enregistrer le profil"}
            </button>
          </div>
        </section>

        <section className="profil-card">
          <h2>Sécurité du compte</h2>
          <div className="profil-grid profil-grid-mots-de-passe">
            <AuthPasswordField
              label="Mot de passe actuel"
              value={motDePasseActuel}
              onChange={(e) => setMotDePasseActuel(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
            />
            <AuthPasswordField
              label="Nouveau mot de passe"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              autoComplete="new-password"
              maxLength={128}
            />
            <AuthPasswordField
              label="Confirmer le mot de passe"
              value={confirmationMotDePasse}
              onChange={(e) => setConfirmationMotDePasse(e.target.value)}
              autoComplete="new-password"
              maxLength={128}
            />
          </div>
          <div className="profil-actions">
            <button
              type="button"
              className="client-action client-action-secondary"
              onClick={changerMotDePasse}
              disabled={sauvegardeMotDePasse}
            >
              {sauvegardeMotDePasse ? "Mise a jour..." : "Mettre a jour le mot de passe"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
