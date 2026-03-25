const mongoose = require("mongoose");

const itemPanierSchema = new mongoose.Schema(
  {
    produitId: { type: mongoose.Schema.Types.ObjectId, ref: "Produit", required: true },
    nomProduit: { type: String, required: true },
    prixUnitaire: { type: Number, required: true, min: 0 },
    quantite: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const panierSchema = new mongoose.Schema(
  {
    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true, unique: true },

    items: { type: [itemPanierSchema], default: [] },

    total: { type: Number, default: 0, min: 0 },

    statut: {
      type: String,
      enum: ["actif", "converti"],
      default: "actif"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Panier", panierSchema);