const mongoose = require("mongoose");

const itemCommandeSchema = new mongoose.Schema(
  {
    produitId: { type: mongoose.Schema.Types.ObjectId, ref: "Produit", required: true },
    nomProduit: { type: String, required: true },        // on sauvegarde le nom (au cas où le produit change)
    prixUnitaire: { type: Number, required: true, min: 0 },
    quantite: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const commandeSchema = new mongoose.Schema(
  {
    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },

    items: { type: [itemCommandeSchema], required: true },

    sousTotal: { type: Number, default: 0, min: 0 },
    remiseCode: { type: String, default: "", trim: true },
    remiseMontant: { type: Number, default: 0, min: 0 },
    taxe: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    numeroFacture: {
      type: String,
      required: true,
      unique: true,
      default: () => {
        const ts = Date.now().toString(36).toUpperCase();
        const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `FAC-${ts}-${rnd}`;
      }
    },

    statutPaiement: {
      type: String,
      enum: ["en_attente", "paye", "echoue", "rembourse"],
      default: "en_attente"
    },

    methodePaiement: {
      type: String,
      default: ""
    },

    adresseLivraison: {
      nomComplet: { type: String, required: true, trim: true },
      rue: { type: String, required: true, trim: true },
      ville: { type: String, required: true, trim: true },
      province: { type: String, required: true, trim: true },
      codePostal: { type: String, required: true, trim: true },
      pays: { type: String, required: true, trim: true },
      telephone: { type: String, trim: true, default: "" }
    },

    statut: {
      type: String,
      enum: ["en_attente", "payee", "annulee", "livree"],
      default: "en_attente"
    },

    numeroSuiviLivraison: { type: String, default: "", trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Commande", commandeSchema);