import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import App from './App.tsx'
import { AuthProvider } from "./AuthContext.tsx";
import { useAuth } from "./AuthContext.tsx";
import { PageConnexion } from "./pages/PageConnexion.tsx";
import { PageDashboardAdmin } from "./pages/PageDashboardAdmin.tsx";
import { PageEspaceClient } from "./pages/PageEspaceClient.tsx";
import { PageInscription } from "./pages/PageInscription.tsx";
import { PageMotDePasseOublie } from "./pages/PageMotDePasseOublie.tsx";
import { PageReinitialiserMotDePasse } from "./pages/PageReinitialiserMotDePasse.tsx";
import { PageCatalogue } from "./pages/PageCatalogue.tsx";
import { PagePanier } from "./pages/PagePanier.tsx";
import { PageMesCommandes } from "./pages/PageMesCommandes.tsx";
import { PageCommandesAdmin } from "./pages/PageCommandesAdmin.tsx";
import { PagePaiement } from "./pages/PagePaiement.tsx";
import { PageCommandeSucces } from "./pages/PageCommandeSucces.tsx";
import { PageProduitsAdmin } from "./pages/PageProduitsAdmin.tsx";
import { PageProduitDetail } from "./pages/PageProduitDetail.tsx";
import { PageListeSouhaits } from "./pages/PageListeSouhaits.tsx";
import { PageSuiviCommande } from "./pages/PageSuiviCommande.tsx";
import { PageProfilClient } from "./pages/PageProfilClient.tsx";
import { PagePolitiqueConfidentialite } from "./pages/PagePolitiqueConfidentialite.tsx";
import { PageMentionsLegales } from "./pages/PageMentionsLegales.tsx";
import { PageCGV } from "./pages/PageCGV.tsx";
import { SiteFooter } from "./components/SiteFooter.tsx";

function AdminRoute({ children }: { children: ReactNode }) {
  const { utilisateur, authPret } = useAuth();
  const location = useLocation();

  if (!authPret) {
    return <div className="p-4 text-sm text-slate-500">Verification de la session...</div>;
  }

  if (!utilisateur) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  if (utilisateur.role !== "admin") {
    return <Navigate to="/espace-client" replace />;
  }

  return <>{children}</>;
}

function ClientRoute({ children }: { children: ReactNode }) {
  const { utilisateur, authPret } = useAuth();
  const location = useLocation();

  if (!authPret) {
    return <div className="p-4 text-sm text-slate-500">Verification de la session...</div>;
  }

  if (!utilisateur) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/espace-client" element={<PageEspaceClient />} />
          <Route path="/connexion" element={<PageConnexion />} />
          <Route path="/inscription" element={<PageInscription />} />
          <Route path="/politique-confidentialite" element={<PagePolitiqueConfidentialite />} />
          <Route path="/mentions-legales" element={<PageMentionsLegales />} />
          <Route path="/cgv" element={<PageCGV />} />
          <Route path="/mot-de-passe-oublie" element={<PageMotDePasseOublie />} />
          <Route path="/reinitialiser-mot-de-passe/:token" element={<PageReinitialiserMotDePasse />} />
          <Route
            path="/catalogue"
            element={<PageCatalogue />}
          />
          <Route path="/liste-souhaits" element={<PageListeSouhaits />} />
          <Route path="/suivi-commande" element={<PageSuiviCommande />} />
          <Route
            path="/produit/:id"
            element={<PageProduitDetail />}
          />
          <Route
            path="/panier"
            element={<PagePanier />}
          />
          <Route
            path="/commandes"
            element={
              <ClientRoute>
                <PageMesCommandes />
              </ClientRoute>
            }
          />
          <Route
            path="/profil"
            element={
              <ClientRoute>
                <PageProfilClient />
              </ClientRoute>
            }
          />
          <Route
            path="/paiement"
            element={
              <ClientRoute>
                <PagePaiement />
              </ClientRoute>
            }
          />
          <Route
            path="/commande/succes"
            element={
              <ClientRoute>
                <PageCommandeSucces />
              </ClientRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <PageDashboardAdmin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/commandes"
            element={
              <AdminRoute>
                <PageCommandesAdmin />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/produits"
            element={
              <AdminRoute>
                <PageProduitsAdmin />
              </AdminRoute>
            }
          />
        </Routes>
        <SiteFooter />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
