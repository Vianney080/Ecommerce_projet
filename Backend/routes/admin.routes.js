const express = require("express");
const router = express.Router();

const verifierToken = require("../middleware/verifierToken");
const Produit = require("../models/Produit");
const Commande = require("../models/Commande");
const Utilisateur = require("../models/Utilisateur");
const RoleChangeLog = require("../models/RoleChangeLog");
const Panier = require("../models/Panier");

// ✅ Admin seulement
function adminSeulement(req, res, next) {
  if (req.utilisateur?.role !== "admin") {
    return res.status(403).json({ message: "Accès admin requis" });
  }
  next();
}

/**
 * ✅ GET /api/admin/stats
 * Statistiques admin
 */
router.get("/stats", verifierToken, adminSeulement, async (req, res) => {
  try {
    const totalProduits = await Produit.countDocuments();

    const produitsStockBas = await Produit.countDocuments({
      $expr: { $lt: ["$quantite", "$seuilMinimum"] }
    });

    const totalCommandes = await Commande.countDocuments();

    const aggRevenu = await Commande.aggregate([
      { $group: { _id: null, revenuTotal: { $sum: "$total" } } }
    ]);
    const revenuTotal = aggRevenu[0]?.revenuTotal || 0;

    // Top produits vendus (simple)
    const topProduits = await Commande.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.nomProduit",
          quantiteVendue: { $sum: "$items.quantite" }
        }
      },
      { $sort: { quantiteVendue: -1 } },
      { $limit: 5 }
    ]);

    return res.json({
      totalProduits,
      produitsStockBas,
      totalCommandes,
      revenuTotal,
      topProduits
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

/**
 * ✅ GET /api/admin/utilisateurs
 * Liste des utilisateurs (admin seulement)
 */
router.get("/utilisateurs", verifierToken, adminSeulement, async (_req, res) => {
  try {
    const utilisateurs = await Utilisateur.find({}, { motDePasseHash: 0 }).sort({ createdAt: -1 });
    return res.json(utilisateurs);
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

/**
 * ✅ PATCH /api/admin/utilisateurs/:id/statut
 * Activer / desactiver un utilisateur
 */
router.patch("/utilisateurs/:id/statut", verifierToken, adminSeulement, async (req, res) => {
  try {
    const { id } = req.params;
    const { estActif } = req.body;

    if (typeof estActif !== "boolean") {
      return res.status(400).json({ message: "Valeur estActif invalide" });
    }

    if (String(req.utilisateur?.id) === String(id)) {
      return res.status(400).json({ message: "Operation refusee: vous ne pouvez pas desactiver votre propre compte" });
    }

    const utilisateur = await Utilisateur.findById(id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (utilisateur.estActif === estActif) {
      return res.status(400).json({ message: "Aucun changement detecte pour le statut" });
    }

    // Interdit de desactiver le tout dernier admin actif
    if (utilisateur.role === "admin" && estActif === false) {
      const nombreAdminsActifs = await Utilisateur.countDocuments({ role: "admin", estActif: true });
      if (nombreAdminsActifs <= 1) {
        return res.status(400).json({
          message: "Operation refusee: vous devez conserver au moins un admin actif"
        });
      }
    }

    utilisateur.estActif = estActif;
    await utilisateur.save();

    return res.json({
      message: estActif ? "Utilisateur reactive avec succes" : "Utilisateur desactive avec succes",
      utilisateur: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        estActif: utilisateur.estActif
      }
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

/**
 * ✅ PATCH /api/admin/utilisateurs/:id/role
 * Changer le role d'un utilisateur (admin/client)
 */
router.patch("/utilisateurs/:id/role", verifierToken, adminSeulement, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "client"].includes(role)) {
      return res.status(400).json({ message: "Role invalide. Valeurs autorisees: admin, client" });
    }

    if (String(req.utilisateur?.id) === String(id)) {
      return res.status(400).json({ message: "Operation refusee: vous ne pouvez pas modifier votre propre role" });
    }

    const utilisateur = await Utilisateur.findById(id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (utilisateur.role === role) {
      return res.status(400).json({ message: "Aucun changement detecte pour ce role" });
    }

    // Evite de retirer le tout dernier admin
    if (utilisateur.role === "admin" && role === "client") {
      const nombreAdmins = await Utilisateur.countDocuments({ role: "admin" });
      if (nombreAdmins <= 1) {
        return res.status(400).json({
          message: "Operation refusee: vous devez conserver au moins un compte admin"
        });
      }
    }

    const ancienRole = utilisateur.role;
    utilisateur.role = role;
    await utilisateur.save();

    await RoleChangeLog.create({
      utilisateurCible: utilisateur._id,
      ancienRole,
      nouveauRole: role,
      modifiePar: req.utilisateur.id,
      modifieParEmail: req.utilisateur.email || ""
    });

    return res.json({
      message: "Role utilisateur mis a jour",
      utilisateur: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role
      }
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

/**
 * ✅ GET /api/admin/roles/historique
 * Historique recent des changements de role
 */
router.get("/roles/historique", verifierToken, adminSeulement, async (_req, res) => {
  try {
    const historique = await RoleChangeLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("utilisateurCible", "nom email")
      .populate("modifiePar", "nom email");

    return res.json(historique);
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

/**
 * ✅ DELETE /api/admin/utilisateurs/:id
 * Supprimer un utilisateur (admin seulement)
 */
router.delete("/utilisateurs/:id", verifierToken, adminSeulement, async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.utilisateur?.id) === String(id)) {
      return res.status(400).json({ message: "Operation refusee: vous ne pouvez pas supprimer votre propre compte" });
    }

    const utilisateur = await Utilisateur.findById(id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Interdit de supprimer le tout dernier admin
    if (utilisateur.role === "admin") {
      const nombreAdmins = await Utilisateur.countDocuments({ role: "admin" });
      if (nombreAdmins <= 1) {
        return res.status(400).json({
          message: "Operation refusee: vous devez conserver au moins un compte admin"
        });
      }
    }

    // Nettoyage des donnees rattachees a l'utilisateur
    await Promise.all([
      Panier.deleteMany({ utilisateurId: utilisateur._id }),
      Commande.deleteMany({ utilisateurId: utilisateur._id }),
      RoleChangeLog.deleteMany({ utilisateurCible: utilisateur._id }),
      Utilisateur.deleteOne({ _id: utilisateur._id })
    ]);

    return res.json({ message: "Utilisateur supprime avec succes" });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

module.exports = router;