import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, resolveAssetUrl } from "../api";
import { useAuth } from "../AuthContext";
import {
  lirePanierInvite,
  modifierQuantitePanierInvite,
  supprimerDuPanierInvite,
  type ItemPanierInvite,
  viderPanierInvite,
} from "../cartInvite";
import { getCountryOptions, getRegionOptions, resolveCountryCode } from "../locationData";
import { Breadcrumb } from "../components/Breadcrumb";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

interface ItemPanier {
  produitId: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
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
const CLE_TRANSFERT_PANIER_INVITE = "cosmetishop_panier_invite_transfer";

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

function extraireAdresseDepuisProfil(utilisateur: any): Partial<AdresseLivraison> {
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
  const { utilisateur, deconnexion } = useAuth();
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors du chargement du panier";
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
      setMessage("Quantité mise à jour");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la mise à jour";
      setErreur(msg);
    }
  }

  async function supprimerProduit(produitId: string) {
    if (!utilisateur) {
      supprimerDuPanierInvite(produitId);
      setPanierInvite(lirePanierInvite());
      setMessage("Produit supprime du panier");
      return;
    }
    try {
      const res = await api.delete<{ panier: Panier }>(`/panier/supprimer/${produitId}`);
      setPanier(res.data.panier);
      setMessage("Produit supprimé du panier");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la suppression";
      setErreur(msg);
    }
  }

  async function viderPanier() {
    if (!utilisateur) {
      viderPanierInvite();
      setPanierInvite([]);
      setMessage("Panier vide");
      return;
    }
    try {
      const res = await api.delete<{ panier: Panier }>("/panier/vider");
      setPanier(res.data.panier);
      setMessage("Panier vidé");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors du vidage du panier";
      setErreur(msg);
    }
  }

  /** Meme comportement que le bouton « Se connecter pour commander » (transfert panier invite + retour panier apres login). */
  function allerConnexionPourCommanderInvite() {
    localStorage.setItem(CLE_TRANSFERT_PANIER_INVITE, "1");
    setMessage("Connectez-vous pour finaliser la commande et recuperer votre panier invite.");
    navigate("/connexion", { state: { from: "/panier" } });
  }

  function commander() {
    if (!utilisateur) {
      allerConnexionPourCommanderInvite();
      return;
    }
    const champsObligatoires: Array<keyof AdresseLivraison> = [
      "nomComplet",
      "rue",
      "ville",
      "codePostal",
      "pays",
    ];
    for (const champ of champsObligatoires) {
      if (!adresse[champ].trim()) {
        setErreur("Veuillez renseigner l'adresse de livraison complète avant de commander.");
        return;
      }
    }
    const provinceObligatoire = getRegionOptions(adresse.pays).length > 0;
    if (provinceObligatoire && !adresse.province.trim()) {
      setErreur("Veuillez selectionner une province/un etat pour ce pays.");
      return;
    }
    setErreur(null);
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

  const initialesUtilisateur = useMemo(() => {
    if (!utilisateur?.nom) return "U";
    const parts = utilisateur.nom.trim().split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  }, [utilisateur]);
  const avatarUtilisateur = resolveAssetUrl(utilisateur?.avatarUrl);
  const profilAdressePrefill = useMemo(() => extraireAdresseDepuisProfil(utilisateur), [utilisateur]);
  const paysOptions = useMemo(() => getCountryOptions("fr-CA"), []);
  const provinceOptions = useMemo(() => getRegionOptions(adresse.pays), [adresse.pays]);
  const provinceObligatoire = provinceOptions.length > 0;

  function remplirAdresseDepuisProfil() {
    if (!utilisateur) return;
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
            <Link to="/liste-souhaits" className="nav-link">
              Liste d&apos;envies
            </Link>
            {utilisateur && (
              <Link to="/commandes" className="nav-link">
                Commandes
              </Link>
            )}
          </div>
          <div className="nav-right">
            {utilisateur ? (
              <>
                <Link to="/profil" className="nav-user-pill nav-user-pill-link" title={utilisateur.email}>
                  <span className="nav-user-avatar">
                    {avatarUtilisateur ? (
                      <img src={avatarUtilisateur} alt={utilisateur.nom} className="nav-user-avatar-image" />
                    ) : (
                      initialesUtilisateur
                    )}
                  </span>
                  <span className="nav-user-meta">
                    <span className="nav-user-name">{utilisateur.nom}</span>
                    <span className="nav-user-role">{utilisateur.role}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="nav-auth-btn nav-auth-btn-logout"
                  onClick={deconnexion}
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/connexion" className="nav-auth-btn nav-auth-link">
                  Se connecter
                </Link>
                <Link to="/inscription" className="nav-auth-btn nav-auth-btn-primary nav-auth-link">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="panier-shell">
        <div className="breadcrumb-wrap">
          <Breadcrumb
            items={[
              { label: "Accueil", to: "/" },
              { label: "Panier" },
            ]}
          />
        </div>
        <section className="panier-hero">
          <div>
            <p className="panier-kicker">Votre espace achat</p>
            <h1 className="panier-title">Mon panier</h1>
            <p className="panier-subtitle">
              Finalisez vos articles en quelques clics avec une experience fluide et securisee.
            </p>
            <p className="panier-mode">
              {utilisateur
                ? "Mode compte actif: panier synchronise avec votre espace client."
                : "Mode invite: panier enregistre localement sur ce navigateur."}
            </p>
            {!utilisateur && (
              <p className="panier-auth-hint">
                <button
                  type="button"
                  className="panier-auth-hint-btn"
                  onClick={allerConnexionPourCommanderInvite}
                >
                  Connectez-vous
                </button>{" "}
                pour commander avec votre compte.
              </p>
            )}
          </div>
          <div className="panier-summary-card">
            <p className="panier-summary-label">Total estime (taxe incluse)</p>
            <p className="panier-summary-total">{totalTTC.toFixed(2)} $</p>
            <p className="panier-summary-meta">Sous-total: {total.toFixed(2)} $</p>
            <p className="panier-summary-meta">Taxe (15%): {taxeEstimee.toFixed(2)} $</p>
            <p className="panier-summary-meta">{itemsAvecPrix.length} article(s)</p>
          </div>
        </section>

        {erreur && <div className="panier-alert panier-alert-error">{erreur}</div>}
        {message && <div className="panier-alert panier-alert-success">{message}</div>}

        {loading ? (
          <p className="panier-state">Chargement du panier...</p>
        ) : itemsAvecPrix.length === 0 ? (
          <div className="panier-empty">
            <p>Votre panier est vide pour le moment.</p>
            <Link to="/catalogue" className="panier-btn panier-btn-primary">
              Decouvrir le catalogue
            </Link>
          </div>
        ) : (
          <>
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
                    Nom complet
                    <input
                      value={adresse.nomComplet}
                      onChange={(e) =>
                        setAdresse((prev) => ({ ...prev, nomComplet: e.target.value }))
                      }
                      className="panier-adresse-input"
                    />
                  </label>
                  <label>
                    Téléphone (optionnel)
                    <input
                      value={adresse.telephone}
                      onChange={(e) =>
                        setAdresse((prev) => ({ ...prev, telephone: e.target.value }))
                      }
                      className="panier-adresse-input"
                    />
                  </label>
                  <label className="panier-adresse-col-full">
                    Rue et numéro
                    <input
                      value={adresse.rue}
                      onChange={(e) => setAdresse((prev) => ({ ...prev, rue: e.target.value }))}
                      className="panier-adresse-input"
                    />
                  </label>
                  <label>
                    Ville
                    <input
                      value={adresse.ville}
                      onChange={(e) => setAdresse((prev) => ({ ...prev, ville: e.target.value }))}
                      className="panier-adresse-input"
                    />
                  </label>
                  <label>
                    Province / Etat
                    {provinceOptions.length > 0 ? (
                      <select
                        value={adresse.province}
                        onChange={(e) =>
                          setAdresse((prev) => ({ ...prev, province: e.target.value }))
                        }
                        className="panier-adresse-input"
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
                        value={adresse.province}
                        onChange={(e) =>
                          setAdresse((prev) => ({ ...prev, province: e.target.value }))
                        }
                        className="panier-adresse-input"
                      />
                    )}
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
                  </label>
                  <label>
                    Code postal
                    <input
                      value={adresse.codePostal}
                      onChange={(e) =>
                        setAdresse((prev) => ({ ...prev, codePostal: e.target.value }))
                      }
                      className="panier-adresse-input"
                    />
                  </label>
                  <label>
                    Pays
                    <select
                      value={adresse.pays}
                      onChange={(e) =>
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
                        })
                      }
                      className="panier-adresse-input"
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
              </section>
            )}

            <div className="panier-list">
              {itemsAvecPrix.map((it) => (
                <article key={it.produitId} className="panier-item">
                  <div className="panier-item-visual" aria-hidden="true">
                    {imagesProduits[it.produitId] ||
                    imagesProduitsParNom[normaliserNomProduit(it.nomProduit)] ||
                    FRONTEND_IMAGE_BY_NAME[normaliserNomProduit(it.nomProduit)] ? (
                      <img
                        src={
                          imagesProduits[it.produitId] ||
                          imagesProduitsParNom[normaliserNomProduit(it.nomProduit)] ||
                          FRONTEND_IMAGE_BY_NAME[normaliserNomProduit(it.nomProduit)]
                        }
                        alt=""
                        className="panier-item-image"
                      />
                    ) : (
                      <div className="panier-item-image panier-item-image-placeholder" />
                    )}
                  </div>
                  <div className="panier-item-main">
                    <h2 className="panier-item-name">{it.nomProduit}</h2>
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
                      className="panier-btn panier-btn-danger"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <section className="panier-footer">
              <div className="panier-footer-info">
                <p className="panier-footer-status">
                  Statut: {utilisateur ? panier?.statut || "actif" : "invite"}
                </p>
                <p className="panier-footer-status">Sous-total: {total.toFixed(2)} $</p>
                <p className="panier-footer-status">Taxe (15%): {taxeEstimee.toFixed(2)} $</p>
                <p className="panier-footer-total">Total a payer: {totalTTC.toFixed(2)} $</p>
              </div>
              <div className="panier-footer-actions">
                <button type="button" onClick={viderPanier} className="panier-btn panier-btn-ghost">
                  Vider le panier
                </button>
                <button type="button" onClick={commander} className="panier-btn panier-btn-primary">
                  {utilisateur ? "Passer au paiement" : "Se connecter pour commander"}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

