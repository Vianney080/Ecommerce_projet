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
const { smtpConfigure } = require("./services/mail");
require("dotenv").config();

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

const corsOptions = {
  origin(origin, callback) {
    // Autorise les appels sans Origin (Postman, curl, checks Render, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Domaines listés dans CORS_ORIGINS ou FRONTEND_URL (plusieurs URLs séparées par des virgules)
    if (corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // N’importe quel sous-domaine *.vercel.app (souvent plusieurs noms pour le même projet)
    if (estOrigineVercelApp(origin)) {
      callback(null, true);
      return;
    }

    if (/^http:\/\/localhost(:\d+)?$/i.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) {
      callback(null, true);
      return;
    }

    console.warn("[CORS] Origin refusée:", origin);
    callback(new Error("Origin non autorisee par CORS"));
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
    if (smtpConfigure()) {
      console.log("Emails transactionnels : SMTP configuré (confirmation commande, codes inscription / mot de passe).");
    } else {
      console.warn(
        "Emails : SMTP non configuré (SMTP_* ou EMAIL_HOST / EMAIL_USER / EMAIL_PASS) — aucun email réel envoyé ; voir les logs serveur."
      );
    }
});