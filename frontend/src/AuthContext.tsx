import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, type UtilisateurConnecte, type AuthResponse } from "./api";
import {
  CLE_TRANSFERT_PANIER_INVITE,
  fusionnerPanierInviteVersBackend,
  viderPanierInvite
} from "./cartInvite";

interface AuthContextType {
    utilisateur: UtilisateurConnecte | null;
    token: string | null;
    authPret: boolean;
    connexion: (email: string, motDePasse: string) => Promise<void>;
    inscription: (data: {
        nom: string;
        email: string;
        motDePasse: string;
    }) => Promise<{
        message?: string;
        verificationRequise?: boolean;
        email?: string;
        codeDev?: string;
        avertissementEmail?: string;
        detailEnvoiEmail?: string;
    }>;
    rafraichirProfil: () => Promise<void>;
    majUtilisateurLocal: (user: UtilisateurConnecte) => void;
    deconnexion: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function appliquerTheme(themeInterface?: string) {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const theme = (themeInterface || "clair").toLowerCase();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const themeResolue = theme === "systeme" ? (media.matches ? "sombre" : "clair") : theme;
    root.classList.toggle("theme-dark", themeResolue === "sombre");
    root.setAttribute("data-theme", themeResolue);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [utilisateur, setUtilisateur] = useState<UtilisateurConnecte | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [authPret, setAuthPret] = useState(false);

    useEffect(() => {
        const savedToken = localStorage.getItem("token");
        const savedUser = localStorage.getItem("utilisateur");
        if (savedToken && savedUser) {
            setToken(savedToken);
            const user = JSON.parse(savedUser);
            setUtilisateur(user);
            appliquerTheme(user?.themeInterface);
        } else {
            appliquerTheme("clair");
        }
        setAuthPret(true);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const theme = utilisateur?.themeInterface || "clair";
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const rafraichirTheme = () => appliquerTheme(theme);
        rafraichirTheme();
        if (theme === "systeme") {
            media.addEventListener("change", rafraichirTheme);
            return () => media.removeEventListener("change", rafraichirTheme);
        }
        return;
    }, [utilisateur?.themeInterface]);

    async function connexion(email: string, motDePasse: string) {
        const res = await api.post<AuthResponse>("/auth/connexion", { email, motDePasse });
        const { token: jwt, utilisateur: user } = res.data;
        setToken(jwt);
        setUtilisateur(user);
        localStorage.setItem("token", jwt);
        localStorage.setItem("utilisateur", JSON.stringify(user));
        const transfertDepuisCheckout = localStorage.getItem(CLE_TRANSFERT_PANIER_INVITE) === "1";
        if (transfertDepuisCheckout) {
            // Transfert voulu uniquement depuis le parcours paiement invité.
            try {
                await fusionnerPanierInviteVersBackend(api);
            } finally {
                localStorage.removeItem(CLE_TRANSFERT_PANIER_INVITE);
                viderPanierInvite();
            }
        } else {
            // Isolation stricte hors parcours checkout.
            viderPanierInvite();
        }
    }

    async function inscription(data: { nom: string; email: string; motDePasse: string }) {
        const res = await api.post<{
            message?: string;
            verificationRequise?: boolean;
            email?: string;
            codeDev?: string;
            avertissementEmail?: string;
            detailEnvoiEmail?: string;
        }>("/auth/inscription", data);
        return res.data;
    }

    function majUtilisateurLocal(user: UtilisateurConnecte) {
        setUtilisateur(user);
        localStorage.setItem("utilisateur", JSON.stringify(user));
    }

    async function rafraichirProfil() {
        const res = await api.get<{ utilisateur: UtilisateurConnecte }>("/auth/me");
        majUtilisateurLocal(res.data.utilisateur);
    }

    function deconnexion() {
        setToken(null);
        setUtilisateur(null);
        localStorage.removeItem("token");
        localStorage.removeItem("utilisateur");
        localStorage.removeItem(CLE_TRANSFERT_PANIER_INVITE);
        // Evite toute fuite de données panier entre sessions sur un même navigateur.
        viderPanierInvite();
    }

    return (
        <AuthContext.Provider
            value={{
                utilisateur,
                token,
                authPret,
                connexion,
                inscription,
                rafraichirProfil,
                majUtilisateurLocal,
                deconnexion
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>");
    }
    return ctx;
}

