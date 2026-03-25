const express = require("express");
const router = express.Router();
const Produit = require("../models/Produit");
const verifierToken = require("../middleware/verifierToken");

// ✅ GET /api/tableau-de-bord/resume (protégé)
router.get("/resume", verifierToken, async (req, res) => {
  try {
    const totalProduits = await Produit.countDocuments();

    const produitsStockBas = await Produit.countDocuments({
      $expr: { $lt: ["$quantite", "$seuilMinimum"] }
    });

    const valeurAgg = await Produit.aggregate([
      {
        $group: {
          _id: null,
          valeurTotaleStock: { $sum: { $multiply: ["$quantite", "$prixUnitaire"] } }
        }
      }
    ]);

    const valeurTotaleStock = valeurAgg[0]?.valeurTotaleStock || 0;

    res.json({ totalProduits, produitsStockBas, valeurTotaleStock });
  } catch (erreur) {
    res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

module.exports = router;