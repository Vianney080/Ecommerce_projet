import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, resolveAssetUrl } from "../api";
import { useAuth } from "../AuthContext";
import {
  CLE_TRANSFERT_PANIER_INVITE,
  lirePanierInvite,
  modifierQuantitePanierInvite,
  supprimerDuPanierInvite,
  type ItemPanierInvite,
  viderPanierInvite,
} from "../cartInvite";
import { getCountryOptions, getRegionOptions, resolveCountryCode } from "../locationData";
import {
  filtrerNomPropre,
  filtrerVille,
  validerFormulaireAdresse,
  type ChampsAdresseErreurs,
} from "../utils/checkoutValidation";
import { Breadcrumb } from "../components/Breadcrumb";
import { ClientNav } from "../components/ClientNav";
import { TrustCheckoutStrip } from "../components/TrustCheckoutStrip";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import { notifierChangementPanier } from "../panierEvents";
import "../styles.css";

interface ItemPanier {
  produitId: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
  /** Renseigné par l’API (compte) ou le panier invité */
  imageUrl?: string;
}

interface Panier {
  _id: string;
  items: ItemPanier[];
  total: number;
  statut: string;
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

const ADRESSE_PAR_DEFAUT: AdresseLivraison = {
  nomComplet: "",
  rue: "",
  ville: "",
  province: "",
  codePostal: "",
  pays: "CA",
  telephone: ""
};
const TAUX_TAXE = 0.15;
const cleAdresseLivraison = (utilisateurId?: string) => `adresse_livraison:${utilisateurId || "invite"}`;

const FRONTEND_IMAGE_BY_NAME: Record<string, string> = {
  "rouge a levres velours":
    "https://images.pexels.com/photos/3373742/pexels-photo-3373742.jpeg?auto=compress&cs=tinysrgb&w=640",
  "serum eclat vitamine c":
    "https://glowrabeautysupply.com/modules/bonbanner/views/img/6dc7ab513632596df446f62170082b04d69516c6_FB4.jpg",
  "creme hydratante jour":
    "https://images.pexels.com/photos/3738341/pexels-photo-3738341.jpeg?auto=compress&cs=tinysrgb&w=640",
  "palette yeux nude":
    "https://images.pexels.com/photos/3373712/pexels-photo-3373712.jpeg?auto=compress&cs=tinysrgb&w=640",
  "parfum fleur de coton":
    "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=640",
  "huile capillaire nourrissante":
    "https://images.pexels.com/photos/3738344/pexels-photo-3738344.jpeg?auto=compress&cs=tinysrgb&w=640",
  "fond de teint longue tenue":
    "https://images.pexels.com/photos/3738115/pexels-photo-3738115.jpeg?auto=compress&cs=tinysrgb&w=640",
  "masque hydratant intense":
    "https://images.pexels.com/photos/3738355/pexels-photo-3738355.jpeg?auto=compress&cs=tinysrgb&w=640",
  "gel nettoyant doux":
    "https://images.pexels.com/photos/3738460/pexels-photo-3738460.jpeg?auto=compress&cs=tinysrgb&w=640",
  "brume parfumee florale":
    "https://images.pexels.com/photos/965984/pexels-photo-965984.jpeg?auto=compress&cs=tinysrgb&w=640",
  "eau de parfum raffinee":
    "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=640",
  "shampooing reparateur":
    "https://images.pexels.com/photos/3738348/pexels-photo-3738348.jpeg?auto=compress&cs=tinysrgb&w=640",
  "apres-shampooing lissant":
    "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=640",
  "huile seche pailletee":
    "https://images.pexels.com/photos/3738374/pexels-photo-3738374.jpeg?auto=compress&cs=tinysrgb&w=640",
  "lait corps nourrissant":
    "https://images.pexels.com/photos/3738382/pexels-photo-3738382.jpeg?auto=compress&cs=tinysrgb&w=640",
  "creme mains reparatrice":
    "https://images.pexels.com/photos/3738390/pexels-photo-3738390.jpeg?auto=compress&cs=tinysrgb&w=640",
  "gommage corps douceur":
    "https://images.pexels.com/photos/3738346/pexels-photo-3738346.jpeg?auto=compress&cs=tinysrgb&w=640",
  "kit decouverte miniatures":
    "https://images.pexels.com/photos/3738386/pexels-photo-3738386.jpeg?auto=compress&cs=tinysrgb&w=640",
  "coffret cadeau spa maison":
    "https://images.pexels.com/photos/3738373/pexels-photo-3738373.jpeg?auto=compress&cs=tinysrgb&w=640",
};

function normaliserNomProduit(nom: string) {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function extraireAdresseDepuisProfil(utilisateur: { nom?: string; adresse?: string; ville?: string; province?: string; codePostal?: string; pays?: string; telephone?: string } | null): Partial<AdresseLivraison> {
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

export function PagePanier() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle("Panier");
  useMetaDescription("Votre panier CosmétiShop : articles, adresse de livraison et passage en caisse.");
  const [panier, setPanier] = useState<Panier | null>(null);
  const [panierInvite, setPanierInvite] = useState<ItemPanierInvite[]>([]);
  const [imagesProduits, setImagesProduits] = useState<Record<string, string>>({});
  const [imagesProduitsParNom, setImagesProduitsParNom] = useState<Record<string, string>>({});
  const [stocksProduits, setStocksProduits] = useState<Record<string, number>>({});
  const [prixProduits, setPrixProduits] = useState<Record<string, number>>({});
  const [prixProduitsParNom, setPrixProduitsParNom] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adresse, setAdresse] = useState<AdresseLivraison>(ADRESSE_PAR_DEFAUT);
  const [erreursAdresse, setErreursAdresse] = useState<ChampsAdresseErreurs>({});

  useEffect(() => {
    if (!utilisateur) return;
    const profil = extraireAdresseDepuisProfil(utilisateur);
    let sauvegardeLocale: Partial<AdresseLivraison> = {};
    try {
      const brut = localStorage.getItem(cleAdresseLivraison(utilisateur.id));
      if (brut) sauvegardeLocale = JSON.parse(brut);
    } catch {
      sauvegardeLocale = {};
    }

    // Priorite aux infos deja en local (si presentes), sinon profil.
    setAdresse({
      ...ADRESSE_PAR_DEFAUT,
      ...profil,
      ...sauvegardeLocale,
      nomComplet: sauvegardeLocale.nomComplet || profil.nomComplet || "",
      rue: sauvegardeLocale.rue || profil.rue || "",
      ville: sauvegardeLocale.ville || profil.ville || "",
      codePostal: sauvegardeLocale.codePostal || profil.codePostal || "",
      pays: resolveCountryCode(String(sauvegardeLocale.pays || profil.pays || "CA")) || "CA",
      telephone: sauvegardeLocale.telephone || profil.telephone || "",
    });
  }, [utilisateur]);

  async function chargerPanier() {
    setLoading(true);
    setErreur(null);
    if (!utilisateur) {
      setPanierInvite(lirePanierInvite());
      setPanier(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<Panier>("/panier");
      setPanier(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors du chargement du panier";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chargerPanier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateur]);

  useEffect(() => {
    async function chargerImagesBackend() {
      const itemsSource = utilisateur ? (panier?.items || []) : panierInvite;
      const mapLocalInvite: Record<string, string> = {};
      const mapLocalInviteParNom: Record<string, string> = {};
      if (!utilisateur) {
        for (const it of panierInvite) {
          const url = resolveAssetUrl(it.imageUrl);
          if (url) {
            mapLocalInvite[it.produitId] = url;
            mapLocalInviteParNom[normaliserNomProduit(it.nomProduit)] = url;
          }
        }
      }

      let tousProduits: Array<{
        _id: string;
        nom: string;
        imageUrl?: string;
        imageUrls?: string[];
        prixUnitaire: number;
        quantite: number;
      }> = [];
      try {
        const res = await api.get<
          Array<{
          _id: string;
          nom: string;
          imageUrl?: string;
          imageUrls?: string[];
          prixUnitaire: number;
          quantite: number;
        }>
        >("/produits");
        tousProduits = res.data;
      } catch {
        tousProduits = [];
      }

      const mapId: Record<string, string> = {};
      const mapNom: Record<string, string> = {};
      const mapStock: Record<string, number> = {};
      const mapPrix: Record<string, number> = {};
      const mapPrixNom: Record<string, number> = {};
      for (const p of tousProduits) {
        const url = resolveAssetUrl(p.imageUrls?.[0] || p.imageUrl);
        const nomNormalise = normaliserNomProduit(p.nom);
        if (url) {
          mapId[p._id] = url;
          mapNom[nomNormalise] = url;
        }
        mapStock[p._id] = Number(p.quantite) || 0;
        mapPrix[p._id] = Number(p.prixUnitaire) || 0;
        mapPrixNom[nomNormalise] = Number(p.prixUnitaire) || 0;
      }

      const suivant: Record<string, string> = {};
      for (const it of itemsSource) {
        const fallbackNom = normaliserNomProduit(it.nomProduit);
        const url =
          mapLocalInvite[it.produitId] ||
          mapId[it.produitId] ||
          mapLocalInviteParNom[fallbackNom] ||
          mapNom[fallbackNom] ||
          FRONTEND_IMAGE_BY_NAME[fallbackNom] ||
          "";
        if (url) suivant[it.produitId] = url;
      }
      setImagesProduitsParNom(mapNom);
      setImagesProduits(suivant);
      setStocksProduits(mapStock);
      setPrixProduits(mapPrix);
      setPrixProduitsParNom(mapPrixNom);
    }

    void chargerImagesBackend();
  }, [utilisateur, panier, panierInvite]);

  async function modifierQuantite(produitId: string, quantite: number) {
    if (quantite < 1) return;
    if (!utilisateur) {
      const stockMax = stocksProduits[produitId];
      const ok = modifierQuantitePanierInvite(
        produitId,
        quantite,
        Number.isFinite(stockMax) ? stockMax : undefined
      );
      if (!ok) {
        setErreur("Stock insuffisant pour ce produit.");
        return;
      }
      setPanierInvite(lirePanierInvite());
      setMessage("Quantite mise a jour");
      return;
    }
    try {
      const res = await api.put<{ panier: Panier }>("/panier/modifier-quantite", {
        produitId,
        quantite,
      });
      setPanier(res.data.panier);
      notifierChangementPanier();
      setMessage("Quantité mise à jour");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de la mise à jour";
      setErreur(msg);
    }
  }

  async function supprimerProduit(produitId: string) {
    if (!window.confirm("Retirer ce produit du panier ?")) return;
    if (!utilisateur) {
      supprimerDuPanierInvite(produitId);
      setPanierInvite(lirePanierInvite());
      setMessage("Produit retiré du panier");
      return;
    }
    try {
      const res = await api.delete<{ panier: Panier }>(`/panier/supprimer/${produitId}`);
      setPanier(res.data.panier);
      notifierChangementPanier();
      setMessage("Produit supprimé du panier");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de la suppression";
      setErreur(msg);
    }
  }

  async function viderPanier() {
    if (!window.confirm("Vider entièrement le panier ?")) return;
    if (!utilisateur) {
      viderPanierInvite();
      setPanierInvite([]);
      setMessage("Panier vide");
      return;
    }
    try {
      const res = await api.delete<{ panier: Panier }>("/panier/vider");
      setPanier(res.data.panier);
      notifierChangementPanier();
      setMessage("Panier vidé");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors du vidage du panier";
      setErreur(msg);
    }
  }

  /** Transfert panier invité au backend après connexion + retour sur /panier (liens header, bouton, texte). */
  function marquerTransfertPanierInviteEtAllerConnexion(messageHint?: string) {
    localStorage.setItem(CLE_TRANSFERT_PANIER_INVITE, "1");
    if (messageHint) setMessage(messageHint);
    navigate("/connexion", { state: { from: "/panier" } });
  }

  function allerConnexionPourCommanderInvite() {
    marquerTransfertPanierInviteEtAllerConnexion(
      "Connectez-vous pour finaliser la commande et recuperer votre panier invite."
    );
  }

  function commander() {
    if (!utilisateur) {
      allerConnexionPourCommanderInvite();
      return;
    }
    setErreur(null);
    const provinceObligatoire = getRegionOptions(adresse.pays).length > 0;
    const errs = validerFormulaireAdresse(adresse, provinceObligatoire);
    if (Object.keys(errs).length > 0) {
      setErreursAdresse(errs);
      return;
    }
    setErreursAdresse({});
    localStorage.setItem(cleAdresseLivraison(utilisateur.id), JSON.stringify(adresse));
    navigate("/paiement");
  }

  const items = useMemo<ItemPanier[]>(() => {
    if (utilisateur) return panier?.items || [];
    return panierInvite.map((it) => ({
      produitId: it.produitId,
      nomProduit: it.nomProduit,
      prixUnitaire: it.prixUnitaire,
      quantite: it.quantite,
      imageUrl: it.imageUrl,
    }));
  }, [utilisateur, panier, panierInvite]);

  const itemsAvecPrix = useMemo<ItemPanier[]>(() => {
    return items.map((it) => {
      const prixDirect = Number(it.prixUnitaire);
      if (Number.isFinite(prixDirect) && prixDirect > 0) return it;
      const nomNormalise = normaliserNomProduit(it.nomProduit);
      const prixFallback = prixProduits[it.produitId] ?? prixProduitsParNom[nomNormalise] ?? 0;
      return {
        ...it,
        prixUnitaire: prixFallback,
      };
    });
  }, [items, prixProduits, prixProduitsParNom]);

  const sousTotalCalcule = useMemo(
    () => itemsAvecPrix.reduce((acc, it) => acc + (Number(it.prixUnitaire) || 0) * (Number(it.quantite) || 0), 0),
    [itemsAvecPrix]
  );

  const total = utilisateur ? (panier?.total && panier.total > 0 ? panier.total : sousTotalCalcule) : sousTotalCalcule;
  const taxeEstimee = total * TAUX_TAXE;
  const totalTTC = total + taxeEstimee;

  function atteintStockMax(item: ItemPanier) {
    const stock = stocksProduits[item.produitId];
    if (!Number.isFinite(stock)) return false;
    return item.quantite >= stock;
  }

  const profilAdressePrefill = useMemo(() => extraireAdresseDepuisProfil(utilisateur), [utilisateur]);
  const paysOptions = useMemo(() => getCountryOptions("fr-CA"), []);
  const provinceOptions = useMemo(() => getRegionOptions(adresse.pays), [adresse.pays]);
  const provinceObligatoire = provinceOptions.length > 0;

  function remplirAdresseDepuisProfil() {
    if (!utilisateur) return;
    setErreursAdresse({});
    setAdresse((precedente) => ({
      ...precedente,
      nomComplet: profilAdressePrefill.nomComplet || precedente.nomComplet,
      rue: profilAdressePrefill.rue || precedente.rue,
      ville: profilAdressePrefill.ville || precedente.ville,
      province: profilAdressePrefill.province || precedente.province,
      codePostal: profilAdressePrefill.codePostal || precedente.codePostal,
      pays: profilAdressePrefill.pays || precedente.pays || "CA",
      telephone: profilAdressePrefill.telephone || precedente.telephone,
    }));
    setMessage("Adresse remplie depuis votre profil.");
  }

  function urlVignetteLigne(it: ItemPanier): string {
    const depuisApi = it.imageUrl ? resolveAssetUrl(it.imageUrl) : "";
    if (depuisApi) return depuisApi;
    const nomKey = normaliserNomProduit(it.nomProduit);
    return (
      imagesProduits[it.produitId] ||
      imagesProduitsParNom[nomKey] ||
      FRONTEND_IMAGE_BY_NAME[nomKey] ||
      ""
    );
  }

  const nbArticles = itemsAvecPrix.reduce((n, it) => n + it.quantite, 0);

  return (
    <div className="panier-page">
      <ClientNav
        variant="default"
        connexionLinkState={{ from: "/panier" }}
        onConnexionClick={() => localStorage.setItem(CLE_TRANSFERT_PANIER_INVITE, "1")}
      />

      <main className="panier-shell panier-shell--pro">
        <div className="breadcrumb-wrap">
          <Breadcrumb
            items={[
              { label: "Accueil", to: "/" },
              { label: "Panier" },
            ]}
          />
        </div>

        {!loading && erreur && <div className="panier-alert panier-alert-error">{erreur}</div>}
        {!loading && message && (
          <div className="panier-alert panier-alert-success">{message}</div>
        )}

        {loading ? (
          <p className="panier-state panier-state--pulse" role="status">
            Chargement du panier…
          </p>
        ) : itemsAvecPrix.length === 0 ? (
          <div className="panier-empty panier-empty--pro" role="status">
            <div className="panier-empty-visual" aria-hidden="true">
              <svg viewBox="0 0 64 64" className="panier-empty-icon" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M16 22h40l-4 28H20L16 22z" strokeLinejoin="round" />
                <path d="M24 22V14a8 8 0 0 1 16 0v8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="panier-empty-copy">
              <h2 className="panier-empty-title">Votre sac est vide</h2>
              <p className="panier-empty-desc">
                Parfums, soins visage, maquillage : composez votre rituel beauté comme dans les grandes enseignes canadiennes.
              </p>
              <div className="panier-empty-actions">
                <Link to="/catalogue" className="panier-btn panier-btn-primary">
                  Explorer le catalogue
                </Link>
                <Link to="/" className="panier-btn panier-btn-ghost">
                  Retour à l&apos;accueil
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="panier-checkout-layout">
              <div className="panier-checkout-main">
                <header className="panier-intro">
                  <p className="panier-intro-kicker">CosmétiShop — Prix en dollars canadiens (CAD)</p>
                  <h1 className="panier-intro-title">Sac à achats</h1>
                  <p className="panier-intro-desc">
                    {nbArticles} article{nbArticles !== 1 ? "s" : ""}
                    {utilisateur
                      ? " · Enregistré sur votre compte."
                      : " · Sac invité — conservé sur cet appareil."}
                  </p>
                  {!utilisateur && (
                    <p className="panier-intro-auth">
                      <button
                        type="button"
                        className="panier-auth-hint-btn"
                        onClick={allerConnexionPourCommanderInvite}
                      >
                        Se connecter
                      </button>
                      <span> pour finaliser comme sur les boutiques beauté en ligne au Canada.</span>
                    </p>
                  )}
                </header>
                <TrustCheckoutStrip compact />
                <section className="panier-bag-section" aria-labelledby="panier-bag-heading">
                  <div className="panier-bag-head">
                    <h2 id="panier-bag-heading" className="panier-section-title">
                      Vos articles
                    </h2>
                    <span className="panier-bag-count">{nbArticles} pce au total</span>
                  </div>
                <div className="panier-list panier-list--pro">
                  {itemsAvecPrix.map((it) => {
                    const vignette = urlVignetteLigne(it);
                    return (
                <article key={it.produitId} className="panier-item panier-item--pro">
                  <div className="panier-item-visual" aria-hidden="true">
                    {vignette ? (
                      <img
                        src={vignette}
                        alt=""
                        className="panier-item-image"
                      />
                    ) : (
                      <div className="panier-item-image panier-item-image-placeholder" />
                    )}
                  </div>
                  <div className="panier-item-main">
                    <h3 className="panier-item-name">{it.nomProduit}</h3>
                    <p className="panier-item-detail">
                      {it.prixUnitaire.toFixed(2)} $ x {it.quantite} ={" "}
                      <span>{(it.prixUnitaire * it.quantite).toFixed(2)} $</span>
                    </p>
                  </div>
                  <div className="panier-item-actions">
                    <div className="panier-qty-box">
                      <button
                        type="button"
                        onClick={() => modifierQuantite(it.produitId, it.quantite - 1)}
                        className="panier-qty-btn"
                      >
                        -
                      </button>
                      <span className="panier-qty-value">{it.quantite}</span>
                      <button
                        type="button"
                        onClick={() => modifierQuantite(it.produitId, it.quantite + 1)}
                        className="panier-qty-btn"
                        disabled={atteintStockMax(it)}
                        title={atteintStockMax(it) ? "Stock maximum atteint" : "Augmenter"}
                      >
                        +
                      </button>
                    </div>
                    {atteintStockMax(it) && (
                      <span className="panier-stock-warning">Stock maximum atteint</span>
                    )}
                    <button
                      type="button"
                      onClick={() => supprimerProduit(it.produitId)}
                      className="panier-btn-remove"
                    >
                      Retirer
                    </button>
                  </div>
                </article>
                    );
                  })}
                </div>
                </section>
            {utilisateur && (
              <section className="panier-adresse">
                <h2 className="panier-adresse-title">Adresse de livraison</h2>
                <p className="panier-adresse-subtitle">
                  Cette adresse est obligatoire pour valider la commande.
                </p>
                <div className="panier-adresse-actions">
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
                      value={adresse.nomComplet}
                      onChange={(e) => {
                        setErreursAdresse((er) => ({ ...er, nomComplet: undefined }));
                        setAdresse((prev) => ({ ...prev, nomComplet: filtrerNomPropre(e.target.value) }));
                      }}
                      className={`panier-adresse-input${erreursAdresse.nomComplet ? " is-invalid" : ""}`}
                      autoComplete="name"
                      aria-invalid={Boolean(erreursAdresse.nomComplet)}
                      aria-describedby={erreursAdresse.nomComplet ? "panier-err-nom" : undefined}
                    />
                    {erreursAdresse.nomComplet ? (
                      <span id="panier-err-nom" className="panier-field-error" role="alert">
                        {erreursAdresse.nomComplet}
                      </span>
                    ) : (
                      <span className="panier-field-hint">Lettres uniquement, tiret pour les noms composés.</span>
                    )}
                  </label>
                  <label>
                    <span className="panier-label-heading">Téléphone (optionnel)</span>
                    <input
                      type="tel"
                      value={adresse.telephone}
                      onChange={(e) => {
                        setErreursAdresse((er) => ({ ...er, telephone: undefined }));
                        setAdresse((prev) => ({ ...prev, telephone: e.target.value }));
                      }}
                      className={`panier-adresse-input${erreursAdresse.telephone ? " is-invalid" : ""}`}
                      autoComplete="tel"
                      aria-invalid={Boolean(erreursAdresse.telephone)}
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
                      value={adresse.rue}
                      onChange={(e) => {
                        setErreursAdresse((er) => ({ ...er, rue: undefined }));
                        setAdresse((prev) => ({ ...prev, rue: e.target.value }));
                      }}
                      className={`panier-adresse-input${erreursAdresse.rue ? " is-invalid" : ""}`}
                      autoComplete="street-address"
                      aria-invalid={Boolean(erreursAdresse.rue)}
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
                      value={adresse.ville}
                      onChange={(e) => {
                        setErreursAdresse((er) => ({ ...er, ville: undefined }));
                        setAdresse((prev) => ({ ...prev, ville: filtrerVille(e.target.value) }));
                      }}
                      className={`panier-adresse-input${erreursAdresse.ville ? " is-invalid" : ""}`}
                      autoComplete="address-level2"
                      aria-invalid={Boolean(erreursAdresse.ville)}
                    />
                    {erreursAdresse.ville ? (
                      <span className="panier-field-error" role="alert">
                        {erreursAdresse.ville}
                      </span>
                    ) : (
                      <span className="panier-field-hint">Sans chiffres (ex. Montréal, Québec).</span>
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
                        value={adresse.province}
                        onChange={(e) => {
                          setErreursAdresse((er) => ({ ...er, province: undefined }));
                          setAdresse((prev) => ({ ...prev, province: e.target.value }));
                        }}
                        className={`panier-adresse-input${erreursAdresse.province ? " is-invalid" : ""}`}
                        aria-invalid={Boolean(erreursAdresse.province)}
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
                        value={adresse.province}
                        onChange={(e) => {
                          setErreursAdresse((er) => ({ ...er, province: undefined }));
                          setAdresse((prev) => ({ ...prev, province: e.target.value }));
                        }}
                        className={`panier-adresse-input${erreursAdresse.province ? " is-invalid" : ""}`}
                        aria-invalid={Boolean(erreursAdresse.province)}
                      />
                    )}
                    {erreursAdresse.province ? (
                      <span className="panier-field-error" role="alert">
                        {erreursAdresse.province}
                      </span>
                    ) : (
                      <span
                        key={`province-helper-${adresse.pays}-${provinceObligatoire ? "required" : "optional"}`}
                        className={`panier-field-helper ${
                          provinceObligatoire ? "panier-field-helper-required" : "panier-field-helper-optional"
                        } field-helper-animated`}
                      >
                        <span className="field-helper-icon" aria-hidden="true">
                          {provinceObligatoire ? "!" : "✓"}
                        </span>{" "}
                        {provinceObligatoire
                          ? "Obligatoire pour ce pays."
                          : "Optionnel pour ce pays."}
                      </span>
                    )}
                  </label>
                  <label>
                    <span className="panier-label-heading">
                      Code postal
                      <abbr className="panier-required-star" title="Champ obligatoire">
                        *
                      </abbr>
                    </span>
                    <input
                      value={adresse.codePostal}
                      onChange={(e) => {
                        setErreursAdresse((er) => ({ ...er, codePostal: undefined }));
                        setAdresse((prev) => ({ ...prev, codePostal: e.target.value }));
                      }}
                      className={`panier-adresse-input${erreursAdresse.codePostal ? " is-invalid" : ""}`}
                      autoComplete="postal-code"
                      aria-invalid={Boolean(erreursAdresse.codePostal)}
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
                      className={`panier-adresse-input${erreursAdresse.pays ? " is-invalid" : ""}`}
                      autoComplete="country"
                      aria-invalid={Boolean(erreursAdresse.pays)}
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
              </section>
            )}

              </div>
            <aside className="panier-checkout-aside" aria-label="Résumé de commande">
              <div className="panier-summary-panel">
                <h2 className="panier-summary-panel-title">Résumé</h2>
                <dl className="panier-summary-lines">
                  <div className="panier-summary-line">
                    <dt>Sous-total</dt>
                    <dd>{total.toFixed(2)} $</dd>
                  </div>
                  <div className="panier-summary-line panier-summary-line--muted">
                    <dt>Taxes estimées</dt>
                    <dd>{taxeEstimee.toFixed(2)} $</dd>
                  </div>
                </dl>
                <p className="panier-summary-tax-note">
                  TPS / TVH et TVQ — taux indicatif 15 % (ajusté à la caisse selon votre province).
                </p>
                <div className="panier-summary-line panier-summary-line--grand">
                  <span className="panier-summary-grand-label">Total estimé</span>
                  <span className="panier-summary-grand-value">{totalTTC.toFixed(2)} $</span>
                </div>
                <button type="button" onClick={commander} className="panier-btn panier-btn-primary panier-summary-cta">
                  {utilisateur ? "Passer à la caisse" : "Se connecter pour commander"}
                </button>
                <Link to="/catalogue" className="panier-summary-continue">
                  Continuer mes achats
                </Link>
                <p className="panier-summary-trust">Paiement sécurisé · Livraison au Canada</p>
                <button type="button" onClick={viderPanier} className="panier-summary-clear">
                  Vider le sac
                </button>
              </div>
            </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

