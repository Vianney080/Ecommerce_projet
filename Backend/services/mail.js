const nodemailer = require("nodemailer");

/**
 * Lit la config SMTP : accepte SMTP_* ou EMAIL_* (alias courants).
 * Les espaces dans le mot de passe d'application Gmail sont retirés automatiquement.
 */
function lireConfigSmtp() {
  const host = String(process.env.SMTP_HOST || process.env.EMAIL_HOST || "").trim();
  const user = String(process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  let pass = String(process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();
  pass = pass.replace(/\s+/g, "");
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secure =
    String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || "").toLowerCase() === "true" ||
    port === 465;
  return { host, user, pass, port, secure };
}

function smtpConfigure() {
  const c = lireConfigSmtp();
  return Boolean(c.host && c.user && c.pass);
}

let transporter = null;

function obtenirTransporteur() {
  if (!smtpConfigure()) return null;
  if (!transporter) {
    const c = lireConfigSmtp();
    transporter = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.secure,
      auth: {
        user: c.user,
        pass: c.pass
      }
    });
  }
  return transporter;
}

function adresseExpediteur() {
  const from = String(process.env.MAIL_FROM || "").trim();
  if (from) return from;
  const name = String(process.env.MAIL_FROM_NAME || "CosmétiShop").trim();
  const c = lireConfigSmtp();
  return `"${name}" <${c.user}>`;
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} opts
 * @returns {Promise<{ ok: boolean; erreur?: string }>}
 */
async function envoyerMail(opts) {
  const to = String(opts.to || "").trim();
  if (!to) {
    return { ok: false, erreur: "destinataire_manquant" };
  }

  const transport = obtenirTransporteur();
  if (!transport) {
    console.warn(
      "[mail] SMTP non configuré (SMTP_HOST ou EMAIL_HOST + USER + PASS). Email non envoyé →",
      opts.subject,
      "→",
      to
    );
    console.warn("[mail] Aperçu texte:\n", opts.text);
    return { ok: false, erreur: "smtp_non_configure" };
  }

  try {
    await transport.sendMail({
      from: adresseExpediteur(),
      to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || opts.text.replace(/\n/g, "<br/>")
    });
    return { ok: true };
  } catch (e) {
    console.error("[mail] Échec envoi:", e.message);
    return { ok: false, erreur: e.message };
  }
}

function codesDevAutorises() {
  return String(process.env.EMAIL_DEV_AFFICHER_CODE || "").toLowerCase() === "true";
}

/**
 * Message utilisateur si l'envoi a échoué ou si SMTP n'est pas configuré.
 * @param {{ ok: boolean; erreur?: string } | null} resultat
 * @returns {string | null}
 */
function texteAvertissementEmail(resultat) {
  if (!resultat || resultat.ok) return null;
  if (resultat.erreur === "smtp_non_configure") {
    return (
      "Aucun email réel n'a été envoyé : le serveur n'a pas SMTP configuré. " +
      "Ajoutez SMTP_HOST (ou EMAIL_HOST), SMTP_USER (ou EMAIL_USER), SMTP_PASS (ou EMAIL_PASS) " +
      "dans Backend/.env ou sur Render. Voir Backend/.env.example. " +
      "Pour tester : EMAIL_DEV_AFFICHER_CODE=true affiche le code sur le site ; sinon consultez les logs serveur."
    );
  }
  return (
    "L'envoi de l'email a échoué. Vérifiez SMTP (identifiants, pare-feu) et les logs du serveur. " +
    "En local sans SMTP, configurez les variables ou utilisez EMAIL_DEV_AFFICHER_CODE=true."
  );
}

module.exports = {
  smtpConfigure,
  envoyerMail,
  codesDevAutorises,
  texteAvertissementEmail
};
