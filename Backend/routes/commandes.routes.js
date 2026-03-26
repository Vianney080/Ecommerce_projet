const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const verifierToken = require("../middleware/verifierToken");

const Commande = require("../models/Commande");
const Produit = require("../models/Produit");

// ✅ Middleware admin
function adminSeulement(req, res, next) {
  if (req.utilisateur?.role !== "admin") {
    return res.status(403).json({ message: "Accès admin requis" });
  }
  next();
}

function normaliserAdresse(adresse = {}) {
  return {
    nomComplet: String(adresse.nomComplet || "").trim(),
    rue: String(adresse.rue || "").trim(),
    ville: String(adresse.ville || "").trim(),
    province: String(adresse.province || "").trim(),
    codePostal: String(adresse.codePostal || "").trim(),
    pays: String(adresse.pays || "").trim(),
    telephone: String(adresse.telephone || "").trim()
  };
}

function adresseValide(adresse) {
  return (
    adresse.nomComplet &&
    adresse.rue &&
    adresse.ville &&
    adresse.province &&
    adresse.codePostal &&
    adresse.pays
  );
}

function echapperRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Recherche par ID Mongo (24 hex) ou par numéro de facture / commande (ex. FAC-…)
 */
async function trouverCommandePourSuiviPublic(identifiantBrut) {
  const s = String(identifiantBrut || "").trim();
  if (!s) return null;

  if (/^[a-fA-F0-9]{24}$/.test(s)) {
    const parId = await Commande.findById(s);
    if (parId) return parId;
  }

  const fac = s.replace(/\s+/g, "");
  if (fac.length >= 6) {
    const parFacture = await Commande.findOne({
      numeroFacture: new RegExp(`^${echapperRegex(fac)}$`, "i")
    });
    if (parFacture) return parFacture;
  }

  return null;
}

/**
 * ✅ POST /api/commandes
 * Client passe une commande
 * Body attendu :
 * {
 *   "items": [
 *     { "produitId": "...", "quantite": 2 },
 *     { "produitId": "...", "quantite": 1 }
 *   ]
 * }
 */
router.post("/", verifierToken, async (req, res) => {
  try {
    const { items, adresseLivraison } = req.body;
    const adresse = normaliserAdresse(adresseLivraison);

    // 1) Validation de base
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "La commande doit contenir des items" });
    }
    if (!adresseValide(adresse)) {
      return res.status(400).json({ message: "Adresse de livraison incomplète" });
    }

    // 2) Vérifier ObjectId + quantités
    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.produitId)) {
        return res.status(400).json({ message: "produitId invalide : " + item.produitId });
      }

      const qte = Number(item.quantite);
      if (!qte || qte < 1) {
        return res.status(400).json({ message: "Quantité invalide pour produitId : " + item.produitId });
      }
    }

    // 3) Charger les produits en BD
    const ids = items.map((i) => i.produitId);
    const produits = await Produit.find({ _id: { $in: ids } });

    // Si certains ids n'existent pas
    if (produits.length !== ids.length) {
      return res.status(400).json({ message: "Un ou plusieurs produits sont introuvables" });
    }

    // 4) Construire items complets + calcul total + vérifier stock
    let total = 0;
    const itemsComplets = [];

    for (const item of items) {
      const p = produits.find((x) => x._id.toString() === item.produitId);
      if (!p) {
        return res.status(400).json({ message: "Produit introuvable: " + item.produitId });
      }

      const qte = Number(item.quantite);

      // Vérifier stock
      if (p.quantite < qte) {
        return res.status(400).json({ message: `Stock insuffisant pour ${p.nom}` });
      }

      itemsComplets.push({
        produitId: p._id,
        nomProduit: p.nom,
        prixUnitaire: p.prixUnitaire,
        quantite: qte
      });

      total += p.prixUnitaire * qte;
    }

    // 5) Déduire stock
    // (simple, suffisant pour projet; pour un vrai projet on ferait une transaction)
    for (const item of itemsComplets) {
      await Produit.findByIdAndUpdate(item.produitId, { $inc: { quantite: -item.quantite } });
    }

    // 6) Créer commande
    const commande = await Commande.create({
      utilisateurId: req.utilisateur.id,
      items: itemsComplets,
      total,
      statutPaiement: "paye",
      methodePaiement: "carte",
      adresseLivraison: adresse,
      statut: "en_attente"
    });

    return res.status(201).json({ message: "Commande créée ✅", commande });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

/**
 * GET /api/commandes/suivi-public/:identifiant?email=
 * identifiant = numéro de facture (FAC-…) ou ID technique ; email = vérification identité
 */
router.get("/suivi-public/:identifiant", async (req, res) => {
  try {
    const { identifiant } = req.params;
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Email requis pour consulter le suivi." });
    }

    const ref = await trouverCommandePourSuiviPublic(identifiant);
    if (!ref) {
      return res.status(404).json({ message: "Commande introuvable." });
    }
    const commande = await Commande.findById(ref._id).populate("utilisateurId", "email");
    if (!commande) {
      return res.status(404).json({ message: "Commande introuvable." });
    }

    const emailCommande = String(commande.utilisateurId?.email || "").toLowerCase();
    if (!emailCommande || emailCommande !== email) {
      return res.status(404).json({ message: "Commande introuvable." });
    }

    return res.json({
      _id: commande._id,
      numeroFacture: commande.numeroFacture,
      statut: commande.statut,
      statutPaiement: commande.statutPaiement,
      total: commande.total,
      taxe: commande.taxe,
      sousTotal: commande.sousTotal,
      createdAt: commande.createdAt,
      numeroSuiviLivraison: commande.numeroSuiviLivraison || "",
      items: commande.items.map((it) => ({
        nomProduit: it.nomProduit,
        quantite: it.quantite,
        prixUnitaire: it.prixUnitaire
      })),
      adresseLivraison: {
        ville: commande.adresseLivraison?.ville,
        province: commande.adresseLivraison?.province,
        pays: commande.adresseLivraison?.pays
      }
    });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

/**
 * ✅ GET /api/commandes/mes-commandes
 * Historique du client connecté
 */
router.get("/mes-commandes", verifierToken, async (req, res) => {
  try {
    const commandes = await Commande.find({ utilisateurId: req.utilisateur.id }).sort({ createdAt: -1 });
    return res.json(commandes);
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

/**
 * ✅ GET /api/commandes
 * Admin : voir toutes les commandes
 */
router.get("/", verifierToken, adminSeulement, async (req, res) => {
  try {
    const commandes = await Commande.find()
      .sort({ createdAt: -1 })
      .populate("utilisateurId", "nom email");
    return res.json(commandes);
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

/**
 * ✅ PATCH /api/commandes/:id/statut
 * Admin: modifier le statut d'une commande
 * Statuts autorisés: en_attente, payee, livree, annulee
 */
router.patch("/:id/statut", verifierToken, adminSeulement, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    const statutsAutorises = ["en_attente", "payee", "livree", "annulee"];
    if (!statutsAutorises.includes(statut)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    commande.statut = statut;
    await commande.save();

    return res.json({ message: "Statut de commande mis a jour", commande });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

/**
 * PATCH /api/commandes/:id/suivi-livraison
 * Admin : numéro ou lien de suivi transporteur (visible client)
 */
router.patch("/:id/suivi-livraison", verifierToken, adminSeulement, async (req, res) => {
  try {
    const { id } = req.params;
    const brut = String(req.body?.numeroSuiviLivraison ?? "").trim();
    if (brut.length > 500) {
      return res.status(400).json({ message: "Numero de suivi trop long (500 caracteres max)." });
    }

    const commande = await Commande.findById(id);
    if (!commande) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    commande.numeroSuiviLivraison = brut;
    await commande.save();

    return res.json({ message: "Suivi livraison mis a jour", commande });
  } catch (erreur) {
    return res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

module.exports = router;