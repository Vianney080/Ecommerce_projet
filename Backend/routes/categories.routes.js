const express = require("express");
const router = express.Router();
const Categorie = require("../models/Categorie");
const verifierToken = require("../middleware/verifierToken");

// petit middleware “admin”
function adminSeulement(req, res, next) {
  if (req.utilisateur?.role !== "admin") {
    return res.status(403).json({ message: "Accès admin requis" });
  }
  next();
}

// ✅ Liste catégories (public)
router.get("/", async (req, res) => {
  const cats = await Categorie.find().sort({ nom: 1 });
  res.json(cats);
});

// ✅ Ajouter catégorie (admin)
router.post("/", verifierToken, adminSeulement, async (req, res) => {
  try {
    const cat = await Categorie.create({ nom: req.body.nom });
    res.status(201).json(cat);
  } catch (e) {
    res.status(400).json({ message: "Erreur", erreur: e.message });
  }
});

// ✅ Modifier catégorie (admin)
router.put("/:id", verifierToken, adminSeulement, async (req, res) => {
  const cat = await Categorie.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cat) return res.status(404).json({ message: "Catégorie introuvable" });
  res.json(cat);
});

// ✅ Supprimer catégorie (admin)
router.delete("/:id", verifierToken, adminSeulement, async (req, res) => {
  const cat = await Categorie.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ message: "Catégorie introuvable" });
  res.json({ message: "Catégorie supprimée ✅" });
});

module.exports = router;