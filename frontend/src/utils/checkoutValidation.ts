/** Saisie nom / prénom : lettres (accents), espaces, tiret, apostrophe — pas de chiffres. */
export function filtrerNomPropre(valeur: string): string {
  return valeur.replace(/[^\p{L}\s'-]/gu, "");
}

/** Ville : lettres, espaces, tirets — pas de chiffres. */
export function filtrerVille(valeur: string): string {
  return valeur.replace(/[^\p{L}\s'-]/gu, "");
}

export type ChampsAdresseErreurs = Partial<
  Record<"nomComplet" | "rue" | "ville" | "province" | "codePostal" | "pays" | "telephone", string>
>;

export function validerNomCompletOuTitulaire(v: string): string | null {
  const t = v.trim().replace(/\s+/g, " ");
  if (!t) return "Ce champ est obligatoire.";
  if (/\d/.test(t)) {
    return "N’utilisez pas de chiffres. Lettres, espaces et tirets uniquement (ex. Marie-Claire Tremblay).";
  }
  if (!/^[\p{L}\s'-]{2,80}$/u.test(t)) {
    return "Caractères non autorisés. Utilisez des lettres, espaces, tirets (-) ou apostrophes (ex. O’Brien).";
  }
  const mots = t.split(/\s+/).filter(Boolean);
  if (mots.length < 2) {
    return "Indiquez au minimum le prénom et le nom, séparés par un espace (ex. Sophie Gagnon).";
  }
  return null;
}

export function validerRue(v: string): string | null {
  const t = v.trim();
  if (!t) return "Le numéro et le nom de rue sont obligatoires.";
  if (t.length < 4) return "L’adresse semble incomplète (numéro et rue).";
  if (t.length > 120) return "L’adresse est trop longue (120 caractères maximum).";
  return null;
}

export function validerVille(v: string): string | null {
  const t = v.trim().replace(/\s+/g, " ");
  if (!t) return "La ville est obligatoire.";
  if (/\d/.test(t)) return "La ville ne doit pas contenir de chiffres.";
  if (!/^[\p{L}\s'-]{2,60}$/u.test(t)) {
    return "Utilisez uniquement des lettres, espaces ou tirets pour la ville (ex. Saint-Jean-sur-Richelieu).";
  }
  return null;
}

export function validerCodePostal(pays: string, code: string): string | null {
  const t = code.trim();
  if (!t) return "Le code postal est obligatoire.";
  if (pays === "CA") {
    const n = t.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(n)) {
      return "Code postal canadien invalide. Format : A1A 1A1 (ex. H3Z 2Y7).";
    }
  } else if (t.length < 4 || t.length > 12) {
    return "Indiquez un code postal valide (4 à 12 caractères).";
  }
  return null;
}

export function validerProvinceSiRequise(provinceObligatoire: boolean, province: string): string | null {
  if (!provinceObligatoire) return null;
  if (!province.trim()) return "Sélectionnez une province ou un État pour ce pays.";
  return null;
}

export function validerPays(pays: string): string | null {
  if (!pays.trim()) return "Sélectionnez un pays.";
  return null;
}

export function validerTelephoneOptionnel(telephone: string): string | null {
  const t = telephone.trim();
  if (!t) return null;
  const chiffres = t.replace(/\D/g, "");
  if (chiffres.length < 10) return "Le numéro de téléphone doit contenir au moins 10 chiffres.";
  if (t.length > 25) return "Le numéro est trop long.";
  return null;
}

export function validerFormulaireAdresse(
  adresse: {
    nomComplet: string;
    rue: string;
    ville: string;
    province: string;
    codePostal: string;
    pays: string;
    telephone: string;
  },
  provinceObligatoire: boolean
): ChampsAdresseErreurs {
  const e: ChampsAdresseErreurs = {};
  const n = validerNomCompletOuTitulaire(adresse.nomComplet);
  if (n) e.nomComplet = n;
  const r = validerRue(adresse.rue);
  if (r) e.rue = r;
  const v = validerVille(adresse.ville);
  if (v) e.ville = v;
  const cp = validerCodePostal(adresse.pays, adresse.codePostal);
  if (cp) e.codePostal = cp;
  const py = validerPays(adresse.pays);
  if (py) e.pays = py;
  const pr = validerProvinceSiRequise(provinceObligatoire, adresse.province);
  if (pr) e.province = pr;
  const tel = validerTelephoneOptionnel(adresse.telephone);
  if (tel) e.telephone = tel;
  return e;
}

export type ErreursPaiementCarte = Partial<
  Record<"nomCarte" | "numeroCarte" | "expiration" | "cvv", string>
>;

export function validerTitulaireCarte(v: string): string | null {
  return validerNomCompletOuTitulaire(v);
}

export function validerNumeroCarte(numeroNettoye: string): string | null {
  if (!/^\d{16}$/.test(numeroNettoye)) {
    return "Le numéro de carte doit comporter exactement 16 chiffres (sans espaces).";
  }
  return null;
}

/** MM/AA non expiré par rapport à la date actuelle. */
export function expirationCarteValide(mmAa: string): boolean {
  const match = mmAa.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const mois = Number(match[1]);
  const annee2 = Number(match[2]);
  if (mois < 1 || mois > 12) return false;
  const annee = 2000 + annee2;
  const maintenant = new Date();
  const moisActuel = maintenant.getMonth() + 1;
  const anneeActuelle = maintenant.getFullYear();
  if (annee < anneeActuelle) return false;
  if (annee === anneeActuelle && mois < moisActuel) return false;
  return true;
}

export function validerExpiration(mmAa: string): string | null {
  if (!/^\d{2}\/\d{2}$/.test(mmAa)) {
    return "Date d’expiration invalide. Utilisez le format MM/AA (ex. 09/28).";
  }
  if (!expirationCarteValide(mmAa)) {
    return "La carte est expirée ou la date n’est pas valide.";
  }
  return null;
}

export function validerCvv(cvv: string): string | null {
  if (!/^\d{3,4}$/.test(cvv)) {
    return "Le CVV comporte 3 ou 4 chiffres (au dos de la carte).";
  }
  return null;
}
