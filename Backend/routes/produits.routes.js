const express = require("express");
const router = express.Router();
const Produit = require("../models/Produit");
const verifierToken = require("../middleware/verifierToken");
const uploadImage = require("../config/uploadImage");
const { stockerImage } = require("../services/imageStorage");

const MOTS_VIDES_RECHERCHE = new Set([
  "a",
  "au",
  "aux",
  "de",
  "des",
  "du",
  "et",
  "en",
  "l",
  "la",
  "le",
  "les",
  "ou",
  "pour",
  "sur",
  "un",
  "une"
]);

function nettoyerTexte(valeur) {
  return typeof valeur === "string" ? valeur.trim() : "";
}

function nettoyerRecherche(valeur) {
  return String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extraireMotsClesRecherche(valeur) {
  const texte = nettoyerRecherche(valeur).replace(/[^a-z0-9\s-]/g, " ");
  const tokens = texte
    .split(/[\s-]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length > 1 && !MOTS_VIDES_RECHERCHE.has(t));
  return Array.from(new Set(tokens));
}

function validerDonneesProduit(body) {
  const nom = nettoyerTexte(body?.nom);
  const categorie = nettoyerTexte(body?.categorie);
  const description = nettoyerTexte(body?.description);
  const quantite = Number(body?.quantite);
  const prixUnitaire = Number(body?.prixUnitaire);
  const seuilMinimum = Number(body?.seuilMinimum);

  if (!nom || !categorie) {
    return { ok: false, message: "Le nom et la categorie sont obligatoires." };
  }
  if (!Number.isFinite(quantite) || quantite < 0) {
    return { ok: false, message: "Quantite invalide." };
  }
  if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) {
    return { ok: false, message: "Prix unitaire invalide." };
  }
  if (!Number.isFinite(seuilMinimum) || seuilMinimum < 0) {
    return { ok: false, message: "Seuil minimum invalide." };
  }

  return {
    ok: true,
    data: { nom, categorie, description, quantite, prixUnitaire, seuilMinimum }
  };
}

function imageDepuisUpload(req) {
  if (!req.file) return "";
  return `/uploads/${req.file.filename}`;
}

function lireListeDepuisBody(brut) {
  let liste = [];
  if (Array.isArray(brut)) {
    liste = brut;
  } else if (typeof brut === "string" && brut) {
    const texte = brut.trim();
    if (texte.startsWith("[") && texte.endsWith("]")) {
      try {
        const parse = JSON.parse(texte);
        if (Array.isArray(parse)) liste = parse;
      } catch {
        liste = texte.split(",");
      }
    } else {
      liste = texte.split(",");
    }
  }
  return liste.map((v) => nettoyerTexte(v)).filter(Boolean);
}

function normaliserImagesExistantes(brut) {
  const liste = lireListeDepuisBody(brut);
  return Array.from(
    new Set(
      liste
        .filter(
          (v) =>
            /^\/uploads\/.+\.(png|jpe?g)$/i.test(v) ||
            /^https?:\/\/.+/i.test(v)
        )
    )
  );
}

function lireFichiersUpload(req) {
  const fichiers = [];

  if (Array.isArray(req.files)) {
    fichiers.push(...req.files);
  } else if (req.files && typeof req.files === "object") {
    Object.values(req.files).forEach((liste) => {
      if (Array.isArray(liste)) fichiers.push(...liste);
    });
  }

  if (req.file) fichiers.push(req.file);

  return fichiers.filter((f) => Boolean(f?.filename));
}

async function normaliserUploadsAvecCles(req) {
  const fichiers = lireFichiersUpload(req);
  const cles = lireListeDepuisBody(req.body?.newFileKeys);
  const uploads = await Promise.all(
    fichiers.map(async (f, index) => ({
      key: cles[index] || `upload-${index}`,
      url: await stockerImage(f, { folder: "ecommerce/produits" })
    }))
  );

  const map = new Map();
  uploads.forEach((item) => map.set(item.key, item.url));
  return { uploads, map };
}

function construireOrdreImages({ ordreTokens, imagesExistantes, uploads, uploadsMap }) {
  const resultat = [];
  const deja = new Set();
  const setExistantes = new Set(imagesExistantes);

  const pushUnique = (valeur) => {
    if (!valeur || deja.has(valeur)) return;
    deja.add(valeur);
    resultat.push(valeur);
  };

  ordreTokens.forEach((token) => {
    if (token.startsWith("existing:")) {
      const path = token.slice("existing:".length);
      if (setExistantes.has(path)) pushUnique(path);
      return;
    }
    if (token.startsWith("new:")) {
      const key = token.slice("new:".length);
      pushUnique(uploadsMap.get(key));
    }
  });

  imagesExistantes.forEach((img) => pushUnique(img));
  uploads.forEach((item) => pushUnique(item.url));

  return resultat;
}

// ✅ GET /api/produits (public)
router.get("/", async (req, res) => {
  try {
    const { recherche, categorie, stockBas, tri } = req.query;
    const filtre = {};

    if (recherche) {
      const motsCles = extraireMotsClesRecherche(recherche);
      if (motsCles.length > 0) {
        filtre.$and = motsCles.map((motCle) => ({
          $or: [
            { nom: { $regex: motCle, $options: "i" } },
            { categorie: { $regex: motCle, $options: "i" } },
            { description: { $regex: motCle, $options: "i" } }
          ]
        }));
      }
    }
    if (categorie) filtre.categorie = categorie;

    if (stockBas === "true") {
      filtre.$expr = { $lt: ["$quantite", "$seuilMinimum"] };
    }

    let triObjet = { createdAt: -1 };
    if (tri === "nom") triObjet = { nom: 1 };
    if (tri === "quantite") triObjet = { quantite: 1 };
    if (tri === "categorie") triObjet = { categorie: 1 };
    if (tri === "prix_asc") triObjet = { prixUnitaire: 1 };
    if (tri === "prix_desc") triObjet = { prixUnitaire: -1 };

    const produits = await Produit.find(filtre).sort(triObjet);
    res.json(produits);
  } catch (erreur) {
    res.status(500).json({ message: "Erreur serveur", erreur: erreur.message });
  }
});

// ✅ GET /api/produits/:id (public)
router.get("/:id", async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit introuvable" });
    res.json(produit);
  } catch (erreur) {
    res.status(400).json({ message: "ID invalide", erreur: erreur.message });
  }
});

// ✅ POST /api/produits
router.post("/", verifierToken, async (req, res) => {
  try {
    const { nom, description, categorie, quantite, prixUnitaire, seuilMinimum, imageUrl } = req.body;

    const nouveau = await Produit.create({
      nom,
      description: description || "",
      categorie,
      quantite,
      prixUnitaire,
      seuilMinimum,
      imageUrl: imageUrl || ""
    });

    res.status(201).json(nouveau);
  } catch (erreur) {
    res.status(400).json({ message: "Données invalides", erreur: erreur.message });
  }
});

// ✅ PUT /api/produits/:id
router.put("/:id", verifierToken, async (req, res) => {
  try {
    const modifie = await Produit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!modifie) return res.status(404).json({ message: "Produit introuvable" });
    res.json(modifie);
  } catch (erreur) {
    res.status(400).json({ message: "Erreur mise à jour", erreur: erreur.message });
  }
});

// ✅ DELETE /api/produits/:id
router.delete("/:id", verifierToken, async (req, res) => {
  try {
    const supprime = await Produit.findByIdAndDelete(req.params.id);
    if (!supprime) return res.status(404).json({ message: "Produit introuvable" });
    res.json({ message: "Produit supprimé ✅" });
  } catch (erreur) {
    res.status(400).json({ message: "Erreur suppression", erreur: erreur.message });
  }
});

// ✅ POST /api/produits/avec-image
// form-data: nom, categorie, quantite, prixUnitaire, seuilMinimum, image (fichier)
router.post(
  "/avec-image",
  verifierToken,
  uploadImage.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 12 }
  ]),
  async (req, res) => {
    try {
      const { uploads, map } = await normaliserUploadsAvecCles(req);
      const ordreTokens = lireListeDepuisBody(req.body?.imageOrder);
      const imageUrls = construireOrdreImages({
        ordreTokens,
        imagesExistantes: [],
        uploads,
        uploadsMap: map
      });

      if (imageUrls.length === 0) {
        return res.status(400).json({ message: "Image obligatoire (.png, .jpg, .jpeg)." });
      }

      const validation = validerDonneesProduit(req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const nouveau = await Produit.create({
        ...validation.data,
        imageUrl: imageUrls[0],
        imageUrls
      });

      return res.status(201).json(nouveau);
    } catch (erreur) {
      return res.status(400).json({ message: "Erreur creation produit", erreur: erreur.message });
    }
  }
);

// ✅ PUT /api/produits/:id/avec-image
router.put(
  "/:id/avec-image",
  verifierToken,
  uploadImage.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 12 }
  ]),
  async (req, res) => {
    try {
      const validation = validerDonneesProduit(req.body);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }

      const produitActuel = await Produit.findById(req.params.id);
      if (!produitActuel) {
        return res.status(404).json({ message: "Produit introuvable" });
      }

      const imagesActuelles = normaliserImagesExistantes([
        ...(produitActuel.imageUrls || []),
        produitActuel.imageUrl
      ]);
      const imagesDemandees = normaliserImagesExistantes(req.body?.imageUrls);
      const garderExistantes = req.body?.garderImagesExistantes !== "false";
      const baseExistantes = !garderExistantes
        ? []
        : imagesDemandees.length > 0
          ? imagesDemandees.filter((img) => imagesActuelles.includes(img))
          : imagesActuelles;

      const { uploads, map } = await normaliserUploadsAvecCles(req);
      const ordreTokens = lireListeDepuisBody(req.body?.imageOrder);
      const imageUrls = construireOrdreImages({
        ordreTokens,
        imagesExistantes: baseExistantes,
        uploads,
        uploadsMap: map
      });

      if (imageUrls.length === 0) {
        return res.status(400).json({ message: "Image obligatoire (.png, .jpg, .jpeg)." });
      }

      const modifie = await Produit.findByIdAndUpdate(
        req.params.id,
        {
          ...validation.data,
          imageUrl: imageUrls[0],
          imageUrls
        },
        { new: true, runValidators: true }
      );

      return res.json(modifie);
    } catch (erreur) {
      return res.status(400).json({ message: "Erreur mise a jour", erreur: erreur.message });
    }
  }
);

module.exports = router;