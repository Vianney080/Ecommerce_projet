import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, API_ORIGIN } from "../api";
import { useAuth } from "../AuthContext";
import { getCountryOptions, getRegionOptions, resolveCountryCode } from "../locationData";
import {
  filtrerNomPropre,
  filtrerVille,
  validerFormulaireAdresse,
  validerTitulaireCarte,
  validerNumeroCarte,
  validerExpiration,
  validerCvv,
  type ChampsAdresseErreurs,
  type ErreursPaiementCarte,
} from "../utils/checkoutValidation";
import { TrustCheckoutStrip } from "../components/TrustCheckoutStrip";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

interface ItemPanier {
  produitId: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
}

interface Panier {
  items: ItemPanier[];
  total: number;
}

type AdresseLivraison = {
  nomComplet: string;
  rue: string;
  ville: string;
  province: string;
  codePostal: string;
  pays: string;
  telephone: string;
};

type CommandeCreee = {
  _id: string;
  items: ItemPanier[];
  total: number;
  numeroFacture?: string;
  statutPaiement?: "en_attente" | "paye" | "echoue" | "rembourse" | string;
  adresseLivraison?: AdresseLivraison;
  createdAt?: string;
};

const ADRESSE_PAR_DEFAUT: AdresseLivraison = {
  nomComplet: "",
  rue: "",
  ville: "",
  province: "",
  codePostal: "",
  pays: "CA",
  telephone: "",
};
const TAUX_TAXE = 0.15;
const cleAdresseLivraison = (utilisateurId?: string) => `adresse_livraison:${utilisateurId || "invite"}`;
const COUPONS: Record<string, { type: "percent" | "fixed"; value: number }> = {
  WELCOME10: { type: "percent", value: 10 },
  BEAUTY15: { type: "percent", value: 15 },
  SAVE5: { type: "fixed", value: 5 },
};

function adresseDepuisProfil(utilisateur: {
  nom?: string;
  adresse?: string;
  ville?: string;
  province?: string;
  codePostal?: string;
  pays?: string;
  telephone?: string;
} | null): Partial<AdresseLivraison> {
  if (!utilisateur) return {};
  return {
    nomComplet: String(utilisateur.nom || "").trim(),
    rue: String(utilisateur.adresse || "").trim(),
    ville: String(utilisateur.ville || "").trim(),
    province: String(utilisateur.province || "").trim(),
    codePostal: String(utilisateur.codePostal || "").trim(),
    pays: resolveCountryCode(utilisateur.pays || "CA") || "CA",
    telephone: String(utilisateur.telephone || "").trim(),
  };
}

export function PagePaiement() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle("Paiement");
  useMetaDescription(
    "Finalisez votre commande CosmétiShop : adresse de livraison, carte et validation sécurisée."
  );
  const [panier, setPanier] = useState<Panier | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [nomCarte, setNomCarte] = useState("");
  const [numeroCarte, setNumeroCarte] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [adresse, setAdresse] = useState<AdresseLivraison>(ADRESSE_PAR_DEFAUT);
  const [erreursAdresse, setErreursAdresse] = useState<ChampsAdresseErreurs>({});
  const [erreursCarte, setErreursCarte] = useState<ErreursPaiementCarte>({});

  const initialesUtilisateur = useMemo(() => {
    if (!utilisateur?.nom) return "U";
    const parts = utilisateur.nom.trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  }, [utilisateur]);
  const avatarUtilisateur = utilisateur?.avatarUrl
    ? utilisateur.avatarUrl.startsWith("http://") || utilisateur.avatarUrl.startsWith("https://")
      ? utilisateur.avatarUrl
      : utilisateur.avatarUrl.startsWith("/")
        ? `${API_ORIGIN}${utilisateur.avatarUrl}`
        : `${API_ORIGIN}/${utilisateur.avatarUrl}`
    : "";
  const profilAdressePrefill = useMemo(() => adresseDepuisProfil(utilisateur), [utilisateur]);
  const paysOptions = useMemo(() => getCountryOptions("fr-CA"), []);
  const provinceOptions = useMemo(() => getRegionOptions(adresse.pays), [adresse.pays]);
  const provinceObligatoire = provinceOptions.length > 0;

  const sousTotal = panier?.total || 0;
  const couponNormalise = couponCode.trim().toUpperCase();
  const couponActif = COUPONS[couponNormalise];
  const remise = couponActif
    ? couponActif.type === "percent"
      ? (sousTotal * couponActif.value) / 100
      : couponActif.value
    : 0;
  const remiseValide = Math.min(remise, sousTotal);
  const montantApresRemise = Math.max(0, sousTotal - remiseValide);
  const taxe = montantApresRemise * TAUX_TAXE;
  const totalPayer = montantApresRemise + taxe;

  useEffect(() => {
    const profil = profilAdressePrefill;
    try {
      const brut = localStorage.getItem(cleAdresseLivraison(utilisateur?.id));
      if (brut) {
        const locale = JSON.parse(brut);
        setAdresse({
          ...ADRESSE_PAR_DEFAUT,
          ...profil,
          ...locale,
          nomComplet: locale.nomComplet || profil.nomComplet || "",
          rue: locale.rue || profil.rue || "",
          ville: locale.ville || profil.ville || "",
          province: locale.province || profil.province || "",
          codePostal: locale.codePostal || profil.codePostal || "",
          pays: resolveCountryCode(locale.pays || profil.pays || "CA") || "CA",
          telephone: locale.telephone || profil.telephone || "",
        });
        return;
      }
      setAdresse({
        ...ADRESSE_PAR_DEFAUT,
        ...profil,
      });
    } catch {
      setAdresse({
        ...ADRESSE_PAR_DEFAUT,
        ...profil,
      });
    }
  }, [profilAdressePrefill, utilisateur?.id]);

  function remplirAdresseDepuisProfil() {
    setErreursAdresse({});
    setAdresse((precedente) => ({
      ...precedente,
      nomComplet: profilAdressePrefill.nomComplet || precedente.nomComplet,
      rue: profilAdressePrefill.rue || precedente.rue,
      ville: profilAdressePrefill.ville || precedente.ville,
      codePostal: profilAdressePrefill.codePostal || precedente.codePostal,
      province: profilAdressePrefill.province || precedente.province,
      pays: profilAdressePrefill.pays || precedente.pays || "CA",
      telephone: profilAdressePrefill.telephone || precedente.telephone,
    }));
    setMessage("Adresse de livraison synchronisée depuis votre profil.");
    setErreur(null);
  }

  useEffect(() => {
    async function chargerPanier() {
      setLoading(true);
      setErreur(null);
      try {
        const res = await api.get<Panier>("/panier");
        setPanier(res.data);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Impossible de charger le panier";
        setErreur(msg);
      } finally {
        setLoading(false);
      }
    }

    void chargerPanier();
  }, []);

  async function payerEtCommander() {
    setErreur(null);
    setMessage(null);

    if (!panier?.items?.length) {
      setErreur("Votre panier est vide. Retournez au catalogue pour ajouter des articles.");
      return;
    }

    const errsA = validerFormulaireAdresse(adresse, provinceObligatoire);
    const errsC: ErreursPaiementCarte = {};
    const nomErr = validerTitulaireCarte(nomCarte);
    if (nomErr) errsC.nomCarte = nomErr;
    const numeroNettoye = numeroCarte.replace(/\D/g, "");
    const numErr = validerNumeroCarte(numeroNettoye);
    if (numErr) errsC.numeroCarte = numErr;
    const expErr = validerExpiration(expiration.trim());
    if (expErr) errsC.expiration = expErr;
    const cvvErr = validerCvv(cvv.trim());
    if (cvvErr) errsC.cvv = cvvErr;

    if (Object.keys(errsA).length > 0 || Object.keys(errsC).length > 0) {
      setErreursAdresse(errsA);
      setErreursCarte(errsC);
      return;
    }

    setErreursAdresse({});
    setErreursCarte({});

    try {
      setProcessing(true);
      localStorage.setItem(cleAdresseLivraison(utilisateur?.id), JSON.stringify(adresse));
      const res = await api.post<{ message?: string; commande: CommandeCreee }>("/panier/commander", {
        adresseLivraison: adresse,
        couponCode: couponNormalise || undefined,
      });
      setMessage(res.data?.message || "Paiement validé et commande créée.");
      navigate("/commande/succes", {
        state: {
          commande: res.data.commande,
          emailConfirmation: utilisateur?.email?.trim() || "",
        },
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Le paiement n’a pas pu être finalisé. Vérifiez vos informations ou réessayez plus tard.";
      setErreur(msg);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="panier-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <div className="nav-logo">
              <span className="nav-logo-icon">💄</span>
              <div className="nav-logo-text">
                <span className="nav-logo-title">CosmétiShop</span>
                <span className="nav-logo-subtitle">Boutique de produits cosmétiques</span>
              </div>
            </div>
          </div>
          <div className="nav-center">
            <Link to="/" className="nav-link">
              Accueil
            </Link>
            <Link to="/catalogue" className="nav-link">
              Catalogue
            </Link>
            <Link to="/panier" className="nav-link">
              Panier
            </Link>
            <Link to="/commandes" className="nav-link">
              Commandes
            </Link>
          </div>
          <div className="nav-right">
            <Link to="/profil" className="nav-user-pill nav-user-pill-link" title={utilisateur?.email}>
              <span className="nav-user-avatar">
                {avatarUtilisateur ? (
                  <img
                    src={avatarUtilisateur}
                    alt={utilisateur?.nom || "Client"}
                    className="nav-user-avatar-image"
                  />
                ) : (
                  initialesUtilisateur
                )}
              </span>
              <span className="nav-user-meta">
                <span className="nav-user-name">{utilisateur?.nom || "Client"}</span>
                <span className="nav-user-role">{utilisateur?.role || "client"}</span>
              </span>
            </Link>
            <button type="button" className="nav-auth-btn nav-auth-btn-logout" onClick={deconnexion}>
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <main className="panier-shell">
        <section className="panier-hero">
          <div>
            <p className="panier-kicker">Checkout sécurisé</p>
            <h1 className="panier-title">Paiement</h1>
            <p className="panier-subtitle">
              Validez votre paiement pour confirmer définitivement votre commande.
            </p>
          </div>
          <div className="panier-summary-card">
            <p className="panier-summary-label">Montant à payer</p>
            <p className="panier-summary-total">{totalPayer.toFixed(2)} $</p>
            <p className="panier-summary-meta">Sous-total: {sousTotal.toFixed(2)} $</p>
            <p className="panier-summary-meta">Taxe (15%): {taxe.toFixed(2)} $</p>
            <p className="panier-summary-meta">{panier?.items?.length || 0} article(s)</p>
          </div>
        </section>

        <TrustCheckoutStrip />

        {erreur && <div className="panier-alert panier-alert-error">{erreur}</div>}
        {message && <div className="panier-alert panier-alert-success">{message}</div>}

        {loading ? (
          <p className="panier-state panier-state--pulse" role="status">
            Chargement du paiement…
          </p>
        ) : (
          <section className="checkout-grid">
            <div className="checkout-card checkout-card-form">
              <h2 className="checkout-title">Adresse de livraison</h2>
              <p className="checkout-section-intro">
                Vérifiez ou complétez l’adresse utilisée pour cette commande. Les champs marqués d’une astérisque (
                <span className="panier-required-star" aria-hidden>
                  *
                </span>
                ) sont obligatoires.
              </p>
              <div className="checkout-actions" style={{ marginBottom: "0.65rem" }}>
                <button
                  type="button"
                  className="panier-btn panier-btn-ghost"
                  onClick={remplirAdresseDepuisProfil}
                >
                  Utiliser mes infos profil
                </button>
              </div>
              <div className="panier-adresse-grid">
                <label>
                  <span className="panier-label-heading">
                    Nom complet (prénom et nom)
                    <abbr className="panier-required-star" title="Champ obligatoire">
                      *
                    </abbr>
                  </span>
                  <input
                    className={`panier-adresse-input${erreursAdresse.nomComplet ? " is-invalid" : ""}`}
                    value={adresse.nomComplet}
                    onChange={(e) => {
                      setErreursAdresse((er) => ({ ...er, nomComplet: undefined }));
                      setAdresse((prev) => ({ ...prev, nomComplet: filtrerNomPropre(e.target.value) }));
                    }}
                    autoComplete="name"
                    aria-invalid={Boolean(erreursAdresse.nomComplet)}
                  />
                  {erreursAdresse.nomComplet ? (
                    <span className="panier-field-error" role="alert">
                      {erreursAdresse.nomComplet}
                    </span>
                  ) : (
                    <span className="panier-field-hint">Lettres et tirets uniquement (ex. Jean-Philippe Gagnon).</span>
                  )}
                </label>
                <label>
                  <span className="panier-label-heading">Téléphone (optionnel)</span>
                  <input
                    type="tel"
                    className={`panier-adresse-input${erreursAdresse.telephone ? " is-invalid" : ""}`}
                    value={adresse.telephone}
                    onChange={(e) => {
                      setErreursAdresse((er) => ({ ...er, telephone: undefined }));
                      setAdresse((prev) => ({ ...prev, telephone: e.target.value }));
                    }}
                    autoComplete="tel"
                  />
                  {erreursAdresse.telephone ? (
                    <span className="panier-field-error" role="alert">
                      {erreursAdresse.telephone}
                    </span>
                  ) : null}
                </label>
                <label className="panier-adresse-col-full">
                  <span className="panier-label-heading">
                    Rue et numéro
                    <abbr className="panier-required-star" title="Champ obligatoire">
                      *
                    </abbr>
                  </span>
                  <input
                    className={`panier-adresse-input${erreursAdresse.rue ? " is-invalid" : ""}`}
                    value={adresse.rue}
                    onChange={(e) => {
                      setErreursAdresse((er) => ({ ...er, rue: undefined }));
                      setAdresse((prev) => ({ ...prev, rue: e.target.value }));
                    }}
                    autoComplete="street-address"
                  />
                  {erreursAdresse.rue ? (
                    <span className="panier-field-error" role="alert">
                      {erreursAdresse.rue}
                    </span>
                  ) : null}
                </label>
                <label>
                  <span className="panier-label-heading">
                    Ville
                    <abbr className="panier-required-star" title="Champ obligatoire">
                      *
                    </abbr>
                  </span>
                  <input
                    className={`panier-adresse-input${erreursAdresse.ville ? " is-invalid" : ""}`}
                    value={adresse.ville}
                    onChange={(e) => {
                      setErreursAdresse((er) => ({ ...er, ville: undefined }));
                      setAdresse((prev) => ({ ...prev, ville: filtrerVille(e.target.value) }));
                    }}
                    autoComplete="address-level2"
                  />
                  {erreursAdresse.ville ? (
                    <span className="panier-field-error" role="alert">
                      {erreursAdresse.ville}
                    </span>
                  ) : (
                    <span className="panier-field-hint">Sans chiffres.</span>
                  )}
                </label>
                <label>
                  <span className="panier-label-heading">
                    Province / État
                    {provinceObligatoire ? (
                      <abbr className="panier-required-star" title="Champ obligatoire">
                        *
                      </abbr>
                    ) : null}
                  </span>
                  {provinceOptions.length > 0 ? (
                    <select
                      className={`panier-adresse-input${erreursAdresse.province ? " is-invalid" : ""}`}
                      value={adresse.province}
                      onChange={(e) => {
                        setErreursAdresse((er) => ({ ...er, province: undefined }));
                        setAdresse((prev) => ({ ...prev, province: e.target.value }));
                      }}
                    >
                      <option value="">Sélectionnez une province ou un État</option>
                      {provinceOptions.map((province) => (
                        <option key={province.code} value={province.label}>
                          {province.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={`panier-adresse-input${erreursAdresse.province ? " is-invalid" : ""}`}
                      value={adresse.province}
                      onChange={(e) => {
                        setErreursAdresse((er) => ({ ...er, province: undefined }));
                        setAdresse((prev) => ({ ...prev, province: e.target.value }));
                      }}
                    />
                  )}
                  {erreursAdresse.province ? (
                    <span className="panier-field-error" role="alert">
                      {erreursAdresse.province}
                    </span>
                  ) : null}
                </label>
                <label>
                  <span className="panier-label-heading">
                    Code postal
                    <abbr className="panier-required-star" title="Champ obligatoire">
                      *
                    </abbr>
                  </span>
                  <input
                    className={`panier-adresse-input${erreursAdresse.codePostal ? " is-invalid" : ""}`}
                    value={adresse.codePostal}
                    onChange={(e) => {
                      setErreursAdresse((er) => ({ ...er, codePostal: undefined }));
                      setAdresse((prev) => ({ ...prev, codePostal: e.target.value }));
                    }}
                    autoComplete="postal-code"
                  />
                  {erreursAdresse.codePostal ? (
                    <span className="panier-field-error" role="alert">
                      {erreursAdresse.codePostal}
                    </span>
                  ) : adresse.pays === "CA" ? (
                    <span className="panier-field-hint">Format Canada : A1A 1A1.</span>
                  ) : null}
                </label>
                <label>
                  <span className="panier-label-heading">
                    Pays
                    <abbr className="panier-required-star" title="Champ obligatoire">
                      *
                    </abbr>
                  </span>
                  <select
                    className={`panier-adresse-input${erreursAdresse.pays ? " is-invalid" : ""}`}
                    value={adresse.pays}
                    onChange={(e) => {
                      setErreursAdresse((er) => ({ ...er, pays: undefined, province: undefined }));
                      setAdresse((prev) => {
                        const nouveauPays = e.target.value;
                        const regions = getRegionOptions(nouveauPays);
                        const provinceValide =
                          regions.length === 0 ||
                          regions.some((region) => region.label === prev.province);
                        return {
                          ...prev,
                          pays: nouveauPays,
                          province: provinceValide ? prev.province : "",
                        };
                      });
                    }}
                    autoComplete="country"
                  >
                    <option value="">Sélectionnez un pays</option>
                    {paysOptions.map((pays) => (
                      <option key={pays.code} value={pays.code}>
                        {pays.label}
                      </option>
                    ))}
                  </select>
                  {erreursAdresse.pays ? (
                    <span className="panier-field-error" role="alert">
                      {erreursAdresse.pays}
                    </span>
                  ) : null}
                </label>
              </div>

              <hr className="checkout-section-divider" />

              <h2 className="checkout-title">Paiement par carte</h2>
              <p className="checkout-section-intro">Démonstration : saisissez 16 chiffres, une date future MM/AA et le CVV.</p>

              <label className="checkout-label">
                <span className="panier-label-heading">
                  Titulaire de la carte
                  <abbr className="panier-required-star" title="Champ obligatoire">
                    *
                  </abbr>
                </span>
                <input
                  className={`checkout-input${erreursCarte.nomCarte ? " is-invalid" : ""}`}
                  value={nomCarte}
                  onChange={(e) => {
                    setErreursCarte((er) => ({ ...er, nomCarte: undefined }));
                    setNomCarte(filtrerNomPropre(e.target.value));
                  }}
                  placeholder="Prénom Nom (comme sur la carte)"
                  autoComplete="cc-name"
                  aria-invalid={Boolean(erreursCarte.nomCarte)}
                />
                {erreursCarte.nomCarte ? (
                  <span className="panier-field-error" role="alert">
                    {erreursCarte.nomCarte}
                  </span>
                ) : (
                  <span className="panier-field-hint">Même règles que le nom de livraison : lettres, espaces, tirets.</span>
                )}
              </label>
              <label className="checkout-label">
                <span className="panier-label-heading">
                  Numéro de carte
                  <abbr className="panier-required-star" title="Champ obligatoire">
                    *
                  </abbr>
                </span>
                <input
                  className={`checkout-input${erreursCarte.numeroCarte ? " is-invalid" : ""}`}
                  value={numeroCarte}
                  inputMode="numeric"
                  onChange={(e) => {
                    setErreursCarte((er) => ({ ...er, numeroCarte: undefined }));
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
                    setNumeroCarte(formatted);
                  }}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  autoComplete="cc-number"
                  aria-invalid={Boolean(erreursCarte.numeroCarte)}
                />
                {erreursCarte.numeroCarte ? (
                  <span className="panier-field-error" role="alert">
                    {erreursCarte.numeroCarte}
                  </span>
                ) : null}
              </label>
              <div className="checkout-inline">
                <label className="checkout-label">
                  <span className="panier-label-heading">
                    Expiration
                    <abbr className="panier-required-star" title="Champ obligatoire">
                      *
                    </abbr>
                  </span>
                  <input
                    className={`checkout-input${erreursCarte.expiration ? " is-invalid" : ""}`}
                    value={expiration}
                    inputMode="numeric"
                    onChange={(e) => {
                      setErreursCarte((er) => ({ ...er, expiration: undefined }));
                      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                      const avecSlash = d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
                      setExpiration(avecSlash);
                    }}
                    placeholder="MM/AA"
                    maxLength={5}
                    autoComplete="cc-exp"
                    aria-invalid={Boolean(erreursCarte.expiration)}
                  />
                  {erreursCarte.expiration ? (
                    <span className="panier-field-error" role="alert">
                      {erreursCarte.expiration}
                    </span>
                  ) : null}
                </label>
                <label className="checkout-label">
                  <span className="panier-label-heading">
                    CVV
                    <abbr className="panier-required-star" title="Champ obligatoire">
                      *
                    </abbr>
                  </span>
                  <input
                    className={`checkout-input${erreursCarte.cvv ? " is-invalid" : ""}`}
                    value={cvv}
                    inputMode="numeric"
                    onChange={(e) => {
                      setErreursCarte((er) => ({ ...er, cvv: undefined }));
                      setCvv(e.target.value.replace(/\D/g, "").slice(0, 4));
                    }}
                    placeholder="123"
                    maxLength={4}
                    autoComplete="cc-csc"
                    aria-invalid={Boolean(erreursCarte.cvv)}
                  />
                  {erreursCarte.cvv ? (
                    <span className="panier-field-error" role="alert">
                      {erreursCarte.cvv}
                    </span>
                  ) : null}
                </label>
              </div>
              <label className="checkout-label">
                <span className="panier-label-heading">Code promo (optionnel)</span>
                <input
                  className="checkout-input"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Ex : WELCOME10"
                  maxLength={20}
                />
              </label>
              {couponNormalise && (
                <p className="checkout-hint">
                  {couponActif
                    ? `Code appliqué : ${couponNormalise} (${couponActif.type === "percent" ? `${couponActif.value}%` : `${couponActif.value.toFixed(2)} $`})`
                    : "Ce code semble invalide et sera refusé au paiement."}
                </p>
              )}

              <div className="checkout-actions">
                <Link to="/panier" className="panier-btn panier-btn-ghost">
                  Retour au panier
                </Link>
                <button
                  type="button"
                  className="panier-btn panier-btn-primary"
                  onClick={payerEtCommander}
                  disabled={processing}
                >
                  {processing ? "Traitement…" : "Payer et commander"}
                </button>
              </div>
            </div>

            <div className="checkout-card">
              <h2 className="checkout-title">Résumé</h2>
              <ul className="checkout-items">
                {(panier?.items || []).map((it) => (
                  <li key={it.produitId}>
                    <span>{it.nomProduit}</span>
                    <span>
                      {it.quantite} x {it.prixUnitaire.toFixed(2)} $
                    </span>
                  </li>
                ))}
              </ul>
              <div className="checkout-total">
                <span>Sous-total</span>
                <span>{sousTotal.toFixed(2)} $</span>
              </div>
              <div className="checkout-total">
                <span>Reduction</span>
                <span>- {remiseValide.toFixed(2)} $</span>
              </div>
              <div className="checkout-total">
                <span>Taxe (15%)</span>
                <span>{taxe.toFixed(2)} $</span>
              </div>
              <div className="checkout-total">
                <span>Total</span>
                <span>{totalPayer.toFixed(2)} $</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

