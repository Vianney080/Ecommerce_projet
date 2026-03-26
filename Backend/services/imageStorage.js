const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

const { DOSSIER_UPLOADS } = require("../config/uploadsPath");

const CLOUDINARY_CONFIGURE =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (CLOUDINARY_CONFIGURE) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

function construireCheminLocalDepuisFichier(file) {
  if (!file) return "";
  if (file.filename) return `/uploads/${file.filename}`;
  if (file.path) return `/uploads/${path.basename(file.path)}`;
  return "";
}

async function stockerImage(file, options = {}) {
  if (!file) {
    throw new Error("Fichier image manquant.");
  }

  if (!CLOUDINARY_CONFIGURE) {
    return construireCheminLocalDepuisFichier(file);
  }

  const dossierCloudinary = options.folder || "ecommerce";
  const sourcePath = file.path || "";

  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error("Le fichier temporaire a uploader est introuvable.");
  }

  const resultat = await cloudinary.uploader.upload(sourcePath, {
    folder: dossierCloudinary,
    resource_type: "image"
  });

  await fs.promises.unlink(sourcePath).catch(() => {});
  return resultat?.secure_url || resultat?.url || "";
}

module.exports = {
  stockerImage,
  cloudinaryConfigure: CLOUDINARY_CONFIGURE,
  DOSSIER_UPLOADS
};
