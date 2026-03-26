/**
 * Priorise les URLs stables (Cloudinary, HTTPS) avant /uploads/ (souvent ephemere sur Render).
 */
function scoreUrlImageStable(url) {
  const u = String(url || "").toLowerCase();
  if (u.includes("res.cloudinary.com")) return 40;
  if (u.includes("cloudinary.com")) return 35;
  if (u.startsWith("https://")) return 20;
  if (u.startsWith("http://")) return 15;
  if (u.startsWith("/uploads/")) return 5;
  return 0;
}

function ordonnerUrlsImagesParFiabilite(liste) {
  const uniques = Array.from(new Set((liste || []).map((x) => String(x || "").trim()).filter(Boolean)));
  return [...uniques].sort((a, b) => scoreUrlImageStable(b) - scoreUrlImageStable(a));
}

module.exports = { scoreUrlImageStable, ordonnerUrlsImagesParFiabilite };
