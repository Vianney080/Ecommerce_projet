const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const Utilisateur = require("../models/Utilisateur");
const verifierToken = require("../middleware/verifierToken");
const uploadImage = require("../config/uploadImage");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;

function hacherTokenReset(tokenBrut) {
  return crypto.createHash("sha256").update(tokenBrut).digest("hex");
}

// ✅ Fonction pour créer un token
function creerToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur._id, email: utilisateur.email, role: utilisateur.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function serialiserUtilisateur(utilisateur) {
  if (!utilisateur) return null;
  return {
    id: utilisateur._id,
    nom: utilisateur.nom,
    email: utilisateur.email,
    role: utilisateur.role,
    avatarUrl: utilisateur.avatarUrl || "",
    telephone: utilisateur.telephone || "",
    bio: utilisateur.bio || "",
    adresse: utilisateur.adresse || "",
    ville: utilisateur.ville || "",
    province: utilisateur.province || "",
    codePostal: utilisateur.codePostal || "",
    pays: utilisateur.pays || "",
    themeInterface: utilisateur.themeInterface || "clair",
    newsletterActive: Boolean(utilisateur.newsletterActive),
    notificationsEmailActives: Boolean(utilisateur.notificationsEmailActives)
  };
}

// ✅ POST /api/auth/inscription
router.post("/inscription", async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;
    const nomNormalise = String(nom || "").trim();
    const emailNormalise = String(email || "").trim().toLowerCase();
    const motDePasseTexte = String(motDePasse || "");

    if (!nomNormalise || !emailNormalise || !motDePasseTexte) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    if (nomNormalise.length < 2 || nomNormalise.length > 60) {
      return res.status(400).json({ message: "Le nom doit contenir entre 2 et 60 caracteres." });
    }

    if (!EMAIL_REGEX.test(emailNormalise)) {
      return res.status(400).json({ message: "Adresse email invalide." });
    }

    if (!PASSWORD_REGEX.test(motDePasseTexte)) {
      return res.status(400).json({
        message:
          "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et caractere special."
      });
    }

    const existe = await Utilisateur.findOne({ email: emailNormalise });
    if (existe) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    const motDePasseHash = await bcrypt.hash(motDePasseTexte, 10);

    // Logique metier:
    // - Le tout premier compte cree devient admin (initialisation de la boutique)
    // - Tous les comptes suivants crees via l'inscription publique deviennent client
    const nombreAdmins = await Utilisateur.countDocuments({ role: "admin" });
    const roleAttribue = nombreAdmins === 0 ? "admin" : "client";

    const utilisateur = await Utilisateur.create({
      nom: nomNormalise,
      email: emailNormalise,
      motDePasseHash,
      role: roleAttribue
    });

    return res.status(201).json({
      message: "Utilisateur créé ✅",
      utilisateur: serialiserUtilisateur(utilisateur)
    });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ POST /api/auth/connexion
router.post("/connexion", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    const emailNormalise = String(email || "").trim().toLowerCase();
    const motDePasseTexte = String(motDePasse || "");

    if (!emailNormalise || !motDePasseTexte) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    if (!EMAIL_REGEX.test(emailNormalise)) {
      return res.status(400).json({ message: "Adresse email invalide." });
    }

    const utilisateur = await Utilisateur.findOne({ email: emailNormalise });
    if (!utilisateur) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    if (!utilisateur.estActif) {
      return res.status(403).json({ message: "Compte desactive. Contactez un administrateur." });
    }

    const ok = await bcrypt.compare(motDePasseTexte, utilisateur.motDePasseHash);
    if (!ok) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const token = creerToken(utilisateur);

    return res.json({
      message: "Connexion réussie ✅",
      token,
      utilisateur: serialiserUtilisateur(utilisateur)
    });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ GET /api/auth/me
router.get("/me", verifierToken, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    return res.json({ utilisateur: serialiserUtilisateur(utilisateur) });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ PUT /api/auth/me (mise à jour du profil)
router.put("/me", verifierToken, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const nom = String(req.body?.nom || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const telephone = String(req.body?.telephone || "").trim();
    const bio = String(req.body?.bio || "").trim();
    const adresse = String(req.body?.adresse || "").trim();
    const ville = String(req.body?.ville || "").trim();
    const province = String(req.body?.province || "").trim();
    const codePostal = String(req.body?.codePostal || "").trim();
    const pays = String(req.body?.pays || "").trim();
    const themeInterface = String(req.body?.themeInterface || "clair").trim().toLowerCase();
    const newsletterActive = Boolean(req.body?.newsletterActive);
    const notificationsEmailActives = Boolean(req.body?.notificationsEmailActives);

    if (!nom) {
      return res.status(400).json({ message: "Le nom est obligatoire." });
    }
    if (nom.length < 2 || nom.length > 60) {
      return res.status(400).json({ message: "Le nom doit contenir entre 2 et 60 caracteres." });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Adresse email invalide." });
    }

    const autreCompte = await Utilisateur.findOne({ email, _id: { $ne: utilisateur._id } }).select("_id");
    if (autreCompte) {
      return res.status(409).json({ message: "Cet email est deja utilise." });
    }

    if (!["clair", "sombre", "systeme"].includes(themeInterface)) {
      return res.status(400).json({ message: "Theme invalide." });
    }

    utilisateur.nom = nom;
    utilisateur.email = email;
    utilisateur.telephone = telephone.slice(0, 30);
    utilisateur.bio = bio.slice(0, 280);
    utilisateur.adresse = adresse.slice(0, 120);
    utilisateur.ville = ville.slice(0, 80);
    utilisateur.province = province.slice(0, 80);
    utilisateur.codePostal = codePostal.slice(0, 20);
    utilisateur.pays = pays.slice(0, 80);
    utilisateur.themeInterface = themeInterface;
    utilisateur.newsletterActive = newsletterActive;
    utilisateur.notificationsEmailActives = notificationsEmailActives;
    await utilisateur.save();

    return res.json({
      message: "Profil mis a jour avec succes.",
      utilisateur: serialiserUtilisateur(utilisateur)
    });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ PUT /api/auth/me/avatar
router.put("/me/avatar", verifierToken, (req, res, next) => {
  uploadImage.single("avatar")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Image invalide." });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image avatar obligatoire (.png, .jpg, .jpeg)." });
    }

    const utilisateur = await Utilisateur.findById(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    utilisateur.avatarUrl = `/uploads/${req.file.filename}`;
    await utilisateur.save();

    return res.json({
      message: "Photo de profil mise a jour.",
      utilisateur: serialiserUtilisateur(utilisateur)
    });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ PUT /api/auth/me/mot-de-passe
router.put("/me/mot-de-passe", verifierToken, async (req, res) => {
  try {
    const motDePasseActuel = String(req.body?.motDePasseActuel || "");
    const nouveauMotDePasse = String(req.body?.nouveauMotDePasse || "");

    if (!motDePasseActuel || !nouveauMotDePasse) {
      return res.status(400).json({ message: "Mot de passe actuel et nouveau mot de passe requis." });
    }

    if (!PASSWORD_REGEX.test(nouveauMotDePasse)) {
      return res.status(400).json({
        message:
          "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et caractere special."
      });
    }

    const utilisateur = await Utilisateur.findById(req.utilisateur.id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const ok = await bcrypt.compare(motDePasseActuel, utilisateur.motDePasseHash);
    if (!ok) {
      return res.status(401).json({ message: "Mot de passe actuel incorrect." });
    }

    utilisateur.motDePasseHash = await bcrypt.hash(nouveauMotDePasse, 10);
    await utilisateur.save();

    return res.json({ message: "Mot de passe mis a jour avec succes." });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ POST /api/auth/mot-de-passe-oublie
router.post("/mot-de-passe-oublie", async (req, res) => {
  try {
    const emailNormalise = String(req.body?.email || "").trim().toLowerCase();

    if (!emailNormalise || !EMAIL_REGEX.test(emailNormalise)) {
      return res.status(400).json({ message: "Adresse email invalide." });
    }

    const utilisateur = await Utilisateur.findOne({ email: emailNormalise });

    if (utilisateur && utilisateur.estActif) {
      const tokenBrut = crypto.randomBytes(32).toString("hex");
      const tokenHash = hacherTokenReset(tokenBrut);

      utilisateur.resetPasswordTokenHash = tokenHash;
      utilisateur.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await utilisateur.save();

      const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const resetUrl = `${frontendBaseUrl}/reinitialiser-mot-de-passe/${tokenBrut}`;

      if (process.env.NODE_ENV !== "production") {
        return res.json({
          message: "Lien de reinitialisation genere.",
          resetUrl
        });
      }
    }

    return res.json({
      message:
        "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye."
    });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ POST /api/auth/reinitialiser-mot-de-passe
router.post("/reinitialiser-mot-de-passe", async (req, res) => {
  try {
    const tokenBrut = String(req.body?.token || "").trim();
    const motDePasseTexte = String(req.body?.motDePasse || "");

    if (!tokenBrut) {
      return res.status(400).json({ message: "Token de reinitialisation manquant." });
    }

    if (!PASSWORD_REGEX.test(motDePasseTexte)) {
      return res.status(400).json({
        message:
          "Mot de passe invalide: minimum 8 caracteres avec majuscule, minuscule, chiffre et caractere special."
      });
    }

    const tokenHash = hacherTokenReset(tokenBrut);
    const utilisateur = await Utilisateur.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
      estActif: true
    });

    if (!utilisateur) {
      return res.status(400).json({ message: "Lien invalide ou expire." });
    }

    utilisateur.motDePasseHash = await bcrypt.hash(motDePasseTexte, 10);
    utilisateur.resetPasswordTokenHash = null;
    utilisateur.resetPasswordExpiresAt = null;
    await utilisateur.save();

    return res.json({ message: "Mot de passe reinitialise avec succes." });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

module.exports = router;