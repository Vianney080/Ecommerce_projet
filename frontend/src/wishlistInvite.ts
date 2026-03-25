const CLE = "cosmetishop_wishlist_v1";

function lireBrut(): string[] {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return [];
    const parsed = JSON.parse(brut);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function ecrire(ids: string[]) {
  localStorage.setItem(CLE, JSON.stringify(ids));
  window.dispatchEvent(new Event("wishlist-updated"));
}

export function lireListeSouhaits(): string[] {
  return lireBrut();
}

export function estDansListeSouhaits(produitId: string): boolean {
  return lireBrut().includes(produitId);
}

export function basculerListeSouhaits(produitId: string): boolean {
  const courant = lireBrut();
  const idx = courant.indexOf(produitId);
  if (idx >= 0) {
    courant.splice(idx, 1);
    ecrire(courant);
    return false;
  }
  courant.unshift(produitId);
  ecrire(courant);
  return true;
}

export function retirerListeSouhaits(produitId: string) {
  ecrire(lireBrut().filter((id) => id !== produitId));
}

export function nombreListeSouhaits(): number {
  return lireBrut().length;
}
