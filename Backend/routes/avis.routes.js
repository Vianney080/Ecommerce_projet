const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Avis = require("../models/Avis");
const Produit = require("../models/Produit");
const Utilisateur = require("../models/Utilisateur");
const verifierToken = require("../middleware/verifierToken");

/** GET /api/avis/produit/:produitId — public */
router.get("/produit/:produitId", async (req, res) => {
  try {
    const { produitId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: "ID produit invalide" });
    }
    const existe = await Produit.exists({ _id: produitId });
    if (!existe) {
      return res.status(404).json({ message: "Produit introuvable" });
    }
    const liste = await Avis.find({ produitId })
      .sort({ createdAt: -1 })
      .populate("utilisateurId", "nom")
      .lean();

    const resume = liste.reduce(
      (acc, a) => {
        acc.total += 1;
        acc.sommeNotes += Number(a.note) || 0;
        return acc;
      },
      { total: 0, sommeNotes: 0 }
    );
    const moyenne = resume.total > 0 ? Math.round((resume.sommeNotes / resume.total) * 10) / 10 : 0;

    return res.json({
      moyenne,
      nombre: resume.total,
      avis: liste.map((a) => ({
        _id: a._id,
        note: a.note,
        commentaire: a.commentaire || "",
        createdAt: a.createdAt,
        auteur: a.utilisateurId?.nom || "Client"
      }))
    });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

/** POST /api/avis — connecté, un avis par produit */
router.post("/", verifierToken, async (req, res) => {
  try {
    const produitId = String(req.body?.produitId || "").trim();
    const note = Number(req.body?.note);
    const commentaire = String(req.body?.commentaire || "").trim().slice(0, 2000);

    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: "ID produit invalide" });
    }
    if (!Number.isFinite(note) || note < 1 || note > 5) {
      return res.status(400).json({ message: "La note doit etre entre 1 et 5" });
    }

    const produit = await Produit.findById(produitId).select("_id");
    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    const utilisateur = await Utilisateur.findById(req.utilisateur.id).select("nom");
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const existant = await Avis.findOne({
      produitId,
      utilisateurId: req.utilisateur.id
    });
    if (existant) {
      existant.note = note;
      existant.commentaire = commentaire;
      await existant.save();
      return res.json({
        message: "Avis mis a jour",
        avis: {
          _id: existant._id,
          note: existant.note,
          commentaire: existant.commentaire,
          createdAt: existant.createdAt,
          auteur: utilisateur.nom
        }
      });
    }

    const cree = await Avis.create({
      produitId,
      utilisateurId: req.utilisateur.id,
      note,
      commentaire
    });

    return res.status(201).json({
      message: "Avis publie",
      avis: {
        _id: cree._id,
        note: cree.note,
        commentaire: cree.commentaire,
        createdAt: cree.createdAt,
        auteur: utilisateur.nom
      }
    });
  } catch (erreur) {
    if (erreur.code === 11000) {
      return res.status(409).json({ message: "Vous avez deja note ce produit" });
    }
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

module.exports = router;
