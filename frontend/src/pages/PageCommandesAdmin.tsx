import { useCallback, useEffect, useRef, useState } from "react";
import { api, API_ORIGIN } from "../api";
import { AdminLayout } from "../components/AdminLayout";
import { useDocumentTitle, useMetaDescription } from "../hooks/useDocumentTitle";
import { googleMapsSearchUrlFromAdresse } from "../utils/googleMapsUrl";
import "../styles.css";

interface UtilisateurLite {
  nom?: string;
  email?: string;
}

interface ItemCommande {
  produitId?: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
}

interface CommandeAdmin {
  _id: string;
  statut: "en_attente" | "payee" | "livree" | "annulee" | string;
  statutPaiement?: "en_attente" | "paye" | "echoue" | "rembourse" | string;
  numeroFacture?: string;
  numeroSuiviLivraison?: string;
  total: number;
  createdAt: string;
  utilisateurId?: UtilisateurLite;
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

export function PageCommandesAdmin() {
  useDocumentTitle("Admin · Commandes");
  useMetaDescription("Gestion des commandes CosmétiShop : statuts, paiements et adresses de livraison.");
  const [commandes, setCommandes] = useState<CommandeAdmin[]>([]);
  const [statutsEdition, setStatutsEdition] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copieAdresseId, setCopieAdresseId] = useState<string | null>(null);
  const [imagesParIdProduit, setImagesParIdProduit] = useState<Record<string, string>>({});
  const [imagesParNomProduit, setImagesParNomProduit] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<{ url: string; alt: string } | null>(null);
  const [nouvellesCommandes, setNouvellesCommandes] = useState(0);
  const commandesConnuesRef = useRef<Set<string>>(new Set());
  const initialisationRef = useRef(false);
  const [suiviTexte, setSuiviTexte] = useState<Record<string, string>>({});
  const suiviServeurRef = useRef<Record<string, string>>({});
  const [loadingSuiviId, setLoadingSuiviId] = useState<string | null>(null);

  const charger = useCallback(async (options?: { silencieux?: boolean }) => {
    const silencieux = options?.silencieux ?? false;
    if (!silencieux) {
      setLoading(true);
      setErreur(null);
    }
    try {
      const res = await api.get<CommandeAdmin[]>("/commandes");
      setCommandes(res.data);
      const map: Record<string, string> = {};
      res.data.forEach((c) => {
        map[c._id] = c.statut;
      });
      setStatutsEdition(map);

      const idsActuels = new Set(res.data.map((c) => c._id));
      if (initialisationRef.current) {
        let diff = 0;
        idsActuels.forEach((id) => {
          if (!commandesConnuesRef.current.has(id)) diff += 1;
        });
        if (diff > 0) {
          setNouvellesCommandes((valeur) => valeur + diff);
          setMessage(`${diff} nouvelle(s) commande(s) reçue(s).`);
        }
      } else {
        initialisationRef.current = true;
      }
      commandesConnuesRef.current = idsActuels;
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors du chargement des commandes admin";
      setErreur(msg);
    } finally {
      if (!silencieux) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setSuiviTexte((prev) => {
      const next = { ...prev };
      for (const c of commandes) {
        const s = c.numeroSuiviLivraison || "";
        const ancienServeur = suiviServeurRef.current[c._id];
        const courant = prev[c._id];
        if (courant === undefined || courant === ancienServeur) {
          next[c._id] = s;
        }
        suiviServeurRef.current[c._id] = s;
      }
      return next;
    });
  }, [commandes]);

  useEffect(() => {
    charger();
    const intervalId = window.setInterval(() => {
      charger({ silencieux: true });
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [charger]);

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

  async function mettreAJourStatut(commandeId: string) {
    const statut = statutsEdition[commandeId];
    if (!statut) return;

    setLoadingId(commandeId);
    setMessage(null);
    try {
      const res = await api.patch("/commandes/" + commandeId + "/statut", { statut });
      setMessage(res.data?.message || "Statut de commande mis a jour");
      await charger();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la mise a jour du statut";
      setMessage(msg);
    } finally {
      setLoadingId(null);
    }
  }

  async function enregistrerSuivi(commandeId: string) {
    const texte = (suiviTexte[commandeId] ?? "").trim();
    setLoadingSuiviId(commandeId);
    setMessage(null);
    try {
      const res = await api.patch(`/commandes/${commandeId}/suivi-livraison`, {
        numeroSuiviLivraison: texte,
      });
      setMessage(res.data?.message || "Suivi enregistré");
      suiviServeurRef.current[commandeId] = texte;
      setSuiviTexte((prev) => ({ ...prev, [commandeId]: texte }));
      await charger();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Erreur lors de l'enregistrement du suivi");
    } finally {
      setLoadingSuiviId(null);
    }
  }

  async function copierAdresse(c: CommandeAdmin) {
    const lignes: string[] = [];
    const adr = c.adresseLivraison;
    if (adr?.nomComplet) lignes.push(adr.nomComplet);
    if (adr?.telephone) lignes.push(`Tel: ${adr.telephone}`);
    if (adr?.rue) lignes.push(adr.rue);

    const villeBloc = [adr?.ville, adr?.province, adr?.codePostal].filter(Boolean).join(", ");
    if (villeBloc) lignes.push(villeBloc);
    if (adr?.pays) lignes.push(adr.pays);

    if (lignes.length === 0) {
      setMessage("Aucune adresse disponible pour cette commande");
      return;
    }

    try {
      await navigator.clipboard.writeText(lignes.join("\n"));
      setCopieAdresseId(c._id);
      setMessage("Adresse copiée dans le presse-papiers");
      window.setTimeout(() => setCopieAdresseId((id) => (id === c._id ? null : id)), 1800);
    } catch {
      setMessage("Impossible de copier l'adresse");
    }
  }

  const headerExtra = (
    <button
      type="button"
      className="admin-topbar-refresh-btn"
      onClick={() => {
        setNouvellesCommandes(0);
        charger();
      }}
    >
      Actualiser la liste
    </button>
  );

  return (
    <>
      <AdminLayout
        title="Commandes"
        subtitle="Statuts de commande, paiements, adresses et numéros de suivi."
        navBadgeCommandes={nouvellesCommandes}
        headerExtra={headerExtra}
      >
        <div className="admin-commandes-wrap">
          {nouvellesCommandes > 0 && (
            <div className="orders-alert orders-alert-info" role="status">
              <strong>Nouvelles commandes :</strong> {nouvellesCommandes} depuis votre dernière consultation — pensez à
              traiter les dossiers en attente.
            </div>
          )}

          {erreur && <div className="orders-alert orders-alert-error">{erreur}</div>}
          {message && <div className="orders-alert orders-alert-info">{message}</div>}

          {loading ? (
            <p className="orders-empty">Chargement des commandes...</p>
          ) : commandes.length === 0 ? (
            <p className="orders-empty">Aucune commande enregistree.</p>
          ) : (
            <div className="orders-list">
            {commandes.map((c) => (
              <article key={c._id} className="orders-card">
                <div className="orders-card-head">
                  <div>
                    <p className="orders-card-id">Commande #{c._id.slice(-6).toUpperCase()}</p>
                    <p className="orders-card-date">{new Date(c.createdAt).toLocaleString()}</p>
                    <p className="orders-card-date">Facture: {(c.numeroFacture || "N/A").toUpperCase()}</p>
                    <p className="orders-card-date">
                      Client: {c.utilisateurId?.nom || c.utilisateurId?.email || "Utilisateur"}
                    </p>
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

                {(() => {
                  const urlMaps = googleMapsSearchUrlFromAdresse(c.adresseLivraison);
                  const contenuAdresse = (
                    <>
                      <p className="orders-address-title">Adresse de livraison</p>
                      {urlMaps ? (
                        <p className="orders-address-maps-hint">
                          <span className="orders-maps-hint-icon" aria-hidden>
                            📍
                          </span>
                          <span>
                            <span className="orders-maps-hint-action">Ouvrir dans Google Maps</span>
                            <span className="orders-maps-hint-detail"> — cliquez n&apos;importe où dans ce cadre</span>
                          </span>
                        </p>
                      ) : null}
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
                    </>
                  );
                  return urlMaps ? (
                    <a
                      href={urlMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="orders-address orders-address--link-maps"
                      aria-label="Ouvrir cette adresse dans Google Maps (nouvel onglet)"
                    >
                      {contenuAdresse}
                    </a>
                  ) : (
                    <div className="orders-address">{contenuAdresse}</div>
                  );
                })()}

                <div className="admin-suivi-row">
                  <div style={{ flex: "1 1 14rem", minWidth: "10rem" }}>
                    <label className="admin-suivi-label" htmlFor={`suivi-${c._id}`}>
                      N° ou lien de suivi livraison (affiché au client)
                    </label>
                    <input
                      id={`suivi-${c._id}`}
                      className="admin-suivi-input"
                      value={suiviTexte[c._id] ?? ""}
                      onChange={(e) => setSuiviTexte((p) => ({ ...p, [c._id]: e.target.value }))}
                      placeholder="Ex. 1Z999… ou https://transporteur.com/…"
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={loadingSuiviId === c._id}
                    onClick={() => enregistrerSuivi(c._id)}
                  >
                    {loadingSuiviId === c._id ? "…" : "Enregistrer suivi"}
                  </button>
                </div>

                <div className="orders-admin-row">
                  <p className="orders-total">Total: {c.total.toFixed(2)} $</p>
                  <div className="orders-admin-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => copierAdresse(c)}
                    >
                      {copieAdresseId === c._id ? "Adresse copiée" : "Copier adresse"}
                    </button>
                    <select
                      value={statutsEdition[c._id] || c.statut}
                      onChange={(e) =>
                        setStatutsEdition((prev) => ({ ...prev, [c._id]: e.target.value }))
                      }
                      className="admin-select"
                    >
                      <option value="en_attente">En attente</option>
                      <option value="payee">Payee</option>
                      <option value="livree">Livree</option>
                      <option value="annulee">Annulee</option>
                    </select>
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => mettreAJourStatut(c._id)}
                      disabled={loadingId === c._id || (statutsEdition[c._id] || c.statut) === c.statut}
                    >
                      {loadingId === c._id ? "Maj..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
            </div>
          )}
        </div>
      </AdminLayout>

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
    </>
  );
}

