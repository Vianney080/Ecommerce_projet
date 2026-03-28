/** Champs utiles pour la recherche Google Maps (géocodage). */
export type AdressePourCarte = {
  nomComplet?: string;
  rue?: string;
  ville?: string;
  province?: string;
  codePostal?: string;
  pays?: string;
};

/**
 * URL de recherche Google Maps (fonctionne sur mobile et bureau, ouvre l’app Maps si installée).
 * Retourne null s’il n’y a pas assez d’information pour une recherche.
 */
export function googleMapsSearchUrlFromAdresse(adr: AdressePourCarte | null | undefined): string | null {
  if (!adr) return null;
  const rue = String(adr.rue || "").trim();
  const nom = String(adr.nomComplet || "").trim();
  const ligneRue = rue || nom;
  const villeBloc = [adr.ville, adr.province, adr.codePostal].filter(Boolean).join(", ").trim();
  const pays = String(adr.pays || "").trim();
  const parts = [ligneRue, villeBloc, pays].filter(Boolean);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}
