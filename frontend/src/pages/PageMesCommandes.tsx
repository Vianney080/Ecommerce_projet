import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_ORIGIN } from "../api";
import { useAuth } from "../AuthContext";
import "../styles.css";

interface ItemCommande {
  produitId?: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
}

interface CommandeClient {
  _id: string;
  statut: "en_attente" | "payee" | "livree" | "annulee" | string;
  statutPaiement?: "en_attente" | "paye" | "echoue" | "rembourse" | string;
  numeroFacture?: string;
  total: number;
  createdAt: string;
  items: ItemCommande[];
  adresseLivraison?: {
    nomComplet?: string;
    rue?: string;
    ville?: string;
    province?: string;
    codePostal?: string;
    pays?: string;
    telephone?: string;
  };
}

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

function libelleStatut(statut: string) {
  if (statut === "en_attente") return "En attente";
  if (statut === "payee") return "Payee";
  if (statut === "livree") return "Livree";
  if (statut === "annulee") return "Annulee";
  return statut;
}

function libelleStatutPaiement(statutPaiement?: string) {
  if (statutPaiement === "paye") return "Payé";
  if (statutPaiement === "en_attente") return "En attente";
  if (statutPaiement === "echoue") return "Echoué";
  if (statutPaiement === "rembourse") return "Remboursé";
  return statutPaiement || "En attente";
}

export function PageMesCommandes() {
  const { utilisateur, deconnexion } = useAuth();
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [imagesParIdProduit, setImagesParIdProduit] = useState<Record<string, string>>({});
  const [imagesParNomProduit, setImagesParNomProduit] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<{ url: string; alt: string } | null>(null);

  async function charger() {
    setLoading(true);
    setErreur(null);
    try {
      const res = await api.get<CommandeClient[]>("/commandes/mes-commandes");
      setCommandes(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors du chargement des commandes";
      setErreur(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    async function chargerImagesProduits() {
      try {
        const res = await api.get<Array<{ _id: string; nom: string; imageUrl?: string }>>("/produits");
        const mapId: Record<string, string> = {};
        const mapNom: Record<string, string> = {};

        for (const p of res.data) {
          const image = p.imageUrl
            ? p.imageUrl.startsWith("http://") || p.imageUrl.startsWith("https://")
              ? p.imageUrl
              : p.imageUrl.startsWith("/")
              ? `${API_ORIGIN}${p.imageUrl}`
              : `${API_ORIGIN}/${p.imageUrl}`
            : "";
          if (!image) continue;
          mapId[p._id] = image;
          mapNom[normaliserNomProduit(p.nom)] = image;
        }

        setImagesParIdProduit(mapId);
        setImagesParNomProduit(mapNom);
      } catch {
        setImagesParIdProduit({});
        setImagesParNomProduit({});
      }
    }

    void chargerImagesProduits();
  }, []);

  const initialesUtilisateur = utilisateur?.nom
    ? utilisateur.nom
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("")
    : "U";
  const avatarUtilisateur = utilisateur?.avatarUrl
    ? utilisateur.avatarUrl.startsWith("http://") || utilisateur.avatarUrl.startsWith("https://")
      ? utilisateur.avatarUrl
      : utilisateur.avatarUrl.startsWith("/")
        ? `${API_ORIGIN}${utilisateur.avatarUrl}`
        : `${API_ORIGIN}/${utilisateur.avatarUrl}`
    : "";

  return (
    <div className="orders-page">
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

      <div className="orders-shell">
        <div className="orders-header">
          <h1 className="orders-title">Mes commandes</h1>
          <div className="orders-actions">
            <Link to="/panier" className="orders-link-btn">
              Voir mon panier
            </Link>
            <button type="button" className="orders-link-btn" onClick={charger}>
              Actualiser
            </button>
          </div>
        </div>

        {erreur && <div className="orders-alert orders-alert-error">{erreur}</div>}
        {loading ? (
          <p className="orders-empty">Chargement des commandes...</p>
        ) : commandes.length === 0 ? (
          <p className="orders-empty">Aucune commande pour le moment.</p>
        ) : (
          <div className="orders-list">
            {commandes.map((c) => (
              <article key={c._id} className="orders-card">
                <div className="orders-card-head">
                  <div>
                    <p className="orders-card-id">Commande #{c._id.slice(-6).toUpperCase()}</p>
                    <p className="orders-card-date">{new Date(c.createdAt).toLocaleString()}</p>
                    <p className="orders-card-date">Facture: {(c.numeroFacture || "N/A").toUpperCase()}</p>
                  </div>
                  <div className="orders-status-pair">
                    <span className={`orders-status status-${c.statut}`}>
                      Traitement: {libelleStatut(c.statut)}
                    </span>
                    <span className={`orders-status payment-status-${c.statutPaiement || "en_attente"}`}>
                      Paiement: {libelleStatutPaiement(c.statutPaiement)}
                    </span>
                  </div>
                </div>

                <ul className="orders-items">
                  {c.items.map((it, idx) => (
                    <li key={`${c._id}-${idx}`}>
                      <span className="orders-item-main">
                        <span className="orders-item-thumb">
                          {imagesParIdProduit[it.produitId || ""] ||
                          imagesParNomProduit[normaliserNomProduit(it.nomProduit)] ||
                          FRONTEND_IMAGE_BY_NAME[normaliserNomProduit(it.nomProduit)] ? (
                            <button
                              type="button"
                              className="orders-item-thumb-btn"
                              onClick={() =>
                                setImagePreview({
                                  url:
                                    imagesParIdProduit[it.produitId || ""] ||
                                    imagesParNomProduit[normaliserNomProduit(it.nomProduit)] ||
                                    FRONTEND_IMAGE_BY_NAME[normaliserNomProduit(it.nomProduit)],
                                  alt: it.nomProduit,
                                })
                              }
                            >
                              <img
                                src={
                                  imagesParIdProduit[it.produitId || ""] ||
                                  imagesParNomProduit[normaliserNomProduit(it.nomProduit)] ||
                                  FRONTEND_IMAGE_BY_NAME[normaliserNomProduit(it.nomProduit)]
                                }
                                alt={it.nomProduit}
                              />
                            </button>
                          ) : (
                            <span className="orders-item-thumb-placeholder" />
                          )}
                        </span>
                        <span>{it.nomProduit}</span>
                      </span>
                      <span>
                        {it.quantite} x {it.prixUnitaire.toFixed(2)} $
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="orders-address">
                  <p className="orders-address-title">Adresse de livraison</p>
                  {c.adresseLivraison?.nomComplet ? (
                    <p className="orders-address-line">
                      {c.adresseLivraison.nomComplet}
                      {c.adresseLivraison.telephone ? ` - ${c.adresseLivraison.telephone}` : ""}
                    </p>
                  ) : (
                    <p className="orders-address-line">Adresse non disponible</p>
                  )}
                  {c.adresseLivraison?.rue && (
                    <p className="orders-address-line">{c.adresseLivraison.rue}</p>
                  )}
                  {(c.adresseLivraison?.ville ||
                    c.adresseLivraison?.province ||
                    c.adresseLivraison?.codePostal) && (
                    <p className="orders-address-line">
                      {[c.adresseLivraison?.ville, c.adresseLivraison?.province, c.adresseLivraison?.codePostal]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {c.adresseLivraison?.pays && (
                    <p className="orders-address-line">{c.adresseLivraison.pays}</p>
                  )}
                </div>

                <div className="orders-total">Total: {c.total.toFixed(2)} $</div>
              </article>
            ))}
          </div>
        )}
      </div>

      {imagePreview && (
        <button
          type="button"
          className="orders-lightbox"
          onClick={() => setImagePreview(null)}
          aria-label="Fermer l'aperçu"
        >
          <div className="orders-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={imagePreview.url} alt={imagePreview.alt} />
            <p>{imagePreview.alt}</p>
          </div>
        </button>
      )}
    </div>
  );
}

