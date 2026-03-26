const multer = require("multer");
const path = require("path");
const { DOSSIER_UPLOADS } = require("./uploadsPath");

const EXTENSIONS_AUTORISEES = new Set([".png", ".jpg", ".jpeg"]);
const MIME_AUTORISES = new Set(["image/png", "image/jpeg"]);

// où enregistrer les images
const stockage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOSSIER_UPLOADS);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nomUnique = "img-" + Date.now() + ext;
    cb(null, nomUnique);
  }
});

// accepter seulement png / jpg / jpeg
function filtreImage(req, file, cb) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  if (EXTENSIONS_AUTORISEES.has(extension) && MIME_AUTORISES.has(mime)) {
    cb(null, true);
    return;
  }
  cb(new Error("Seuls les fichiers PNG, JPG et JPEG sont autorises."), false);
}

module.exports = multer({
  storage: stockage,
  fileFilter: filtreImage,
  limits: { fileSize: 5 * 1024 * 1024 }
});