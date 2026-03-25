const mongoose = require("mongoose");

const utilisateurSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    motDePasseHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "client"],
      default: "client"
    },

    avatarUrl: {
      type: String,
      default: "",
      trim: true
    },

    telephone: {
      type: String,
      default: "",
      trim: true
    },

    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 280
    },

    adresse: {
      type: String,
      default: "",
      trim: true
    },

    ville: {
      type: String,
      default: "",
      trim: true
    },

    province: {
      type: String,
      default: "",
      trim: true
    },

    codePostal: {
      type: String,
      default: "",
      trim: true
    },

    pays: {
      type: String,
      default: "",
      trim: true
    },

    themeInterface: {
      type: String,
      enum: ["clair", "sombre", "systeme"],
      default: "clair"
    },

    newsletterActive: {
      type: Boolean,
      default: false
    },

    notificationsEmailActives: {
      type: Boolean,
      default: true
    },

    estActif: {
      type: Boolean,
      default: true
    },

    resetPasswordTokenHash: {
      type: String,
      default: null
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Utilisateur", utilisateurSchema);