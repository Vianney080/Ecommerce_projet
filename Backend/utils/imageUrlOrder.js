/**
 * Cloudinary d’abord, puis photos /uploads/ (catalogue réel), puis autres https.
 */
function scoreUrlImageStable(url) {
  const u = String(url || "").toLowerCase().trim();
  if (u.includes("res.cloudinary.com")) return 40;
  if (u.includes("cloudinary.com")) return 35;
  try {
    const abs = u.startsWith("//") ? `https:${u}` : u;
    const parsed = new URL(abs);
    if (String(parsed.pathname).toLowerCase().includes("/uploads/")) return 32;
  } catch {
    /* ignore */
  }
  if (u.startsWith("https://")) return 20;
  if (u.startsWith("http://")) return 15;
  if (u.startsWith("/uploads/")) return 32;
  return 0;
}

function ordonnerUrlsImagesParFiabilite(liste) {
  const uniques = Array.from(new Set((liste || []).map((x) => String(x || "").trim()).filter(Boolean)));
  return [...uniques].sort((a, b) => scoreUrlImageStable(b) - scoreUrlImageStable(a));
}

module.exports = { scoreUrlImageStable, ordonnerUrlsImagesParFiabilite };
