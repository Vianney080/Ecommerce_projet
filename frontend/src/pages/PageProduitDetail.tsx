import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, resolveAssetUrl } from "../api";
import { ProductImageCascade } from "../components/ProductImage";
import { useAuth } from "../AuthContext";
import { ajouterAuPanierInvite, lirePanierInvite } from "../cartInvite";
import { Breadcrumb } from "../components/Breadcrumb";
import { ClientNav } from "../components/ClientNav";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import { basculerListeSouhaits, estDansListeSouhaits } from "../wishlistInvite";
import {
  NB_VIGNETES_IMAGES_PRIORITAIRES,
  trierUrlsImagesParFiabilite,
} from "../utils/imageUrlPriority";
import { PrixAvecPromo } from "../components/PrixAvecPromo";
import "../styles.css";

/** `sizes` pour vignettes catalogue / grille (évite de télécharger trop large). */
const SIZES_VIGNETTE_CATALOGUE = "(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 280px";

type ProduitDetail = {
  _id: string;
  nom: string;
  description?: string;
  categorie: string;
  quantite: number;
  prixUnitaire: number;
  prixBarre?: number | null;
  seuilMinimum: number;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type ProduitState = Partial<ProduitDetail> & {
  id?: string | number;
  backendId?: string;
  prix?: number;
  prixBarre?: number | null;
  image?: string;
  imageUrls?: string[];
};

type PanierFeedback = {
  texte: string;
  type: "success" | "error";
};

type EntreeAvis = {
  _id: string;
  note: number;
  commentaire: string;
  createdAt: string;
  auteur: string;
};

type ReponseAvisApi = {
  moyenne: number;
  nombre: number;
  avis: EntreeAvis[];
};

function FeedbackIcon({ type }: { type: "success" | "error" }) {
  if (type === "error") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 7 10 17l-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PageProduitDetail() {
  const { id } = useParams();
  const { utilisateur } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [produit, setProduit] = useState<ProduitDetail | null>(null);
  const [produitsMemeCategorie, setProduitsMemeCategorie] = useState<ProduitDetail[]>([]);
  const [chargementMemeCategorie, setChargementMemeCategorie] = useState(false);
  const [messagePanier, setMessagePanier] = useState<PanierFeedback | null>(null);
  const [messageListeSouhaits, setMessageListeSouhaits] = useState<string | null>(null);
  const [imageActiveIndex, setImageActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1.8);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const touchRef = useRef<{ x: number; y: number; distance: number | null }>({
    x: 0,
    y: 0,
    distance: null,
  });

  const [wishlistTick, setWishlistTick] = useState(0);
  const [blocAvis, setBlocAvis] = useState<ReponseAvisApi | null>(null);
  const [chargementAvis, setChargementAvis] = useState(false);
  const [noteAvis, setNoteAvis] = useState(5);
  const [texteAvis, setTexteAvis] = useState("");
  const [messageAvis, setMessageAvis] = useState<{ texte: string; type: "success" | "error" } | null>(null);
  const [soumissionAvis, setSoumissionAvis] = useState(false);
  const [imagePrincipaleCassee, setImagePrincipaleCassee] = useState(false);

  const produitDepuisState = useMemo(() => {
    const state = (location.state || {}) as { produit?: ProduitState };
    return state.produit || null;
  }, [location.state]);

  useEffect(() => {
    let annule = false;

    async function chargerProduit() {
      if (!id) {
        setErreur("Produit introuvable.");
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<ProduitDetail>(`/produits/${id}`);
        if (!annule) {
          setProduit(res.data);
          setErreur(null);
        }
      } catch {
        if (!annule) {
          if (produitDepuisState && String(produitDepuisState.id || produitDepuisState.backendId) === String(id)) {
            setProduit({
              _id: String(produitDepuisState.backendId || produitDepuisState.id || id),
              nom: produitDepuisState.nom || "Produit",
              description: produitDepuisState.description || "",
              categorie: produitDepuisState.categorie || "Non classé",
              quantite: Number(produitDepuisState.quantite || 0),
              prixUnitaire: Number(produitDepuisState.prixUnitaire || produitDepuisState.prix || 0),
              prixBarre:
                "prixBarre" in produitDepuisState && produitDepuisState.prixBarre != null
                  ? Number(produitDepuisState.prixBarre)
                  : undefined,
              seuilMinimum: Number(produitDepuisState.seuilMinimum || 0),
              imageUrl: produitDepuisState.imageUrl || produitDepuisState.image || "",
              imageUrls: produitDepuisState.imageUrls || [],
            });
            setErreur(null);
          } else {
            setErreur("Impossible de charger les détails du produit.");
          }
        }
      } finally {
        if (!annule) setLoading(false);
      }
    }

    chargerProduit();
    return () => {
      annule = true;
    };
  }, [id, produitDepuisState]);

  const imagesProduit = useMemo(() => {
    if (!produit) return [];
    const base = [...(produit.imageUrls || []), produit.imageUrl || ""].filter(Boolean);
    return Array.from(new Set(base)).map((img) => resolveAssetUrl(img));
  }, [produit]);

  const imagePrincipale = imagesProduit[imageActiveIndex] || "";

  useEffect(() => {
    setImageActiveIndex(0);
    setZoom(1.8);
    setOrigin({ x: 50, y: 50 });
    setImagePrincipaleCassee(false);
  }, [produit?._id]);

  useEffect(() => {
    setImagePrincipaleCassee(false);
  }, [imagePrincipale]);

  useEffect(() => {
    if (!messagePanier) return;
    const idTimeout = window.setTimeout(() => setMessagePanier(null), 3200);
    return () => window.clearTimeout(idTimeout);
  }, [messagePanier]);

  useEffect(() => {
    if (!messageListeSouhaits) return;
    const idTimeout = window.setTimeout(() => setMessageListeSouhaits(null), 2800);
    return () => window.clearTimeout(idTimeout);
  }, [messageListeSouhaits]);

  useEffect(() => {
    let annule = false;

    async function chargerProduitsMemeCategorie() {
      if (!produit?._id || !produit.categorie) {
        if (!annule) setProduitsMemeCategorie([]);
        return;
      }

      setChargementMemeCategorie(true);
      try {
        const res = await api.get<ProduitDetail[]>("/produits", {
          params: { categorie: produit.categorie },
        });
        if (annule) return;

        const similaires = (res.data || [])
          .filter((item) => String(item._id) !== String(produit._id))
          .slice(0, 4);
        setProduitsMemeCategorie(similaires);
      } catch {
        if (!annule) setProduitsMemeCategorie([]);
      } finally {
        if (!annule) setChargementMemeCategorie(false);
      }
    }

    chargerProduitsMemeCategorie();
    return () => {
      annule = true;
    };
  }, [produit?._id, produit?.categorie]);

  useEffect(() => {
    const h = () => setWishlistTick((t) => t + 1);
    window.addEventListener("wishlist-updated", h);
    return () => window.removeEventListener("wishlist-updated", h);
  }, []);

  const descriptionMeta = useMemo(() => {
    const d = produit?.description?.trim();
    if (!d) {
      return "Fiche produit CosmétiShop : détails, avis clients et ajout au panier.";
    }
    return d.slice(0, 160);
  }, [produit?.description]);

  useDocumentTitle(!loading && produit ? produit.nom : null);
  useMetaDescription(!loading && produit ? descriptionMeta : null);

  useEffect(() => {
    const pid = produit?._id;
    if (!pid) {
      setBlocAvis(null);
      return;
    }
    let annule = false;
    async function chargerAvis() {
      setChargementAvis(true);
      try {
        const res = await api.get<ReponseAvisApi>(`/avis/produit/${pid}`);
        if (!annule) setBlocAvis(res.data);
      } catch {
        if (!annule) setBlocAvis({ moyenne: 0, nombre: 0, avis: [] });
      } finally {
        if (!annule) setChargementAvis(false);
      }
    }
    chargerAvis();
    return () => {
      annule = true;
    };
  }, [produit?._id]);

  async function publierAvisFormulaire(e: FormEvent) {
    e.preventDefault();
    if (!utilisateur || !produit) return;
    setMessageAvis(null);
    setSoumissionAvis(true);
    try {
      await api.post("/avis", {
        produitId: produit._id,
        note: noteAvis,
        commentaire: texteAvis.trim(),
      });
      setMessageAvis({ texte: "Merci, votre avis a été enregistré.", type: "success" });
      const res = await api.get<ReponseAvisApi>(`/avis/produit/${produit._id}`);
      setBlocAvis(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Impossible d'enregistrer l'avis.";
      setMessageAvis({ texte: msg, type: "error" });
    } finally {
      setSoumissionAvis(false);
    }
  }

  const dansListeSouhaitsActif = useMemo(
    () => (produit ? estDansListeSouhaits(produit._id) : false),
    [produit?._id, wishlistTick]
  );

  async function ajouterAuPanier(cible: {
    _id: string;
    nom: string;
    prixUnitaire: number;
    imageUrl?: string;
    quantite?: number;
  }) {
    setMessagePanier(null);

    if (!utilisateur) {
      const dejaPresent = lirePanierInvite().some((it) => it.produitId === cible._id);
      const ok = ajouterAuPanierInvite(
        {
          produitId: cible._id,
          nomProduit: cible.nom,
          prixUnitaire: cible.prixUnitaire,
          imageUrl: cible.imageUrl,
        },
        1,
        Math.max(0, Number(cible.quantite) || 0)
      );
      if (!ok) {
        setMessagePanier({
          texte: `Stock insuffisant pour ${cible.nom}.`,
          type: "error",
        });
        return;
      }
      setMessagePanier({
        texte: dejaPresent
          ? "Quantité mise à jour dans votre panier."
          : "Article ajouté au panier avec succès.",
        type: "success",
      });
      return;
    }

    try {
      const res = await api.post("/panier/ajouter", { produitId: cible._id, quantite: 1 });
      setMessagePanier({
        texte: res.data?.message || "Article ajouté au panier avec succès.",
        type: "success",
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || "Erreur lors de l'ajout au panier";
      setMessagePanier({ texte: message, type: "error" });
    }
  }

  function gererMouvementImage(e: MouseEvent<HTMLDivElement>) {
    if (zoom <= 1 || !e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  }

  function calculerDistanceTouches(
    t1: { clientX: number; clientY: number },
    t2: { clientX: number; clientY: number }
  ) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function gererTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      touchRef.current.distance = calculerDistanceTouches(e.touches[0], e.touches[1]);
      return;
    }
    if (e.touches.length === 1) {
      touchRef.current.x = e.touches[0].clientX;
      touchRef.current.y = e.touches[0].clientY;
      touchRef.current.distance = null;
    }
  }

  function gererTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (!e.currentTarget) return;

    if (e.touches.length === 2) {
      const distance = calculerDistanceTouches(e.touches[0], e.touches[1]);
      const precedente = touchRef.current.distance;
      if (precedente !== null) {
        const delta = distance - precedente;
        setZoom((z) => Math.max(1, Math.min(3, z + delta * 0.01)));
      }
      touchRef.current.distance = distance;

      const rect = e.currentTarget.getBoundingClientRect();
      const centreX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centreY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const x = ((centreX - rect.left) / rect.width) * 100;
      const y = ((centreY - rect.top) / rect.height) * 100;
      setOrigin({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      });
      return;
    }

    if (e.touches.length === 1 && zoom > 1) {
      const touche = e.touches[0];
      const dx = touche.clientX - touchRef.current.x;
      const dy = touche.clientY - touchRef.current.y;
      setOrigin((o) => ({
        x: Math.max(0, Math.min(100, o.x - dx * 0.12)),
        y: Math.max(0, Math.min(100, o.y - dy * 0.12)),
      }));
      touchRef.current.x = touche.clientX;
      touchRef.current.y = touche.clientY;
      touchRef.current.distance = null;
    }
  }

  function gererTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (e.touches.length < 2) {
      touchRef.current.distance = null;
    }
    if (e.touches.length === 1) {
      touchRef.current.x = e.touches[0].clientX;
      touchRef.current.y = e.touches[0].clientY;
    }
  }

  return (
    <div className="produit-page">
      <ClientNav variant="default" logoSubtitle="Détails du produit" />

      {!loading && produit && (
        <div className="breadcrumb-wrap">
          <Breadcrumb
            items={[
              { label: "Accueil", to: "/" },
              { label: "Catalogue", to: "/catalogue" },
              { label: produit.nom },
            ]}
          />
        </div>
      )}

      {messagePanier && (
        <div className="top-feedback-wrap is-right is-floating">
          <div className={`top-feedback ${messagePanier.type === "error" ? "top-feedback-error" : "top-feedback-success"}`}>
            <span className="top-feedback-icon">
              <FeedbackIcon type={messagePanier.type} />
            </span>
            <span>{messagePanier.texte}</span>
          </div>
        </div>
      )}

      {messageListeSouhaits && (
        <div className="top-feedback-wrap is-right is-floating">
          <div className="top-feedback top-feedback-success" role="status">
            <span className="top-feedback-icon" aria-hidden>
              ♥
            </span>
            <span>{messageListeSouhaits}</span>
          </div>
        </div>
      )}

      <main className="produit-shell">
        {loading ? (
          <p className="produit-state panier-state--pulse" role="status">
            Chargement du produit…
          </p>
        ) : erreur || !produit ? (
          <div className="produit-alert produit-alert-error">
            <p>{erreur || "Produit indisponible."}</p>
            <Link to="/catalogue" className="catalogue-btn produit-back-btn">
              Retour au catalogue
            </Link>
          </div>
        ) : (
          <section className="produit-detail-card">
            <div className="produit-gallery">
              <div
                className="produit-image-stage"
                onMouseMove={gererMouvementImage}
                onMouseLeave={() => setOrigin({ x: 50, y: 50 })}
                onTouchStart={gererTouchStart}
                onTouchMove={gererTouchMove}
                onTouchEnd={gererTouchEnd}
              >
                <button
                  type="button"
                  className="product-wishlist-btn"
                  aria-label={
                    dansListeSouhaitsActif ? "Retirer de la liste d'envies" : "Ajouter à la liste d'envies"
                  }
                  onClick={(ev) => {
                    ev.stopPropagation();
                    const ajoute = basculerListeSouhaits(produit._id);
                    setWishlistTick((t) => t + 1);
                    setMessageListeSouhaits(
                      ajoute ? "Ajouté à votre liste d'envies" : "Retiré de votre liste d'envies"
                    );
                  }}
                >
                  {dansListeSouhaitsActif ? "♥" : "♡"}
                </button>
                {Number(produit.quantite) <= 0 && <span className="stock-out-badge">Rupture de stock</span>}
                {imagePrincipale && !imagePrincipaleCassee ? (
                  <img
                    src={imagePrincipale}
                    alt={produit.nom}
                    className="produit-image-main"
                    fetchPriority="high"
                    decoding="async"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: `${origin.x}% ${origin.y}%`,
                    }}
                    onError={() => setImagePrincipaleCassee(true)}
                  />
                ) : (
                  <div className="produit-image-main produit-image-placeholder" role="img" aria-label={produit.nom} />
                )}
              </div>
              {imagesProduit.length > 1 && (
                <div className="produit-thumbnails">
                  {imagesProduit.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      className={`produit-thumb ${idx === imageActiveIndex ? "is-active" : ""}`}
                      onClick={() => {
                        setImageActiveIndex(idx);
                        setZoom(1.8);
                        setOrigin({ x: 50, y: 50 });
                      }}
                    >
                      <img
                        src={img}
                        alt={`${produit.nom} vue ${idx + 1}`}
                        loading={idx === imageActiveIndex ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={idx === imageActiveIndex ? "high" : undefined}
                      />
                    </button>
                  ))}
                </div>
              )}
              <div className="produit-zoom-controls">
                <button type="button" className="produit-zoom-btn" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>
                  Zoom -
                </button>
                <button type="button" className="produit-zoom-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>
                  Zoom +
                </button>
                <button
                  type="button"
                  className="produit-zoom-btn"
                  onClick={() => {
                    setZoom(1.8);
                    setOrigin({ x: 50, y: 50 });
                  }}
                >
                  Réinitialiser
                </button>
              </div>
              <p className="produit-zoom-hint">
                Souris: déplacez pour explorer. Mobile: pinch pour zoomer et glisser pour explorer.
              </p>
            </div>

            <div className="produit-infos">
              <p className="produit-kicker">{produit.categorie}</p>
              <h1 className="produit-title">{produit.nom}</h1>
              <div className="produit-price">
                <PrixAvecPromo
                  prixUnitaire={produit.prixUnitaire}
                  prixBarre={produit.prixBarre}
                  variant="detail"
                />
              </div>

              <p className="produit-delivery-banner">
                <strong>Livraison rapide</strong>
                Préparation sous 24–48 h ouvrables. Confirmation par email et suivi disponible depuis la page{" "}
                <Link to="/suivi-commande">Suivi de commande</Link> après votre achat.
              </p>

              <p className="produit-description">
                {produit.description?.trim()
                  ? produit.description
                  : "Aucune description détaillée n'est disponible pour cet article pour le moment."}
              </p>

              <div className="produit-meta-grid">
                <div className="produit-meta-item">
                  <span className="produit-meta-label">Categorie</span>
                  <strong>{produit.categorie}</strong>
                </div>
                <div className="produit-meta-item">
                  <span className="produit-meta-label">Livraison</span>
                  <strong>Rapide et securisee</strong>
                </div>
                <div className="produit-meta-item">
                  <span className="produit-meta-label">Reference</span>
                  <strong>{produit._id.slice(-8).toUpperCase()}</strong>
                </div>
                <div className="produit-meta-item">
                  <span className="produit-meta-label">Paiement</span>
                  <strong>100% securise</strong>
                </div>
              </div>

              <div className="produit-actions">
                <button
                  type="button"
                  className="catalogue-btn"
                  onClick={() =>
                    ajouterAuPanier({
                      _id: produit._id,
                      nom: produit.nom,
                      prixUnitaire: produit.prixUnitaire,
                      imageUrl: imagePrincipale || resolveAssetUrl(produit.imageUrl),
                      quantite: produit.quantite,
                    })
                  }
                  disabled={Number(produit.quantite) <= 0}
                >
                  {Number(produit.quantite) <= 0 ? "Rupture de stock" : "Ajouter au panier"}
                </button>
                <Link to="/catalogue" className="catalogue-btn produit-secondary-btn">
                  Retour catalogue
                </Link>
                <Link to="/panier" className="catalogue-btn produit-secondary-btn">
                  Voir panier
                </Link>
              </div>
            </div>

            <section className="produit-avis-section" aria-labelledby="avis-titre">
              <div className="produit-avis-head">
                <h2 id="avis-titre" className="produit-avis-title">
                  Avis clients
                </h2>
                <p className="produit-avis-moyenne">
                  {chargementAvis
                    ? "Chargement des avis…"
                    : blocAvis && blocAvis.nombre > 0
                      ? `Note moyenne : ${blocAvis.moyenne}/5 (${blocAvis.nombre} avis)`
                      : "Pas encore d'avis — partagez votre expérience."}
                </p>
              </div>
              {blocAvis && blocAvis.avis.length > 0 && (
                <ul className="produit-avis-liste">
                  {blocAvis.avis.map((a) => {
                    const n = Math.min(5, Math.max(1, Math.round(Number(a.note) || 0)));
                    return (
                      <li key={a._id} className="produit-avis-carte">
                        <div className="produit-avis-carte-entete">
                          <span className="produit-avis-auteur">{a.auteur}</span>
                          <span className="produit-avis-note" aria-label={`${n} sur 5`}>
                            {"★".repeat(n)}
                            {"☆".repeat(5 - n)}
                          </span>
                          <span className="produit-avis-date">
                            {new Date(a.createdAt).toLocaleDateString("fr-CA", { dateStyle: "medium" })}
                          </span>
                        </div>
                        {a.commentaire ? <p className="produit-avis-texte">{a.commentaire}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
              {utilisateur ? (
                <form className="produit-avis-form" onSubmit={publierAvisFormulaire}>
                  <h3>Donner votre avis</h3>
                  <label htmlFor="avis-note-detail">Note</label>
                  <select
                    id="avis-note-detail"
                    value={noteAvis}
                    onChange={(ev) => setNoteAvis(Number(ev.target.value))}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                  <label htmlFor="avis-texte-detail">Commentaire (optionnel)</label>
                  <textarea
                    id="avis-texte-detail"
                    value={texteAvis}
                    onChange={(ev) => setTexteAvis(ev.target.value)}
                    maxLength={2000}
                    placeholder="Qualité, tenue, emballage…"
                  />
                  {messageAvis && (
                    <p
                      className={`produit-avis-msg ${messageAvis.type === "error" ? "is-error" : "is-ok"}`}
                      role="status"
                    >
                      {messageAvis.texte}
                    </p>
                  )}
                  <button type="submit" className="catalogue-btn" disabled={soumissionAvis}>
                    {soumissionAvis ? "Envoi…" : "Publier mon avis"}
                  </button>
                </form>
              ) : (
                <p className="produit-avis-moyenne">
                  <Link to="/connexion">Connectez-vous</Link> pour laisser un avis sur ce produit.
                </p>
              )}
            </section>
          </section>
        )}

        {!loading && !erreur && produit && (
          <section className="produit-related-section">
            <div className="produit-related-head">
              <h2 className="produit-related-title">Produits de la meme categorie</h2>
              <p className="produit-related-subtitle">
                Decouvrez d&apos;autres articles similaires dans la categorie <strong>{produit.categorie}</strong>.
              </p>
            </div>

            {chargementMemeCategorie ? (
              <p className="produit-state">Chargement des produits similaires...</p>
            ) : produitsMemeCategorie.length === 0 ? (
              <p className="produit-related-empty">Aucun autre produit similaire disponible pour le moment.</p>
            ) : (
              <div className={`catalogue-grid ${produitsMemeCategorie.length < 4 ? "is-short-page" : ""}`}>
                {produitsMemeCategorie.map((item, index) => {
                  const chargementImagePrioritaire = index < NB_VIGNETES_IMAGES_PRIORITAIRES;
                  const urlsCarte = trierUrlsImagesParFiabilite(
                    Array.from(
                      new Set(
                        [...(item.imageUrls || []), item.imageUrl]
                          .filter(Boolean)
                          .map((u) => resolveAssetUrl(String(u)))
                      )
                    )
                  );
                  const ruptureStock = Number(item.quantite) <= 0;
                  return (
                    <article key={item._id} className="catalogue-card">
                      <div className="catalogue-card-image-wrap">
                        {index === 0 && <span className="produit-related-badge">Produit recommandé</span>}
                        {ruptureStock && <span className="stock-out-badge">Rupture de stock</span>}
                        {urlsCarte.length > 0 ? (
                          <ProductImageCascade
                            urls={urlsCarte}
                            preferredIndex={0}
                            alt={item.nom}
                            className="catalogue-card-image"
                            loading={chargementImagePrioritaire ? "eager" : "lazy"}
                            decoding="async"
                            fetchPriority={chargementImagePrioritaire ? "high" : undefined}
                            sizes={SIZES_VIGNETTE_CATALOGUE}
                          />
                        ) : (
                          <div className="catalogue-card-image catalogue-card-image-placeholder" aria-hidden="true" />
                        )}
                      </div>
                      <div className="catalogue-card-content">
                        <p className="catalogue-card-category">{item.categorie}</p>
                        <h3 className="catalogue-card-title">{item.nom}</h3>
                        <p className="catalogue-card-price">
                          <PrixAvecPromo
                            prixUnitaire={item.prixUnitaire}
                            prixBarre={item.prixBarre}
                            variant="card"
                          />
                        </p>
                        <div className="catalogue-actions">
                          <button
                            type="button"
                            className="catalogue-btn"
                            onClick={() =>
                              ajouterAuPanier({
                                _id: item._id,
                                nom: item.nom,
                                prixUnitaire: item.prixUnitaire,
                                imageUrl: urlsCarte[0] || "",
                                quantite: item.quantite,
                              })
                            }
                            disabled={ruptureStock}
                          >
                            {ruptureStock ? "Rupture de stock" : "Ajouter au panier"}
                          </button>
                          <Link
                            to={`/produit/${item._id}`}
                            className="catalogue-btn catalogue-btn-secondary"
                            state={{
                              produit: {
                                _id: item._id,
                                id: item._id,
                                nom: item.nom,
                                description: item.description || "",
                                categorie: item.categorie,
                                prixUnitaire: item.prixUnitaire,
                                quantite: item.quantite,
                                seuilMinimum: item.seuilMinimum,
                                imageUrl: item.imageUrl,
                                imageUrls: item.imageUrls || [],
                              },
                            }}
                          >
                            Voir produit
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

