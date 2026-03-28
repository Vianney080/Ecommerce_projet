/**
 * Charge un outil d’analyse seulement si les variables d’environnement sont définies.
 * - Plausible : VITE_PLAUSIBLE_DOMAIN (ex. cosmetishop.example)
 * - Google Analytics 4 : VITE_GA_MEASUREMENT_ID (ex. G-XXXXXXXXXX)
 */
export function initAnalytics(): void {
  if (typeof document === "undefined") return;

  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
  if (plausibleDomain && !document.querySelector('script[data-analytics="plausible"]')) {
    const s = document.createElement("script");
    s.defer = true;
    s.dataset.analytics = "plausible";
    s.dataset.domain = plausibleDomain;
    s.src = "https://plausible.io/js/script.js";
    document.head.appendChild(s);
  }

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (gaId && !document.querySelector('script[data-analytics="ga4"]')) {
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.dataset.analytics = "ga4";
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(gtagScript);

    const inline = document.createElement("script");
    inline.dataset.analytics = "ga4-inline";
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});`;
    document.head.appendChild(inline);
  }
}
