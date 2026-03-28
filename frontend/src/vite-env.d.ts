/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Domaine Plausible (sans https), ex. cosmetishop.vercel.app */
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  /** ID de mesure GA4, ex. G-XXXXXXXXXX */
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
