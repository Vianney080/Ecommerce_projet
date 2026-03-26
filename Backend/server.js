require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { DOSSIER_UPLOADS } = require("./config/uploadsPath");
const { cloudinaryConfigure } = require("./services/imageStorage");
const routesProduits = require("./routes/produits.routes");
const routesTableauDeBord = require("./routes/tableauDeBord.routes");
const routesAuth = require("./routes/auth.routes");
const routesCategories = require("./routes/categories.routes");
const routesCommandes = require("./routes/commandes.routes");
const routesPanier = require("./routes/panier.routes");
const routesAdmin = require("./routes/admin.routes");
const routesAvis = require("./routes/avis.routes");
const { smtpConfigure, resendConfigure, verifierSmtpAuDemarrage } = require("./services/mail");

const app = express();
const ORIGINES_PLACEHOLDERS = new Set(["https://temp.local", "http://temp.local"]);
const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin && !ORIGINES_PLACEHOLDERS.has(origin));

/** Tout déploiement Vercel (prod, preview, alias) — évite le blocage si FRONTEND_URL ≠ l’URL réelle du navigateur */
function estOrigineVercelApp(origin) {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && u.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function origineAutorisee(origin) {
  if (!origin) return false;
  if (corsOrigins.includes(origin)) return true;
  if (estOrigineVercelApp(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/i.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) {
    return true;
  }
  return false;
}

/** Réponses d’erreur / 404 : le package cors n’ajoute pas toujours les en-têtes → le navigateur affiche « CORS » à tort */
function appliquerCorsReponse(req, res) {
  const origin = req.headers.origin;
  if (origin && origineAutorisee(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
}

const corsOptions = {
  origin(origin, callback) {
    // Autorise les appels sans Origin (Postman, curl, checks Render, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (origineAutorisee(origin)) {
      callback(null, true);
      return;
    }

    // Ne pas utiliser callback(Error) : la lib cors renvoie une 500 sans Access-Control-Allow-Origin
    console.warn("[CORS] Origin refusée:", origin);
    callback(null, false);
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/auth", routesAuth);
app.use("/api/categories", routesCategories);
app.use("/api/commandes", routesCommandes);
app.use("/api/produits", routesProduits);
app.use("/api/tableau-de-bord", routesTableauDeBord);
app.use("/api/panier", routesPanier);
app.use("/api/avis", routesAvis);
app.use("/api/admin", routesAdmin);
app.use("/uploads", express.static(DOSSIER_UPLOADS));

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connecté"))
.catch(err => console.log(err));

app.get("/", (req, res) => {
    res.send("API Ecommerce fonctionne ");
});

app.use((req, res) => {
  appliquerCorsReponse(req, res);
  res.status(404).json({ message: "Route introuvable" });
});

app.use((err, req, res, next) => {
  appliquerCorsReponse(req, res);
  const status = Number(err.status || err.statusCode) || 500;
  const message = err.message || "Erreur serveur";
  console.error("[API]", status, message, err.stack ? err.stack.split("\n").slice(0, 3).join(" ") : "");
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
    if (cloudinaryConfigure) {
      console.log("Images: Cloudinary actif (URLs stables apres redeploiement).");
    } else if (process.env.UPLOADS_DIR) {
      console.log(`Images: fichiers locaux dans UPLOADS_DIR=${process.env.UPLOADS_DIR}`);
    } else if (process.env.NODE_ENV === "production") {
      console.warn(
        "Images: pas de Cloudinary ni UPLOADS_DIR — le dossier ./uploads sur le disque de l’instance est souvent efface au redeploiement (Render). Configurez CLOUDINARY_* ou un disque persistant."
      );
    }
    if (resendConfigure()) {
      const len = String(process.env.RESEND_API_KEY || "").trim().length;
      console.log(
        `[mail] RESEND_API_KEY détectée (longueur ${len}) — les envois passent par HTTPS Resend, pas par Gmail/SMTP.`
      );
      verifierSmtpAuDemarrage().catch(() => {});
    } else if (smtpConfigure()) {
      console.warn(
        "[mail] Pas de RESEND_API_KEY : utilisation SMTP (Gmail). Sur Render gratuit cela provoque souvent « Connection timeout »."
      );
      console.log("[mail] Test de connexion SMTP en cours…");
      verifierSmtpAuDemarrage().catch(() => {});
    } else {
      console.warn(
        "[mail] Aucun envoi email : ajoutez RESEND_API_KEY sur Render ou EMAIL_HOST + EMAIL_USER + EMAIL_PASS."
      );
    }
});