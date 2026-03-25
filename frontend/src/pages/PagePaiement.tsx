import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, API_ORIGIN } from "../api";
import { useAuth } from "../AuthContext";
import { getRegionOptions, resolveCountryCode } from "../locationData";
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

function adresseDepuisProfil(utilisateur: any): Partial<AdresseLivraison> {
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

function expirationValide(mmAa: string) {
  const match = mmAa.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const mois = Number(match[1]);
  const annee2 = Number(match[2]);
  if (mois < 1 || mois > 12) return false;

  const annee = 2000 + annee2;
  const maintenant = new Date();
  const moisActuel = maintenant.getMonth() + 1;
  const anneeActuelle = maintenant.getFullYear();

  if (annee < anneeActuelle) return false;
  if (annee === anneeActuelle && mois < moisActuel) return false;
  return true;
}

export function PagePaiement() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
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
    setMessage("Adresse de livraison synchronisee depuis votre profil.");
    setErreur(null);
  }

  useEffect(() => {
    async function chargerPanier() {
      setLoading(true);
      setErreur(null);
      try {
        const res = await api.get<Panier>("/panier");
        setPanier(res.data);
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Impossible de charger le panier";
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
      setErreur("Votre panier est vide.");
      return;
    }

    const champsAdresse: Array<keyof AdresseLivraison> = [
      "nomComplet",
      "rue",
      "ville",
      "codePostal",
      "pays",
    ];
    for (const champ of champsAdresse) {
      if (!adresse[champ].trim()) {
        setErreur("Adresse de livraison incomplète. Revenez au panier pour la compléter.");
        return;
      }
    }
    const paysAvecRegions = getRegionOptions(adresse.pays).length > 0;
    if (paysAvecRegions && !adresse.province.trim()) {
      setErreur("Province/etat manquant pour ce pays.");
      return;
    }

    const numeroNettoye = numeroCarte.replace(/\s+/g, "");
    if (nomCarte.trim().length < 3) {
      setErreur("Nom du titulaire invalide.");
      return;
    }
    if (!/^\d{16}$/.test(numeroNettoye)) {
      setErreur("Numéro de carte invalide (16 chiffres requis).");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiration)) {
      setErreur("Date d'expiration invalide (format MM/AA).");
      return;
    }
    if (!expirationValide(expiration)) {
      setErreur("Carte expirée ou date invalide.");
      return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setErreur("CVV invalide.");
      return;
    }

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
        },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors du paiement/commande";
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
              Deconnexion
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

        {erreur && <div className="panier-alert panier-alert-error">{erreur}</div>}
        {message && <div className="panier-alert panier-alert-success">{message}</div>}

        {loading ? (
          <p className="panier-state">Chargement du checkout...</p>
        ) : (
          <section className="checkout-grid">
            <div className="checkout-card">
              <h2 className="checkout-title">Paiement par carte</h2>
              <label className="checkout-label">
                Titulaire de la carte
                <input
                  className="checkout-input"
                  value={nomCarte}
                  onChange={(e) => setNomCarte(e.target.value)}
                  placeholder="Nom complet"
                />
              </label>
              <label className="checkout-label">
                Numéro de carte
                <input
                  className="checkout-input"
                  value={numeroCarte}
                  onChange={(e) => setNumeroCarte(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                />
              </label>
              <div className="checkout-inline">
                <label className="checkout-label">
                  Expiration
                  <input
                    className="checkout-input"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    placeholder="MM/AA"
                    maxLength={5}
                  />
                </label>
                <label className="checkout-label">
                  CVV
                  <input
                    className="checkout-input"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                  />
                </label>
              </div>
              <label className="checkout-label">
                Code promo (optionnel)
                <input
                  className="checkout-input"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Ex: WELCOME10"
                  maxLength={20}
                />
              </label>
              {couponNormalise && (
                <p className="checkout-hint">
                  {couponActif
                    ? `Code applique: ${couponNormalise} (${couponActif.type === "percent" ? `${couponActif.value}%` : `${couponActif.value.toFixed(2)} $`})`
                    : "Ce code semble invalide et sera refuse au paiement."}
                </p>
              )}
              <div className="checkout-actions">
                <button
                  type="button"
                  className="panier-btn panier-btn-ghost"
                  onClick={remplirAdresseDepuisProfil}
                >
                  Utiliser mes infos profil
                </button>
              </div>

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
                  {processing ? "Traitement..." : "Payer et commander"}
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

