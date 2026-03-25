const mongoose = require("mongoose");

const produitSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    categorie: { type: String, required: true, trim: true },
    quantite: { type: Number, required: true, min: 0 },
    prixUnitaire: { type: Number, required: true, min: 0 },
    seuilMinimum: { type: Number, required: true, min: 0 },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (valeur) => /^\/uploads\/.+\.(png|jpe?g)$/i.test(valeur || ""),
        message: "L'image doit etre un fichier local PNG/JPG/JPEG."
      }
    },
    imageUrls: {
      type: [String],
      default: [],
      validate: {
        validator: (valeurs) =>
          Array.isArray(valeurs) &&
          valeurs.every((v) => /^\/uploads\/.+\.(png|jpe?g)$/i.test((v || "").trim())),
        message: "Chaque image doit etre un fichier local PNG/JPG/JPEG."
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Produit", produitSchema);