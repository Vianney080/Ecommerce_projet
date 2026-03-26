const nodemailer = require("nodemailer");

function smtpConfigure() {
  return Boolean(
    String(process.env.SMTP_HOST || "").trim() &&
      String(process.env.SMTP_USER || "").trim() &&
      String(process.env.SMTP_PASS || "").trim()
  );
}

let transporter = null;

function obtenirTransporteur() {
  if (!smtpConfigure()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim()
      }
    });
  }
  return transporter;
}

function adresseExpediteur() {
  const from = String(process.env.MAIL_FROM || "").trim();
  if (from) return from;
  const name = String(process.env.MAIL_FROM_NAME || "CosmétiShop").trim();
  return `"${name}" <${process.env.SMTP_USER.trim()}>`;
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
      "[mail] SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS). Email non envoyé →",
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

module.exports = {
  smtpConfigure,
  envoyerMail,
  codesDevAutorises
};
