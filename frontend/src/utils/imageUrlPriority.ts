/** Plus la note est haute, plus l’URL est considérée comme stable (Cloudinary > https > /uploads/). */
function scoreUrlFiabilite(url: string): number {
  const u = url.toLowerCase();
  if (u.includes("res.cloudinary.com")) return 40;
  if (u.includes("cloudinary.com")) return 35;
  if (u.startsWith("https://")) return 20;
  if (u.startsWith("http://")) return 15;
  if (u.startsWith("/uploads/")) return 5;
  return 0;
}

/** Déduplique et met les URLs les plus fiables en premier (évite d’afficher en premier un /uploads/ 404). */
export function trierUrlsImagesParFiabilite(urls: string[]): string[] {
  const uniques = Array.from(new Set(urls.map((u) => String(u || "").trim()).filter(Boolean)));
  return [...uniques].sort((a, b) => scoreUrlFiabilite(b) - scoreUrlFiabilite(a));
}
