const Utilisateur = require("../models/Utilisateur");
const { envoyerMail } = require("./mail");
const {
  templateCommandeConfirmee,
  templateCommandeExpediee,
  templateCommandeLivree,
  templateMiseAJourSuivi
} = require("./mailTemplates");

async function utilisateurPourEmails(commande) {
  if (!commande?.utilisateurId) return null;
  const id = commande.utilisateurId._id || commande.utilisateurId;
  return Utilisateur.findById(id).select("email nom notificationsEmailActives");
}

function doitEnvoyer(u) {
  if (!u?.email) return false;
  if (u.notificationsEmailActives === false) return false;
  return true;
}

async function envoyerConfirmationCommande(commande) {
  const u = await utilisateurPourEmails(commande);
  if (!doitEnvoyer(u)) return;
  const fac = String(commande.numeroFacture || "").toUpperCase();
  if (!fac) return;
  const { subject, text, html } = templateCommandeConfirmee({
    nom: u.nom || "Client",
    numeroFacture: fac,
    total: commande.total,
    emailClient: u.email
  });
  await envoyerMail({ to: u.email, subject, text, html });
}

async function envoyerCommandeExpediee(commande, ancienStatut) {
  if (commande.statut !== "payee") return;
  if (ancienStatut === "payee") return;
  const u = await utilisateurPourEmails(commande);
  if (!doitEnvoyer(u)) return;
  const fac = String(commande.numeroFacture || "").toUpperCase();
  const { subject, text, html } = templateCommandeExpediee({
    nom: u.nom || "Client",
    numeroFacture: fac,
    emailClient: u.email,
    numeroSuivi: commande.numeroSuiviLivraison || ""
  });
  await envoyerMail({ to: u.email, subject, text, html });
}

async function envoyerCommandeLivree(commande, ancienStatut) {
  if (commande.statut !== "livree") return;
  if (ancienStatut === "livree") return;
  const u = await utilisateurPourEmails(commande);
  if (!doitEnvoyer(u)) return;
  const fac = String(commande.numeroFacture || "").toUpperCase();
  const { subject, text, html } = templateCommandeLivree({
    nom: u.nom || "Client",
    numeroFacture: fac,
    emailClient: u.email
  });
  await envoyerMail({ to: u.email, subject, text, html });
}

async function envoyerMiseAJourSuiviLivraison(commande, ancienneValeur) {
  const neuve = String(commande.numeroSuiviLivraison || "").trim();
  if (!neuve || neuve === String(ancienneValeur || "").trim()) return;
  const u = await utilisateurPourEmails(commande);
  if (!doitEnvoyer(u)) return;
  const fac = String(commande.numeroFacture || "").toUpperCase();
  const { subject, text, html } = templateMiseAJourSuivi({
    nom: u.nom || "Client",
    numeroFacture: fac,
    emailClient: u.email,
    numeroSuivi: neuve
  });
  await envoyerMail({ to: u.email, subject, text, html });
}

module.exports = {
  envoyerConfirmationCommande,
  envoyerCommandeExpediee,
  envoyerCommandeLivree,
  envoyerMiseAJourSuiviLivraison
};
