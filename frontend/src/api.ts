import axios from "axios";

const NAV_HOST =
  typeof window !== "undefined" && window.location?.hostname
    ? window.location.hostname
    : "localhost";

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${NAV_HOST}:5000/api`;
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

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

