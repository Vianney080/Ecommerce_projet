import type { AxiosInstance } from "axios";

/** Marqueur localStorage : fusionner le panier invité au backend après connexion (parcours panier / paiement). */
export const CLE_TRANSFERT_PANIER_INVITE = "cosmetishop_panier_invite_transfer";

export type ItemPanierInvite = {
  produitId: string;
  nomProduit: string;
  prixUnitaire: number;
  quantite: number;
  imageUrl?: string;
};

const PANIER_INVITE_KEY = "cosmetishop_panier_invite_v1";
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function estMongoObjectId(valeur: string) {
  return MONGO_OBJECT_ID_REGEX.test(valeur);
}

function normaliserItems(payload: unknown): ItemPanierInvite[] {
  if (!Array.isArray(payload)) return [];
  const resultat: ItemPanierInvite[] = [];
  for (const it of payload) {
    const produitId = typeof it?.produitId === "string" ? it.produitId : "";
    const nomProduit = typeof it?.nomProduit === "string" ? it.nomProduit : "";
    const prixUnitaire = Number(it?.prixUnitaire);
    const quantite = Number(it?.quantite);
    const imageUrl = typeof it?.imageUrl === "string" ? it.imageUrl : undefined;

    if (!produitId || !nomProduit || !Number.isFinite(prixUnitaire) || !Number.isFinite(quantite)) {
      continue;
    }
    if (quantite < 1 || prixUnitaire < 0) continue;

    resultat.push({ produitId, nomProduit, prixUnitaire, quantite, imageUrl });
  }
  return resultat;
}

export function lirePanierInvite(): ItemPanierInvite[] {
  try {
    const brut = localStorage.getItem(PANIER_INVITE_KEY);
    if (!brut) return [];
    return normaliserItems(JSON.parse(brut));
  } catch {
    return [];
  }
}

export function enregistrerPanierInvite(items: ItemPanierInvite[]) {
  localStorage.setItem(PANIER_INVITE_KEY, JSON.stringify(items));
}

export function ajouterAuPanierInvite(
  item: Omit<ItemPanierInvite, "quantite">,
  quantite = 1,
  maxQuantite?: number
) {
  const qte = Number(quantite);
  if (!Number.isFinite(qte) || qte < 1) return false;
  const max = Number(maxQuantite);
  const limiteActive = Number.isFinite(max) && max >= 0;

  const courant = lirePanierInvite();
  const index = courant.findIndex((it) => it.produitId === item.produitId);
  if (index >= 0) {
    const quantiteCible = courant[index].quantite + qte;
    if (limiteActive && quantiteCible > max) return false;
    courant[index].quantite = quantiteCible;
  } else {
    if (limiteActive && qte > max) return false;
    courant.push({ ...item, quantite: qte });
  }
  enregistrerPanierInvite(courant);
  return true;
}

export function modifierQuantitePanierInvite(produitId: string, quantite: number, maxQuantite?: number) {
  const qte = Number(quantite);
  if (!Number.isFinite(qte) || qte < 1) return false;
  const max = Number(maxQuantite);
  if (Number.isFinite(max) && max >= 0 && qte > max) return false;

  const courant = lirePanierInvite();
  const suivant = courant.map((it) => (it.produitId === produitId ? { ...it, quantite: qte } : it));
  enregistrerPanierInvite(suivant);
  return true;
}

export function supprimerDuPanierInvite(produitId: string) {
  const courant = lirePanierInvite();
  enregistrerPanierInvite(courant.filter((it) => it.produitId !== produitId));
}

export function viderPanierInvite() {
  enregistrerPanierInvite([]);
}

export function totalPanierInvite(items = lirePanierInvite()) {
  return items.reduce((acc, it) => acc + it.prixUnitaire * it.quantite, 0);
}

export async function fusionnerPanierInviteVersBackend(api: AxiosInstance) {
  const items = lirePanierInvite();
  if (items.length === 0) return;

  const itemsValides = items.filter((it) => estMongoObjectId(it.produitId));
  const itemsInvalides = items.length - itemsValides.length;

  let fusionnes = 0;
  const nonFusionnes: ItemPanierInvite[] = [];

  if (itemsInvalides > 0) {
    // On écarte les anciens ids invalides pour éviter les erreurs 400 répétées.
    enregistrerPanierInvite(itemsValides);
  }

  for (const item of itemsValides) {
    try {
      await api.post("/panier/ajouter", { produitId: item.produitId, quantite: item.quantite });
      fusionnes += 1;
    } catch {
      nonFusionnes.push(item);
    }
  }

  if (nonFusionnes.length === 0) {
    viderPanierInvite();
    return;
  }

  // Conserve uniquement les items non fusionnés (ex: problème réseau temporaire).
  enregistrerPanierInvite(nonFusionnes);
}
