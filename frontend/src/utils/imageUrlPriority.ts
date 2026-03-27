import { API_ORIGIN } from "../api";

/** Premières vignettes grille (accueil, catalogue…) : pas de lazy pour rivaliser avec le hero sur mobile. */
export const NB_VIGNETES_IMAGES_PRIORITAIRES = 6;

let origineApiNormalisee = "";
try {
  origineApiNormalisee = new URL(API_ORIGIN).origin.toLowerCase();
} catch {
  origineApiNormalisee = "";
}

/** Plus la note est haute, plus l’URL est prioritaire pour l’affichage (Cloudinary > photos API /uploads/ > autres https). */
function scoreUrlFiabilite(url: string): number {
  const u = url.toLowerCase().trim();
  if (u.includes("res.cloudinary.com")) return 40;
  if (u.includes("cloudinary.com")) return 35;

  try {
    const abs = u.startsWith("//") ? `https:${u}` : u;
    const parsed = new URL(abs);
    const path = parsed.pathname.toLowerCase();
    if (path.includes("/uploads/")) return 32;
    if (origineApiNormalisee && parsed.origin === origineApiNormalisee) return 31;
  } catch {
    /* URL relative ou invalide */
  }

  if (u.startsWith("https://")) return 20;
  if (u.startsWith("http://")) return 15;
  if (u.startsWith("/uploads/")) return 32;
  return 0;
}

/** Déduplique et ordonne : CDN connu, puis images servies par notre API, puis autres URLs. */
export function trierUrlsImagesParFiabilite(urls: string[]): string[] {
  const uniques = Array.from(new Set(urls.map((u) => String(u || "").trim()).filter(Boolean)));
  return [...uniques].sort((a, b) => scoreUrlFiabilite(b) - scoreUrlFiabilite(a));
}
