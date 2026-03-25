import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_ORIGIN } from "../api";
import { useAuth } from "../AuthContext";
import { Breadcrumb } from "../components/Breadcrumb";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import { lireListeSouhaits, retirerListeSouhaits } from "../wishlistInvite";
import "../styles.css";

type ProduitApi = {
  _id: string;
  nom: string;
  categorie: string;
  prixUnitaire: number;
  quantite: number;
  imageUrl?: string;
  imageUrls?: string[];
};

function imageUrl(img?: string) {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://")) return img;
  if (img.startsWith("/")) return `${API_ORIGIN}${img}`;
  return `${API_ORIGIN}/${img}`;
}

export function PageListeSouhaits() {
  const { utilisateur } = useAuth();
  const [produits, setProduits] = useState<ProduitApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useDocumentTitle("Liste d'envies");
  useMetaDescription("Vos produits favoris CosmétiShop — ajoutez-les au panier quand vous voulez.");

  useEffect(() => {
    const h = () => setTick((n) => n + 1);
    window.addEventListener("wishlist-updated", h);
    return () => window.removeEventListener("wishlist-updated", h);
  }, []);

  useEffect(() => {
    let annule = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<ProduitApi[]>("/produits");
        if (annule) return;
        const setIds = new Set(lireListeSouhaits());
        const filtres = (res.data || []).filter((p) => setIds.has(p._id));
        setProduits(filtres);
      } catch {
        if (!annule) setProduits([]);
      } finally {
        if (!annule) setLoading(false);
      }
    }
    load();
    return () => {
      annule = true;
    };
  }, [tick]);

  return (
    <div className="catalogue-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <Link to="/" className="nav-logo" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="nav-logo-icon">💄</span>
              <div className="nav-logo-text">
                <span className="nav-logo-title">CosmétiShop</span>
                <span className="nav-logo-subtitle">Liste d&apos;envies</span>
              </div>
            </Link>
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
            {utilisateur && (
              <Link to="/commandes" className="nav-link">
                Commandes
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="catalogue-shell">
        <div className="breadcrumb-wrap">
          <Breadcrumb
            items={[
              { label: "Accueil", to: "/" },
              { label: "Liste d'envies" },
            ]}
          />
        </div>

        <header className="catalogue-hero">
          <div>
            <p className="catalogue-kicker">Favoris</p>
            <h1 className="catalogue-title">Liste d&apos;envies</h1>
            <p className="catalogue-subtitle">
              Produits sauvegardés sur cet appareil. Connectez-vous pour une expérience complète sur tous vos appareils
              (bientôt).
            </p>
          </div>
        </header>

        {loading ? (
          <p className="catalogue-state">Chargement...</p>
        ) : produits.length === 0 ? (
          <div className="panier-empty" style={{ marginTop: "1rem" }}>
            <p>Votre liste d&apos;envies est vide.</p>
            <Link to="/catalogue" className="panier-btn panier-btn-primary">
              Parcourir le catalogue
            </Link>
          </div>
        ) : (
          <section className="catalogue-grid">
            {produits.map((p) => {
              const src = imageUrl(p.imageUrls?.[0] || p.imageUrl);
              return (
                <article key={p._id} className="catalogue-card">
                  <div className="catalogue-card-image-wrap">
                    {src ? (
                      <img src={src} alt="" className="catalogue-card-image" loading="lazy" decoding="async" />
                    ) : (
                      <div className="catalogue-card-image catalogue-card-image-placeholder" />
                    )}
                  </div>
                  <div className="catalogue-card-content">
                    <p className="catalogue-card-category">{p.categorie}</p>
                    <h2 className="catalogue-card-title">{p.nom}</h2>
                    <p className="catalogue-card-price">{p.prixUnitaire.toFixed(2)} $</p>
                    <div className="catalogue-actions">
                      <Link
                        to={`/produit/${p._id}`}
                        state={{ produit: p }}
                        className="catalogue-btn"
                      >
                        Voir le produit
                      </Link>
                      <button
                        type="button"
                        className="catalogue-btn catalogue-btn-secondary"
                        onClick={() => retirerListeSouhaits(p._id)}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
