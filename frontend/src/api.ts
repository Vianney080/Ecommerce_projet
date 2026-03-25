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

