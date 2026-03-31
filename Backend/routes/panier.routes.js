const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const verifierToken = require("../middleware/verifierToken");
const Panier = require("../models/Panier");
const Produit = require("../models/Produit");
const Commande = require("../models/Commande");
const { envoyerConfirmationCommande } = require("../services/commandeEmails");

const TAUX_TAXE = 0.15;
const COUPONS = {
  WELCOME10: { type: "percent", value: 10 },
  BEAUTY15: { type: "percent", value: 15 },
  SAVE5: { type: "fixed", value: 5 }
};

function arrondir2(valeur) {
  return Math.round((Number(valeur) + Number.EPSILON) * 100) / 100;
}

function normaliserCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function calculerRemise(sousTotal, couponCode) {
  const code = normaliserCouponCode(couponCode);
  if (!code) {
    return { code: "", montant: 0 };
  }
  const coupon = COUPONS[code];
  if (!coupon) {
    return { erreur: "Code promo invalide." };
  }

  let montant = 0;
  if (coupon.type === "percent") {
    montant = arrondir2((sousTotal * coupon.value) / 100);
  } else if (coupon.type === "fixed") {
    montant = arrondir2(coupon.value);
  }
  if (montant > sousTotal) montant = sousTotal;
  return { code, montant };
}

// ✅ Fonction: recalcul total
function calculerTotal(items) {
  let total = 0;
  for (const it of items) {
    const prix = Number(it.prixUnitaire) || 0;
    const qte = Number(it.quantite) || 0;
    total += prix * qte;
  }
  return total;
}

/** Première image pour affichage panier / header (non persistée en BD). */
function premiereImageProduit(p) {
  if (!p) return "";
  const urls = [...(p.imageUrls || []).map(String), String(p.imageUrl || "")]
    .map((s) => s.trim())
    .filter(Boolean);
  return urls[0] || "";
}

/** Ajoute imageUrl à chaque ligne pour le front (mini-panier, page panier). */
async function panierAvecImagesPourJson(panierDoc) {
  const obj = panierDoc.toObject ? panierDoc.toObject({ flattenMaps: true }) : { ...panierDoc };
  if (!obj.items?.length) return obj;
  const ids = obj.items.map((it) => it.produitId).filter(Boolean);
  const produits = await Produit.find({ _id: { $in: ids } }).select("imageUrl imageUrls").lean();
  const map = new Map(produits.map((p) => [p._id.toString(), p]));
  obj.items = obj.items.map((it) => {
    const p = map.get(String(it.produitId));
    return { ...it, imageUrl: premiereImageProduit(p) };
  });
  return obj;
}

// ✅ Aligne les infos de panier sur les produits en BD (prix/nom), utile pour corriger d'anciens paniers.
async function synchroniserItemsPanier(panier) {
  if (!panier?.items?.length) {
    panier.total = 0;
    return panier;
  }

  const ids = panier.items.map((it) => it.produitId).filter(Boolean);
  const produits = await Produit.find({ _id: { $in: ids } }, { _id: 1, nom: 1, prixUnitaire: 1 });
  const mapProduits = new Map(produits.map((p) => [p._id.toString(), p]));

  let modifie = false;
  for (const it of panier.items) {
    const p = mapProduits.get(it.produitId.toString());
    if (!p) continue;

    if (it.nomProduit !== p.nom) {
      it.nomProduit = p.nom;
      modifie = true;
    }
    if (Number(it.prixUnitaire) !== Number(p.prixUnitaire)) {
      it.prixUnitaire = p.prixUnitaire;
      modifie = true;
    }
  }

  const totalCalcule = calculerTotal(panier.items);
  if (Number(panier.total) !== Number(totalCalcule)) {
    panier.total = totalCalcule;
    modifie = true;
  }

  if (modifie) {
    await panier.save();
  }

  return panier;
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

// ✅ Garantit qu'un panier actif existe pour l'utilisateur
async function obtenirPanierActif(utilisateurId) {
  let panier = await Panier.findOne({ utilisateurId });

  if (!panier) {
    panier = await Panier.create({
      utilisateurId,
      items: [],
      total: 0,
      statut: "actif"
    });
    return panier;
  }

  // Si ancien panier converti, on le rouvre comme nouveau panier d'achat.
  if (panier.statut !== "actif") {
    panier.items = [];
    panier.total = 0;
    panier.statut = "actif";
    await panier.save();
  }

  await synchroniserItemsPanier(panier);
  return panier;
}

// ✅ GET /api/panier  -> récupérer mon panier (ou le créer vide)
router.get("/", verifierToken, async (req, res) => {
  try {
    const panier = await obtenirPanierActif(req.utilisateur.id);

    return res.json(await panierAvecImagesPourJson(panier));
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

// ✅ POST /api/panier/ajouter
// Body: { "produitId": "...", "quantite": 1 }
router.post("/ajouter", verifierToken, async (req, res) => {
  try {
    const { produitId, quantite } = req.body;

    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: "produitId invalide" });
    }

    const qte = Number(quantite);
    if (!qte || qte < 1) {
      return res.status(400).json({ message: "Quantité invalide" });
    }

    const produit = await Produit.findById(produitId);
    if (!produit) return res.status(404).json({ message: "Produit introuvable" });

    // récupérer ou créer un panier actif
    const panier = await obtenirPanierActif(req.utilisateur.id);

    // si produit déjà dans panier → augmenter quantité
    const exist = panier.items.find((it) => it.produitId.toString() === produitId);

    let messagePanier = "Article ajouté au panier.";

    if (exist) {
      const quantiteCible = exist.quantite + qte;
      if (quantiteCible > produit.quantite) {
        return res.status(400).json({
          message: `Stock insuffisant pour ${produit.nom}. Disponible: ${produit.quantite}, dans votre panier: ${exist.quantite}.`
        });
      }
      exist.quantite = quantiteCible;
      // Maintient les infos à jour si le produit a changé.
      exist.nomProduit = produit.nom;
      exist.prixUnitaire = produit.prixUnitaire;
      messagePanier = "Quantité mise à jour dans le panier.";
    } else {
      if (qte > produit.quantite) {
        return res.status(400).json({
          message: `Stock insuffisant pour ${produit.nom}. Disponible: ${produit.quantite}.`
        });
      }
      panier.items.push({
        produitId: produit._id,
        nomProduit: produit.nom,
        prixUnitaire: produit.prixUnitaire,
        quantite: qte
      });
      messagePanier = "Article ajouté au panier.";
    }

    panier.total = calculerTotal(panier.items);
    await panier.save();
    await synchroniserItemsPanier(panier);

    return res.status(200).json({
      message: messagePanier,
      panier: await panierAvecImagesPourJson(panier),
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

// ✅ PUT /api/panier/modifier-quantite
// Body: { "produitId": "...", "quantite": 3 }
router.put("/modifier-quantite", verifierToken, async (req, res) => {
  try {
    const { produitId, quantite } = req.body;

    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: "produitId invalide" });
    }

    const qte = Number(quantite);
    if (!qte || qte < 1) {
      return res.status(400).json({ message: "Quantité invalide (min 1)" });
    }

    const panier = await Panier.findOne({ utilisateurId: req.utilisateur.id });
    if (!panier) return res.status(404).json({ message: "Panier introuvable" });

    if (panier.statut !== "actif") {
      return res.status(400).json({ message: "Panier non actif" });
    }

    const item = panier.items.find((it) => it.produitId.toString() === produitId);
    if (!item) return res.status(404).json({ message: "Produit pas dans le panier" });

    const produit = await Produit.findById(produitId);
    if (!produit) return res.status(404).json({ message: "Produit introuvable" });
    if (qte > produit.quantite) {
      return res.status(400).json({
        message: `Stock insuffisant pour ${produit.nom}. Disponible: ${produit.quantite}.`
      });
    }

    item.quantite = qte;

    panier.total = calculerTotal(panier.items);
    await panier.save();
    await synchroniserItemsPanier(panier);

    return res.json({
      message: "Quantité mise à jour ✅",
      panier: await panierAvecImagesPourJson(panier),
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

// ✅ DELETE /api/panier/supprimer/:produitId
router.delete("/supprimer/:produitId", verifierToken, async (req, res) => {
  try {
    const { produitId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: "produitId invalide" });
    }

    const panier = await Panier.findOne({ utilisateurId: req.utilisateur.id });
    if (!panier) return res.status(404).json({ message: "Panier introuvable" });

    if (panier.statut !== "actif") {
      return res.status(400).json({ message: "Panier non actif" });
    }

    panier.items = panier.items.filter((it) => it.produitId.toString() !== produitId);
    panier.total = calculerTotal(panier.items);

    await panier.save();
    await synchroniserItemsPanier(panier);

    return res.json({
      message: "Produit supprimé du panier ✅",
      panier: await panierAvecImagesPourJson(panier),
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

// ✅ DELETE /api/panier/vider
router.delete("/vider", verifierToken, async (req, res) => {
  try {
    const panier = await Panier.findOne({ utilisateurId: req.utilisateur.id });
    if (!panier) return res.status(404).json({ message: "Panier introuvable" });

    // on vide et on remet le panier actif
    panier.items = [];
    panier.total = 0;
    panier.statut = "actif";

    await panier.save();
    await synchroniserItemsPanier(panier);

    return res.json({
      message: "Panier vidé ✅",
      panier: await panierAvecImagesPourJson(panier),
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

// ✅ POST /api/panier/commander
router.post("/commander", verifierToken, async (req, res) => {
  try {
    const adresse = normaliserAdresse(req.body?.adresseLivraison);
    const couponCode = normaliserCouponCode(req.body?.couponCode);

    if (!adresseValide(adresse)) {
      return res.status(400).json({ message: "Adresse de livraison incomplète" });
    }

    const panier = await Panier.findOne({ utilisateurId: req.utilisateur.id });

    if (!panier || panier.items.length === 0) {
      return res.status(400).json({ message: "Panier vide" });
    }

    if (panier.statut !== "actif") {
      return res.status(400).json({ message: "Panier non actif" });
    }

    await synchroniserItemsPanier(panier);

    // Charger produits en BD
    const ids = panier.items.map((it) => it.produitId);
    const produits = await Produit.find({ _id: { $in: ids } });

    if (produits.length !== ids.length) {
      return res.status(400).json({ message: "Un ou plusieurs produits du panier n'existent plus" });
    }

    // Vérifier stock + construire commande
    let sousTotal = 0;
    const itemsCommande = [];

    for (const it of panier.items) {
      const p = produits.find((x) => x._id.toString() === it.produitId.toString());
      if (!p) return res.status(400).json({ message: "Produit introuvable: " + it.produitId });

      if (p.quantite < it.quantite) {
        return res.status(400).json({ message: `Stock insuffisant pour ${p.nom}` });
      }

      itemsCommande.push({
        produitId: p._id,
        nomProduit: p.nom,
        prixUnitaire: p.prixUnitaire,
        quantite: it.quantite
      });

      sousTotal += p.prixUnitaire * it.quantite;
    }

    const remiseRes = calculerRemise(arrondir2(sousTotal), couponCode);
    if (remiseRes.erreur) {
      return res.status(400).json({ message: remiseRes.erreur });
    }
    const remiseMontant = arrondir2(remiseRes.montant || 0);
    const montantApresRemise = arrondir2(sousTotal - remiseMontant);
    const taxe = arrondir2(montantApresRemise * TAUX_TAXE);
    const total = arrondir2(montantApresRemise + taxe);

    // Déduire stock
    for (const it of itemsCommande) {
      await Produit.findByIdAndUpdate(it.produitId, { $inc: { quantite: -it.quantite } });
    }

    // Créer commande
    const commande = await Commande.create({
      utilisateurId: req.utilisateur.id,
      items: itemsCommande,
      sousTotal: arrondir2(sousTotal),
      remiseCode: remiseRes.code || "",
      remiseMontant,
      taxe,
      total,
      statutPaiement: "paye",
      methodePaiement: "carte",
      adresseLivraison: adresse,
      statut: "en_attente"
    });

    setImmediate(() => {
      envoyerConfirmationCommande(commande).catch((err) =>
        console.error("[commandeEmails] confirmation:", err?.message || err)
      );
    });

    // Vider panier et le remettre actif pour la prochaine session d'achat
    panier.items = [];
    panier.total = 0;
    panier.statut = "actif";
    await panier.save();
    await synchroniserItemsPanier(panier);

    return res.status(201).json({
      message: "Commande créée depuis panier ✅",
      commande,
      recapitulatif: {
        sousTotal: arrondir2(sousTotal),
        remiseCode: remiseRes.code || "",
        remiseMontant,
        taxe,
        total,
        tauxTaxe: TAUX_TAXE
      }
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", erreur: e.message });
  }
});

module.exports = router;