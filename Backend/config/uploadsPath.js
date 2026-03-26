const fs = require("fs");
const path = require("path");

/**
 * Dossier des fichiers servis sous /uploads/...
 * En production sur Render, sans Cloudinary, monter un disque persistant et définir UPLOADS_DIR vers ce chemin.
 */
const DOSSIER_UPLOADS = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, "..", "uploads");

if (!fs.existsSync(DOSSIER_UPLOADS)) {
  fs.mkdirSync(DOSSIER_UPLOADS, { recursive: true });
}

module.exports = { DOSSIER_UPLOADS };
