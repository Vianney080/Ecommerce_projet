function echapperHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseUrlFront() {
  return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
}

function lienSuivi(numeroFacture, email) {
  const u = new URL("/suivi-commande", baseUrlFront());
  u.searchParams.set("numero", numeroFacture);
  u.searchParams.set("email", email);
  return u.toString();
}

function templateVerificationInscription({ nom, code }) {
  const n = echapperHtml(nom);
  const c = echapperHtml(code);
  const subject = "Votre code de vérification CosmétiShop";
  const text = `Bonjour ${nom},

Merci de vous être inscrit sur CosmétiShop.

Votre code de vérification (valide 30 minutes) : ${code}

Saisissez ce code sur la page « Vérifier mon email » pour activer votre compte.

Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.

— CosmétiShop`;
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:520px;">
  <p>Bonjour <strong>${n}</strong>,</p>
  <p>Merci de vous être inscrit sur <strong>CosmétiShop</strong>.</p>
  <p style="font-size:1.1rem;">Votre code de vérification <span style="color:#64748b;">(valide 30 min)</span> :</p>
  <p style="font-size:1.75rem;font-weight:800;letter-spacing:0.15em;font-variant-numeric:tabular-nums;">${c}</p>
  <p>Saisissez ce code sur la page <strong>Vérifier mon email</strong> pour activer votre compte.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;" />
  <p style="font-size:0.85rem;color:#64748b;">Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>
  <p>— CosmétiShop</p>
</body></html>`;
  return { subject, text, html };
}

function templateReinitialisationMotDePasse({ nom, code }) {
  const n = echapperHtml(nom);
  const c = echapperHtml(code);
  const subject = "Réinitialisation de votre mot de passe CosmétiShop";
  const text = `Bonjour ${nom},

Vous avez demandé à réinitialiser votre mot de passe.

Code de vérification (valide 30 minutes) : ${code}

Rendez-vous sur le site, page « Réinitialiser le mot de passe », et saisissez ce code avec votre nouvelle adresse email si demandé.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message. Votre mot de passe reste inchangé.

— CosmétiShop`;
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:520px;">
  <p>Bonjour <strong>${n}</strong>,</p>
  <p>Vous avez demandé à réinitialiser votre mot de passe sur <strong>CosmétiShop</strong>.</p>
  <p style="font-size:1.1rem;">Code de vérification <span style="color:#64748b;">(valide 30 min)</span> :</p>
  <p style="font-size:1.75rem;font-weight:800;letter-spacing:0.15em;font-variant-numeric:tabular-nums;">${c}</p>
  <p>Utilisez la page <strong>Réinitialiser le mot de passe</strong> sur le site avec votre email et ce code.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;" />
  <p style="font-size:0.85rem;color:#64748b;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
  <p>— CosmétiShop</p>
</body></html>`;
  return { subject, text, html };
}

function templateCommandeConfirmee({ nom, numeroFacture, total, emailClient }) {
  const n = echapperHtml(nom);
  const fac = echapperHtml(numeroFacture);
  const suivi = lienSuivi(numeroFacture, emailClient);
  const subject = `Confirmation de commande ${numeroFacture} — CosmétiShop`;
  const text = `Bonjour ${nom},

Nous avons bien enregistré votre commande.

Numéro de commande / facture : ${numeroFacture}
Montant total : ${Number(total).toFixed(2)} $

Suivre votre commande (avec votre email) :
${suivi}

Merci pour votre achat.

— CosmétiShop`;
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;">
  <p>Bonjour <strong>${n}</strong>,</p>
  <p>Nous avons bien enregistré votre commande.</p>
  <p><strong>N° commande / facture :</strong> ${fac}<br/>
  <strong>Total :</strong> ${Number(total).toFixed(2)} $</p>
  <p><a href="${echapperHtml(suivi)}" style="color:#0d9488;">Suivre ma commande</a></p>
  <p>Merci pour votre achat.</p>
  <p>— CosmétiShop</p>
</body></html>`;
  return { subject, text, html };
}

function templateCommandeExpediee({ nom, numeroFacture, emailClient, numeroSuivi }) {
  const n = echapperHtml(nom);
  const fac = echapperHtml(numeroFacture);
  const suivi = lienSuivi(numeroFacture, emailClient);
  const suiviTransport = String(numeroSuivi || "").trim();
  const suiviBloc = suiviTransport
    ? suiviTransport.startsWith("http")
      ? `Suivi transporteur : ${suiviTransport}`
      : `Numéro de suivi colis : ${suiviTransport}`
    : "Votre commande a été expédiée. Les détails de suivi peuvent apparaître sous peu sur la page de suivi.";
  const subject = `Votre commande ${numeroFacture} est en route — CosmétiShop`;
  const text = `Bonjour ${nom},

Bonne nouvelle : votre commande ${numeroFacture} est expédiée (ou en cours de préparation expédition selon notre processus).

${suiviBloc}

Page de suivi : ${suivi}

— CosmétiShop`;
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;">
  <p>Bonjour <strong>${n}</strong>,</p>
  <p>Votre commande <strong>${fac}</strong> est <strong>expédiée</strong> ou en cours d'acheminement.</p>
  <p>${echapperHtml(suiviBloc)}</p>
  <p><a href="${echapperHtml(suivi)}" style="color:#0d9488;">Suivre ma commande</a></p>
  <p>— CosmétiShop</p>
</body></html>`;
  return { subject, text, html };
}

function templateCommandeLivree({ nom, numeroFacture, emailClient }) {
  const n = echapperHtml(nom);
  const fac = echapperHtml(numeroFacture);
  const suivi = lienSuivi(numeroFacture, emailClient);
  const subject = `Commande ${numeroFacture} livrée — CosmétiShop`;
  const text = `Bonjour ${nom},

Votre commande ${numeroFacture} est indiquée comme livrée.

Nous espérons que vous apprécierez vos produits. N'hésitez pas à laisser un avis sur le site.

${suivi}

— CosmétiShop`;
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;">
  <p>Bonjour <strong>${n}</strong>,</p>
  <p>Votre commande <strong>${fac}</strong> est <strong>livrée</strong>.</p>
  <p>Nous espérons que vous apprécierez vos produits.</p>
  <p><a href="${echapperHtml(suivi)}" style="color:#0d9488;">Voir le détail de la commande</a></p>
  <p>— CosmétiShop</p>
</body></html>`;
  return { subject, text, html };
}

function templateMiseAJourSuivi({ nom, numeroFacture, emailClient, numeroSuivi }) {
  const n = echapperHtml(nom);
  const fac = echapperHtml(numeroFacture);
  const suivi = lienSuivi(numeroFacture, emailClient);
  const s = String(numeroSuivi || "").trim();
  const subject = `Mise à jour du suivi — commande ${numeroFacture}`;
  const detail = s.startsWith("http") ? `Lien : ${s}` : `Numéro : ${s}`;
  const text = `Bonjour ${nom},

Le suivi de votre commande ${numeroFacture} a été mis à jour.

${detail}

Page de suivi : ${suivi}

— CosmétiShop`;
  const html = `
<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px;">
  <p>Bonjour <strong>${n}</strong>,</p>
  <p>Le suivi de votre commande <strong>${fac}</strong> a été mis à jour.</p>
  <p>${echapperHtml(detail)}</p>
  <p><a href="${echapperHtml(suivi)}" style="color:#0d9488;">Suivre ma commande</a></p>
  <p>— CosmétiShop</p>
</body></html>`;
  return { subject, text, html };
}

module.exports = {
  templateVerificationInscription,
  templateReinitialisationMotDePasse,
  templateCommandeConfirmee,
  templateCommandeExpediee,
  templateCommandeLivree,
  templateMiseAJourSuivi,
  lienSuivi,
  baseUrlFront
};
