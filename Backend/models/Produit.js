const mongoose = require("mongoose");

function estCheminImageValide(valeur) {
  const texte = String(valeur || "").trim();
  return (
    /^\/uploads\/.+\.(png|jpe?g|webp|gif)$/i.test(texte) || /^https?:\/\/.+/i.test(texte)
  );
}

const produitSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    categorie: { type: String, required: true, trim: true },
    quantite: { type: Number, required: true, min: 0 },
    prixUnitaire: { type: Number, required: true, min: 0 },
    /** Prix « avant réduction » (affiché barré) ; doit être > prixUnitaire si renseigné */
    prixBarre: { type: Number, min: 0, default: null },
    seuilMinimum: { type: Number, required: true, min: 0 },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: estCheminImageValide,
        message: "L'image doit etre un chemin local /uploads ou une URL http(s) valide."
      }
    },
    imageUrls: {
      type: [String],
      default: [],
      validate: {
        validator: (valeurs) =>
          Array.isArray(valeurs) &&
          valeurs.every((v) => estCheminImageValide(v)),
        message: "Chaque image doit etre un chemin local /uploads ou une URL http(s) valide."
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Produit", produitSchema);