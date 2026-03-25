const mongoose = require("mongoose");

const roleChangeLogSchema = new mongoose.Schema(
  {
    utilisateurCible: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    ancienRole: { type: String, enum: ["admin", "client"], required: true },
    nouveauRole: { type: String, enum: ["admin", "client"], required: true },
    modifiePar: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
    modifieParEmail: { type: String, required: true, trim: true, lowercase: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoleChangeLog", roleChangeLogSchema);

