export type LocationOption = {
  code: string;
  label: string;
};

const REGION_OPTIONS_BY_COUNTRY: Record<string, LocationOption[]> = {
  CA: [
    { code: "AB", label: "Alberta" },
    { code: "BC", label: "Colombie-Britannique" },
    { code: "PE", label: "Ile-du-Prince-Edouard" },
    { code: "MB", label: "Manitoba" },
    { code: "NB", label: "Nouveau-Brunswick" },
    { code: "NS", label: "Nouvelle-Ecosse" },
    { code: "ON", label: "Ontario" },
    { code: "QC", label: "Quebec" },
    { code: "SK", label: "Saskatchewan" },
    { code: "NL", label: "Terre-Neuve-et-Labrador" },
    { code: "NT", label: "Territoires du Nord-Ouest" },
    { code: "NU", label: "Nunavut" },
    { code: "YT", label: "Yukon" },
  ],
  US: [
    { code: "AL", label: "Alabama" },
    { code: "AK", label: "Alaska" },
    { code: "AZ", label: "Arizona" },
    { code: "AR", label: "Arkansas" },
    { code: "CA", label: "California" },
    { code: "CO", label: "Colorado" },
    { code: "CT", label: "Connecticut" },
    { code: "DE", label: "Delaware" },
    { code: "FL", label: "Florida" },
    { code: "GA", label: "Georgia" },
    { code: "HI", label: "Hawaii" },
    { code: "ID", label: "Idaho" },
    { code: "IL", label: "Illinois" },
    { code: "IN", label: "Indiana" },
    { code: "IA", label: "Iowa" },
    { code: "KS", label: "Kansas" },
    { code: "KY", label: "Kentucky" },
    { code: "LA", label: "Louisiana" },
    { code: "ME", label: "Maine" },
    { code: "MD", label: "Maryland" },
    { code: "MA", label: "Massachusetts" },
    { code: "MI", label: "Michigan" },
    { code: "MN", label: "Minnesota" },
    { code: "MS", label: "Mississippi" },
    { code: "MO", label: "Missouri" },
    { code: "MT", label: "Montana" },
    { code: "NE", label: "Nebraska" },
    { code: "NV", label: "Nevada" },
    { code: "NH", label: "New Hampshire" },
    { code: "NJ", label: "New Jersey" },
    { code: "NM", label: "New Mexico" },
    { code: "NY", label: "New York" },
    { code: "NC", label: "North Carolina" },
    { code: "ND", label: "North Dakota" },
    { code: "OH", label: "Ohio" },
    { code: "OK", label: "Oklahoma" },
    { code: "OR", label: "Oregon" },
    { code: "PA", label: "Pennsylvania" },
    { code: "RI", label: "Rhode Island" },
    { code: "SC", label: "South Carolina" },
    { code: "SD", label: "South Dakota" },
    { code: "TN", label: "Tennessee" },
    { code: "TX", label: "Texas" },
    { code: "UT", label: "Utah" },
    { code: "VT", label: "Vermont" },
    { code: "VA", label: "Virginia" },
    { code: "WA", label: "Washington" },
    { code: "WV", label: "West Virginia" },
    { code: "WI", label: "Wisconsin" },
    { code: "WY", label: "Wyoming" },
    { code: "DC", label: "District of Columbia" },
  ],
};

const FALLBACK_COUNTRIES: LocationOption[] = [
  { code: "CA", label: "Canada" },
  { code: "US", label: "Etats-Unis" },
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "MA", label: "Maroc" },
  { code: "DZ", label: "Algerie" },
  { code: "TN", label: "Tunisie" },
  { code: "SN", label: "Senegal" },
  { code: "CI", label: "Cote d'Ivoire" },
];

function normaliserTexte(valeur?: string) {
  return String(valeur || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getCountryOptions(locale: string = "fr-CA"): LocationOption[] {
  if (typeof Intl === "undefined") return FALLBACK_COUNTRIES;
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    const regions = typeof (Intl as any).supportedValuesOf === "function"
      ? ((Intl as any).supportedValuesOf("region") as string[])
      : [];
    const codes = regions.length > 0 ? regions : FALLBACK_COUNTRIES.map((p) => p.code);
    const options = codes
      .map((code) => {
        const label = displayNames.of(code);
        return { code, label: label || code };
      })
      .filter((item) => item.code.length === 2 && item.label && item.label !== item.code)
      .sort((a, b) => a.label.localeCompare(b.label, locale));
    return options.length > 0 ? options : FALLBACK_COUNTRIES;
  } catch {
    return FALLBACK_COUNTRIES;
  }
}

export function getRegionOptions(countryCode?: string): LocationOption[] {
  const code = resolveCountryCode(countryCode);
  return REGION_OPTIONS_BY_COUNTRY[code] || [];
}

export function resolveCountryCode(value?: string, locale: string = "fr-CA"): string {
  const brut = String(value || "").trim();
  if (!brut) return "";
  if (brut.length === 2) return brut.toUpperCase();
  const cible = normaliserTexte(brut);
  const match = getCountryOptions(locale).find((item) => normaliserTexte(item.label) === cible);
  return match?.code || "";
}

export function getCountryLabel(value?: string, locale: string = "fr-CA"): string {
  const code = resolveCountryCode(value, locale);
  if (!code) return "";
  const options = getCountryOptions(locale);
  return options.find((item) => item.code === code)?.label || code;
}
