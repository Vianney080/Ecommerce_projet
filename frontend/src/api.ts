import axios from "axios";

/**
 * Ne jamais dériver l'URL API du hostname du front (ex. *.vercel.app) :
 * les images /uploads/... iraient vers le mauvais serveur.
 */
function normaliserBaseApi(urlBrut: string): string {
  const url = urlBrut.trim();
  if (!url) return "http://localhost:5000/api";
  const sansSlashFin = url.replace(/\/+$/, "");
  if (/\/api$/i.test(sansSlashFin)) return sansSlashFin;
  return `${sansSlashFin}/api`;
}

const API_BASE_URL = normaliserBaseApi(
  typeof import.meta.env.VITE_API_URL === "string" ? import.meta.env.VITE_API_URL : ""
);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/i, "");

if (import.meta.env.PROD) {
  const h = API_ORIGIN.replace(/^https?:\/\//i, "").split("/")[0] || "";
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(h)) {
    console.error(
      "[CosmétiShop] Le build de production utilise encore localhost comme API (VITE_API_URL absent ou invalide au build). " +
        "Les images /uploads/ ne se chargeront pas. Dans Vercel : Environment Variables → VITE_API_URL=https://votre-api.onrender.com/api puis redéployer."
    );
  }
}

/**
 * URL finale pour images / fichiers (uploads, Cloudinary, etc.).
 * - Chemins relatifs → préfixe API_ORIGIN (doit être VITE_API_URL en prod).
 * - //domain → https (évite src invalides).
 * - http sur page https → passage en https sauf localhost (évite le contenu mixte bloqué).
 * - URL absolues /uploads/... vers un autre hôte (ancien Render, localhost) → réécrites vers API_ORIGIN
 *   pour suivre le backend actuellement configuré (sinon vignettes cassées après changement d’URL Render).
 */
export function resolveAssetUrl(raw: string | undefined | null): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("//")) {
    s = `https:${s}`;
  }
  const originSansSlash = API_ORIGIN.replace(/\/+$/, "");

  /** Même chemin /uploads/ mais servi par l’API définie dans VITE_API_URL. */
  const reecrireUploadsVersApiActuelle = (urlAbsolue: string): string => {
    if (!/^https?:\/\//i.test(urlAbsolue)) return urlAbsolue;
    try {
      const u = new URL(urlAbsolue);
      if (!u.pathname.startsWith("/uploads/")) return urlAbsolue;
      return `${originSansSlash}${u.pathname}${u.search}${u.hash}`;
    } catch {
      return urlAbsolue;
    }
  };

  if (/^https?:\/\//i.test(s)) {
    s = reecrireUploadsVersApiActuelle(s);
    if (typeof window !== "undefined" && window.location?.protocol === "https:") {
      try {
        const u = new URL(s);
        const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
        if (u.protocol === "http:" && !local) {
          u.protocol = "https:";
          return u.toString();
        }
      } catch {
        /* garder s */
      }
    }
    return s;
  }
  if (s.startsWith("/")) return `${originSansSlash}${s}`;
  return `${originSansSlash}/${s}`;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Ajouter automatiquement le token JWT s'il existe dans le localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface UtilisateurConnecte {
  id: string;
  nom: string;
  email: string;
  role: "admin" | "client" | string;
  avatarUrl?: string;
  telephone?: string;
  bio?: string;
  adresse?: string;
  ville?: string;
  province?: string;
  codePostal?: string;
  pays?: string;
  themeInterface?: "clair" | "sombre" | "systeme" | string;
  newsletterActive?: boolean;
  notificationsEmailActives?: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  utilisateur: UtilisateurConnecte;
}

