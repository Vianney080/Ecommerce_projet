/** Événement global pour resynchroniser le mini-panier (ClientNav) après toute mutation. */
export const PANIER_CHANGE_EVENT = "cosmetishop-panier-change";

export function notifierChangementPanier() {
  window.dispatchEvent(new CustomEvent(PANIER_CHANGE_EVENT));
}
