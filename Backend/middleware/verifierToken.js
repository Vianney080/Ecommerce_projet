const jwt = require("jsonwebtoken");
const Utilisateur = require("../models/Utilisateur");

async function verifierToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant" });
  }

  const token = header.split(" ")[1];

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const utilisateur = await Utilisateur.findById(decode.id).select("_id email role estActif");

    if (!utilisateur) {
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }

    if (!utilisateur.estActif) {
      return res.status(403).json({ message: "Compte desactive. Contactez un administrateur." });
    }

    req.utilisateur = {
      id: utilisateur._id.toString(),
      email: utilisateur.email,
      role: utilisateur.role
    };
    next();
  } catch (erreur) {
    return res.status(401).json({ message: "Token invalide" });
  }
}

module.exports = verifierToken;