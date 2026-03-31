import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent
} from "react";
import { useSearchParams } from "react-router-dom";
import { api, resolveAssetUrl } from "../api";
import { AdminLayout } from "../components/AdminLayout";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import "../styles.css";

interface ProduitAdmin {
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
}

interface CategorieAdmin {
  _id: string;
  nom: string;
}

interface ProduitForm {
  nom: string;
  description: string;
  categorie: string;
  quantite: string;
  prixUnitaire: string;
  /** Ancien prix (barré sur le site) ; vide = pas de promo */
  prixBarre: string;
  seuilMinimum: string;
}

interface AdminImagePreview {
  id: string;
  url: string;
  source: "existing" | "new";
  orderToken: string;
  rawPath?: string;
  fileKey?: string;
  /** Fichier local (ajouts multiples cumulables) */
  file?: File;
}

const FORM_INIT: ProduitForm = {
  nom: "",
  description: "",
  categorie: "",
  quantite: "0",
  prixUnitaire: "0",
  prixBarre: "",
  seuilMinimum: "1",
};

export function PageProduitsAdmin() {
  useDocumentTitle("Admin · Produits");
  useMetaDescription("Catalogue administrateur CosmétiShop : ajout, modification, stock et catégories.");
  const [searchParams, setSearchParams] = useSearchParams();
  const [produits, setProduits] = useState<ProduitAdmin[]>([]);
  const [categories, setCategories] = useState<CategorieAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [filtreStockBas, setFiltreStockBas] = useState(searchParams.get("stockBas") === "1");

  const [editionId, setEditionId] = useState<string | null>(null);
  const [form, setForm] = useState<ProduitForm>(FORM_INIT);
  const [imagePreviews, setImagePreviews] = useState<AdminImagePreview[]>([]);
  const [garderImagesExistantes, setGarderImagesExistantes] = useState(true);
  const [dragPreviewId, setDragPreviewId] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const nomsNouveauxFichiers = useMemo(
    () =>
      imagePreviews
        .filter((img): img is AdminImagePreview & { file: File } => img.source === "new" && Boolean(img.file))
        .map((img) => img.file.name),
    [imagePreviews]
  );

  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [categorieEditionId, setCategorieEditionId] = useState<string | null>(null);
  const [categorieEditionNom, setCategorieEditionNom] = useState("");
  const [loadingCategorie, setLoadingCategorie] = useState(false);

  async function chargerDonnees() {
    setLoading(true);
    setErreur(null);
    try {
      const [resProduits, resCategories] = await Promise.all([
        api.get<ProduitAdmin[]>("/produits"),
        api.get<CategorieAdmin[]>("/categories"),
      ]);
      setProduits(resProduits.data);
      setCategories(resCategories.data);
    } catch (err: any) {
      setErreur(err?.response?.data?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    setFiltreStockBas(searchParams.get("stockBas") === "1");
  }, [searchParams]);

  function setChamp<K extends keyof ProduitForm>(champ: K, valeur: ProduitForm[K]) {
    setForm((prev) => ({ ...prev, [champ]: valeur }));
  }

  function cleFichier(fichier: File) {
    return `${fichier.name}-${fichier.size}-${fichier.lastModified}`;
  }

  function construirePreviewsExistantes(produit?: ProduitAdmin | null): AdminImagePreview[] {
    if (!produit) return [];
    const urls = [...(produit.imageUrls || [])]
      .map((u) => String(u || "").trim())
      .filter(Boolean);
    const principal = String(produit.imageUrl || "").trim();
    if (principal && !urls.includes(principal)) {
      urls.unshift(principal);
    }
    const imagesExistantes = Array.from(new Set(urls));

    return imagesExistantes.map((chemin, idx) => ({
      id: `existing-${idx}-${chemin.slice(0, 120)}`,
      url: resolveAssetUrl(chemin),
      source: "existing",
      orderToken: `existing:${chemin}`,
      rawPath: chemin,
    }));
  }

  function resetForm() {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    setEditionId(null);
    setForm(FORM_INIT);
    setImagePreviews([]);
    setGarderImagesExistantes(true);
    setFileInputKey((k) => k + 1);
  }

  function preRemplirEdition(p: ProduitAdmin) {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    setEditionId(p._id);
    setForm({
      nom: p.nom || "",
      description: p.description || "",
      categorie: p.categorie || "",
      quantite: String(p.quantite ?? 0),
      prixUnitaire: String(p.prixUnitaire ?? 0),
      prixBarre:
        p.prixBarre != null && Number(p.prixBarre) > 0 ? String(p.prixBarre) : "",
      seuilMinimum: String(p.seuilMinimum ?? 1),
    });
    setImagePreviews(construirePreviewsExistantes(p));
    setGarderImagesExistantes(true);
    setFileInputKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files || []);
    if (fichiers.length === 0) {
      if (!editionId || !garderImagesExistantes) {
        if (!editionId) setImagePreviews([]);
      }
      return;
    }

    const invalide = fichiers.find((fichier) => {
      const extensionValide = /\.(png|jpe?g|webp)$/i.test(fichier.name);
      const mimeValide =
        fichier.type === "image/png" ||
        fichier.type === "image/jpeg" ||
        fichier.type === "image/webp";
      return !extensionValide || !mimeValide;
    });
    if (invalide) {
      setErreur("Image invalide. Utilisez .png, .jpg, .jpeg ou .webp.");
      return;
    }

    setErreur(null);

    const previewsExistantes =
      editionId && garderImagesExistantes ? imagePreviews.filter((img) => img.source === "existing") : [];
    const dejaNouvelles = imagePreviews.filter((img) => img.source === "new");

    const nouvellesAvecMeta: AdminImagePreview[] = fichiers.map((f, idx) => {
      const url = URL.createObjectURL(f);
      objectUrlsRef.current.push(url);
      const fk = `${cleFichier(f)}-${performance.now()}-${idx}`;
      return {
        id: `new-${fk}`,
        url,
        source: "new",
        orderToken: `new:${fk}`,
        fileKey: fk,
        file: f,
      };
    });

    setImagePreviews([...previewsExistantes, ...dejaNouvelles, ...nouvellesAvecMeta]);
    /* Ne pas vider e.target.value : sinon le navigateur repasse à « Aucun fichier sélectionné »
       alors que les vignettes sont bien ajoutées. Les fichiers sont conservés dans imagePreviews. */
  }

  function supprimerPreviewImage(previewId: string) {
    const cible = imagePreviews.find((img) => img.id === previewId);
    if (!cible) return;

    if (cible.source === "new") {
      if (cible.url.startsWith("blob:")) {
        URL.revokeObjectURL(cible.url);
      }
      objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== cible.url);
    }

    setImagePreviews((prev) => prev.filter((img) => img.id !== previewId));
  }

  function deplacerPreview(sourceId: string, cibleId: string) {
    if (sourceId === cibleId) return;
    setImagePreviews((prev) => {
      const sourceIdx = prev.findIndex((p) => p.id === sourceId);
      const cibleIdx = prev.findIndex((p) => p.id === cibleId);
      if (sourceIdx < 0 || cibleIdx < 0) return prev;
      const copie = [...prev];
      const [item] = copie.splice(sourceIdx, 1);
      copie.splice(cibleIdx, 0, item);
      return copie;
    });
  }

  function onDragStartPreview(e: DragEvent<HTMLDivElement>, previewId: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", previewId);
    setDragPreviewId(previewId);
  }

  function onDropPreview(e: DragEvent<HTMLDivElement>, cibleId: string) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || dragPreviewId;
    if (sourceId) deplacerPreview(sourceId, cibleId);
    setDragPreviewId(null);
  }

  async function enregistrerProduit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setToast(null);

    const nom = form.nom.trim();
    const categorie = form.categorie.trim();
    const description = form.description.trim();
    const quantite = Number(form.quantite);
    const prixUnitaire = Number(form.prixUnitaire);
    const seuilMinimum = Number(form.seuilMinimum);
    if (!nom || !categorie) {
      setErreur("Le nom et la categorie sont obligatoires.");
      return;
    }
    const nbNouvelles = imagePreviews.filter((p) => p.source === "new").length;
    const nbExistantes = imagePreviews.filter((p) => p.source === "existing").length;

    if (!editionId && nbNouvelles === 0) {
      setErreur("Ajoutez au moins une image (.png, .jpg, .jpeg ou .webp).");
      return;
    }
    if (editionId && !garderImagesExistantes && nbNouvelles === 0) {
      setErreur("Ajoutez au moins une image si vous remplacez les images actuelles.");
      return;
    }
    if (editionId && garderImagesExistantes && nbExistantes === 0 && nbNouvelles === 0) {
      setErreur("Conservez ou ajoutez au moins une image.");
      return;
    }
    if (!Number.isFinite(quantite) || quantite < 0) {
      setErreur("Quantite invalide.");
      return;
    }
    if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) {
      setErreur("Prix invalide.");
      return;
    }
    const prixBarreStr = form.prixBarre.trim();
    if (prixBarreStr !== "") {
      const pb = Number(prixBarreStr.replace(",", "."));
      if (!Number.isFinite(pb) || pb < 0) {
        setErreur("Prix barré invalide.");
        return;
      }
      if (pb <= prixUnitaire) {
        setErreur("Le prix barré doit être supérieur au prix de vente pour afficher une réduction.");
        return;
      }
    }
    if (!Number.isFinite(seuilMinimum) || seuilMinimum < 0) {
      setErreur("Seuil minimum invalide.");
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("nom", nom);
      payload.append("description", description);
      payload.append("categorie", categorie);
      payload.append("quantite", String(quantite));
      payload.append("prixUnitaire", String(prixUnitaire));
      payload.append("prixBarre", prixBarreStr);
      payload.append("seuilMinimum", String(seuilMinimum));
      payload.append("garderImagesExistantes", garderImagesExistantes ? "true" : "false");
      const imagesExistantesConservees = imagePreviews
        .filter((img) => img.source === "existing" && img.rawPath)
        .map((img) => img.rawPath as string);
      payload.append("imageUrls", JSON.stringify(imagesExistantesConservees));
      payload.append("imageOrder", JSON.stringify(imagePreviews.map((img) => img.orderToken)));
      const ordreNouvelles = imagePreviews
        .filter((img) => img.source === "new" && img.fileKey)
        .map((img) => img.fileKey as string);
      payload.append("newFileKeys", JSON.stringify(ordreNouvelles));

      const fichiersParCle = new Map<string, File>();
      for (const img of imagePreviews) {
        if (img.source === "new" && img.fileKey && img.file) {
          fichiersParCle.set(img.fileKey, img.file);
        }
      }
      ordreNouvelles.forEach((cle) => {
        const fichier = fichiersParCle.get(cle);
        if (fichier) payload.append("images", fichier);
      });

      if (editionId) {
        await api.put(`/produits/${editionId}/avec-image`, payload);
        setToast("Produit modifie avec succes.");
      } else {
        await api.post("/produits/avec-image", payload);
        setToast("Produit ajoute avec succes.");
      }
      await chargerDonnees();
      resetForm();
    } catch (err: any) {
      setErreur(err?.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function supprimerProduit(id: string, nom: string) {
    const ok = window.confirm(`Supprimer le produit "${nom}" ?`);
    if (!ok) return;
    setErreur(null);
    setToast(null);
    try {
      await api.delete(`/produits/${id}`);
      setToast("Produit supprime.");
      await chargerDonnees();
      if (editionId === id) resetForm();
    } catch (err: any) {
      setErreur(err?.response?.data?.message || "Erreur lors de la suppression.");
    }
  }

  async function ajouterCategorie(e: FormEvent) {
    e.preventDefault();
    const nom = nouvelleCategorie.trim();
    if (!nom) return;
    setLoadingCategorie(true);
    setErreur(null);
    try {
      await api.post("/categories", { nom });
      setNouvelleCategorie("");
      setToast("Categorie ajoutee.");
      await chargerDonnees();
    } catch (err: any) {
      setErreur(err?.response?.data?.message || "Erreur lors de l'ajout de categorie.");
    } finally {
      setLoadingCategorie(false);
    }
  }

  async function sauverCategorie(id: string) {
    const nom = categorieEditionNom.trim();
    if (!nom) return;
    setLoadingCategorie(true);
    setErreur(null);
    try {
      await api.put(`/categories/${id}`, { nom });
      setCategorieEditionId(null);
      setCategorieEditionNom("");
      setToast("Categorie modifiee.");
      await chargerDonnees();
    } catch (err: any) {
      setErreur(err?.response?.data?.message || "Erreur lors de la modification de categorie.");
    } finally {
      setLoadingCategorie(false);
    }
  }

  async function supprimerCategorie(id: string, nom: string) {
    const ok = window.confirm(`Supprimer la categorie "${nom}" ?`);
    if (!ok) return;
    setLoadingCategorie(true);
    setErreur(null);
    try {
      await api.delete(`/categories/${id}`);
      setToast("Categorie supprimee.");
      await chargerDonnees();
    } catch (err: any) {
      setErreur(err?.response?.data?.message || "Erreur lors de la suppression de categorie.");
    } finally {
      setLoadingCategorie(false);
    }
  }

  const produitsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return produits.filter((p) => {
      const stockBas = p.quantite < p.seuilMinimum;
      if (filtreStockBas && !stockBas) return false;
      if (!q) return true;
      const base = `${p.nom} ${p.categorie} ${p.description || ""}`.toLowerCase();
      return base.includes(q);
    });
  }, [produits, recherche, filtreStockBas]);

  return (
    <AdminLayout
      title="Produits & stock"
      subtitle="Création, modification, images, prix, seuils d’alerte et catégories."
      breadcrumb={[
        { label: "Administration", to: "/admin/dashboard" },
        { label: "Produits & stock" },
      ]}
    >
      <div className="admin-dashboard">
        {erreur && <div className="admin-alert admin-alert-error">{erreur}</div>}
        {toast && <div className="admin-alert admin-alert-neutral">{toast}</div>}

        <div className="admin-panels-grid admin-products-grid">
          <section className="admin-panel">
            <p className="admin-panel-title">{editionId ? "Modifier le produit" : "Ajouter un produit"}</p>
            <form className="admin-product-form" onSubmit={enregistrerProduit}>
              <label>
                Nom produit
                <input
                  className="admin-search admin-input"
                  value={form.nom}
                  onChange={(e) => setChamp("nom", e.target.value)}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  className="admin-textarea"
                  value={form.description}
                  onChange={(e) => setChamp("description", e.target.value)}
                  rows={3}
                  placeholder="Description du produit"
                />
              </label>

              <div className="admin-form-row">
                <label>
                  Categorie
                  <input
                    className="admin-search admin-input"
                    list="admin-categories"
                    value={form.categorie}
                    onChange={(e) => setChamp("categorie", e.target.value)}
                    required
                  />
                  <datalist id="admin-categories">
                    {categories.map((c) => (
                      <option key={c._id} value={c.nom} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Prix de vente ($)
                  <input
                    className="admin-search admin-input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.prixUnitaire}
                    onChange={(e) => setChamp("prixUnitaire", e.target.value)}
                    required
                  />
                </label>
              </div>

              <label>
                Prix barré ($) — facultatif
                <input
                  className="admin-search admin-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.prixBarre}
                  onChange={(e) => setChamp("prixBarre", e.target.value)}
                  placeholder="Ancien prix (ex. 34.99), laisser vide si pas de promo"
                />
                <span className="admin-field-hint">
                  Doit être supérieur au prix de vente. Affiché barré sur le site avec le pourcentage
                  économisé.
                </span>
              </label>

              <div className="admin-form-row">
                <label>
                  Stock
                  <input
                    className="admin-search admin-input"
                    type="number"
                    min={0}
                    value={form.quantite}
                    onChange={(e) => setChamp("quantite", e.target.value)}
                    required
                  />
                </label>
                <label>
                  Seuil minimum
                  <input
                    className="admin-search admin-input"
                    type="number"
                    min={0}
                    value={form.seuilMinimum}
                    onChange={(e) => setChamp("seuilMinimum", e.target.value)}
                    required
                  />
                </label>
              </div>

              <label className="admin-file-input-label">
                Images (.png, .jpg, .webp) — en modification, facultatif si vous conservez les vignettes
                <input
                  key={fileInputKey}
                  className="admin-search admin-input admin-file-input-native"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleImageChange}
                />
              </label>
              {nomsNouveauxFichiers.length > 0 && (
                <p className="admin-file-selection-summary" aria-live="polite">
                  <strong>Fichier(s) ajouté(s) :</strong> {nomsNouveauxFichiers.join(" · ")}
                </p>
              )}

              {editionId && (
                <label className="catalogue-checkbox">
                  <input
                    type="checkbox"
                    checked={garderImagesExistantes}
                    onChange={(e) => {
                      const garder = e.target.checked;
                      setGarderImagesExistantes(garder);
                      const newItems = imagePreviews.filter((img) => img.source === "new");
                      if (!garder) {
                        setImagePreviews(newItems);
                        return;
                      }
                      const produitEdition = produits.find((p) => p._id === editionId);
                      const existantes = construirePreviewsExistantes(produitEdition);
                      setImagePreviews([...existantes, ...newItems]);
                    }}
                  />
                  <span>Conserver les images existantes et ajouter les nouvelles</span>
                </label>
              )}

              {imagePreviews.length > 0 && (
                <div className="admin-images-preview-grid">
                  {imagePreviews.map((img, idx) => (
                    <div
                      className={`admin-image-preview-wrap ${dragPreviewId === img.id ? "is-dragging" : ""}`}
                      key={img.id}
                      draggable
                      onDragStart={(e) => onDragStartPreview(e, img.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDropPreview(e, img.id)}
                      onDragEnd={() => setDragPreviewId(null)}
                      title="Glisser-déposer pour réordonner"
                    >
                      <div className="admin-image-preview">
                        <img src={img.url} alt={`${form.nom || "Produit"} ${idx + 1}`} />
                      </div>
                      <button
                        type="button"
                        className="admin-image-remove-btn"
                        onClick={() => supprimerPreviewImage(img.id)}
                        title="Supprimer cette image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="admin-action-row">
                <button className="admin-btn admin-btn-success" type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : editionId ? "Mettre a jour" : "Ajouter le produit"}
                </button>
                {editionId && (
                  <button className="admin-btn" type="button" onClick={resetForm} disabled={saving}>
                    Annuler l'edition
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <p className="admin-panel-title">Gestion des categories</p>
            <form className="admin-action-row admin-category-form" onSubmit={ajouterCategorie}>
              <input
                className="admin-search admin-input"
                value={nouvelleCategorie}
                onChange={(e) => setNouvelleCategorie(e.target.value)}
                placeholder="Nouvelle categorie..."
              />
              <button className="admin-btn" type="submit" disabled={loadingCategorie}>
                Ajouter
              </button>
            </form>
            <ul className="admin-categories-list">
              {categories.map((c) => (
                <li key={c._id}>
                  {categorieEditionId === c._id ? (
                    <div className="admin-action-row">
                      <input
                        className="admin-search admin-input"
                        value={categorieEditionNom}
                        onChange={(e) => setCategorieEditionNom(e.target.value)}
                      />
                      <button type="button" className="admin-btn admin-btn-success" onClick={() => sauverCategorie(c._id)}>
                        Sauver
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          setCategorieEditionId(null);
                          setCategorieEditionNom("");
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="admin-categorie-row">
                      <span>{c.nom}</span>
                      <div className="admin-action-row">
                        <button
                          type="button"
                          className="admin-btn admin-btn-edit"
                          onClick={() => {
                            setCategorieEditionId(c._id);
                            setCategorieEditionNom(c.nom);
                          }}
                        >
                          Modifier
                        </button>
                        <button type="button" className="admin-btn admin-btn-danger" onClick={() => supprimerCategorie(c._id, c.nom)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
              {categories.length === 0 && <li className="admin-empty">Aucune categorie.</li>}
            </ul>
          </section>
        </div>

        <section className="admin-panel">
          <div className="admin-toolbar">
            <input
              className="admin-search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un produit..."
            />
            <label className="catalogue-checkbox">
              <input
                type="checkbox"
                checked={filtreStockBas}
                onChange={(e) => {
                  const actif = e.target.checked;
                  setFiltreStockBas(actif);
                  if (actif) {
                    setSearchParams({ stockBas: "1" });
                  } else {
                    setSearchParams({});
                  }
                }}
              />
              <span>Afficher uniquement stock bas</span>
            </label>
          </div>

          {loading ? (
            <p className="admin-loading">Chargement des produits...</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Nom</th>
                    <th>Categorie</th>
                    <th>Stock</th>
                    <th>Seuil</th>
                    <th>Prix</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {produitsFiltres.map((p) => {
                    const stockBas = p.quantite < p.seuilMinimum;
                    return (
                      <tr key={p._id}>
                        <td>
                          <div className="admin-table-image">
                            {(p.imageUrls?.[0] || p.imageUrl) ? (
                              <img src={resolveAssetUrl(p.imageUrls?.[0] || p.imageUrl)} alt={p.nom} />
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong>{p.nom}</strong>
                          {p.description && <p className="admin-table-muted">{p.description}</p>}
                        </td>
                        <td>{p.categorie}</td>
                        <td>
                          <span className={stockBas ? "admin-stat-value-danger" : ""}>{p.quantite}</span>
                        </td>
                        <td>{p.seuilMinimum}</td>
                        <td>
                          {p.prixBarre != null && Number(p.prixBarre) > Number(p.prixUnitaire) ? (
                            <span className="admin-price-promo">
                              <span className="admin-price-was">{Number(p.prixBarre).toFixed(2)} $</span>{" "}
                              <strong>{Number(p.prixUnitaire || 0).toFixed(2)} $</strong>
                            </span>
                          ) : (
                            `${Number(p.prixUnitaire || 0).toFixed(2)} $`
                          )}
                        </td>
                        <td>
                          <div className="admin-action-row">
                            <button type="button" className="admin-btn admin-btn-edit" onClick={() => preRemplirEdition(p)}>
                              Modifier
                            </button>
                            <button type="button" className="admin-btn admin-btn-danger" onClick={() => supprimerProduit(p._id, p.nom)}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {produitsFiltres.length === 0 && (
                    <tr>
                      <td className="admin-empty" colSpan={7}>
                        Aucun produit trouve.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
