const mongoose = require("mongoose");

const avisSchema = new mongoose.Schema(
  {
    produitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produit",
      required: true,
      index: true
    },
    utilisateurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true
    },
    note: { type: Number, required: true, min: 1, max: 5 },
    commentaire: { type: String, trim: true, default: "", maxlength: 2000 }
  },
  { timestamps: true }
);

avisSchema.index({ produitId: 1, utilisateurId: 1 }, { unique: true });

module.exports = mongoose.model("Avis", avisSchema);
