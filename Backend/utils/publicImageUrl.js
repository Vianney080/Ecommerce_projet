/**
 * Assure que les chemins /uploads/... renvoient vers le bon hôte (Render, etc.)
 * quand le frontend résout les images.
 */
function basePubliqueDepuisEnv() {
  const brut =
    process.env.PUBLIC_API_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BASE_URL ||
    "";
  return String(brut).trim().replace(/\/+$/, "");
}

function basePubliqueDepuisReq(req) {
  const depuisEnv = basePubliqueDepuisEnv();
  if (depuisEnv) return depuisEnv;
  if (!req || !req.get) return "";
  const proto = String(req.get("x-forwarded-proto") || "https").split(",")[0].trim() || "https";
  const host = String(req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

function absoluImage(chemin, base) {
  let s = String(chemin || "").trim();
  if (!s) return s;
  if (s.startsWith("//")) s = `https:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  const b = String(base || "").replace(/\/+$/, "");
  if (!b) return s;
  if (s.startsWith("/")) return `${b}${s}`;
  return `${b}/${s}`;
}

function produitImagesAbsolues(produit, base) {
  const b = base || basePubliqueDepuisEnv();
  const o =
    produit && typeof produit.toObject === "function"
      ? produit.toObject()
      : produit && typeof produit === "object"
        ? { ...produit }
        : null;
  if (!o) return produit;
  if (o.imageUrl) o.imageUrl = absoluImage(o.imageUrl, b);
  if (Array.isArray(o.imageUrls)) o.imageUrls = o.imageUrls.map((u) => absoluImage(u, b));
  return o;
}

module.exports = {
  basePubliqueDepuisEnv,
  basePubliqueDepuisReq,
  absoluImage,
  produitImagesAbsolues
};
