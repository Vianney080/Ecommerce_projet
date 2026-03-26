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
  pass = pass.replace(/^["']|["']$/g, "");
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
    const opts = {
      host: c.host,
      port: c.port,
      secure: c.secure,
      auth: {
        user: c.user,
        pass: c.pass
      },
      connectionTimeout: 25_000,
      greetingTimeout: 25_000
    };
    // Gmail sur le port 587 : STARTTLS
    if (!c.secure && c.port === 587) {
      opts.requireTLS = true;
    }
    transporter = nodemailer.createTransport(opts);
  }
  return transporter;
}

/** Expéditeur : Gmail exige en pratique la même adresse que EMAIL_USER */
function adresseExpediteur() {
  const c = lireConfigSmtp();
  const fromBrut = String(process.env.MAIL_FROM || "").trim().replace(/^["']|["']$/g, "");
  if (fromBrut) {
    const emailFrom = fromBrut.match(/<([^>]+)>/)?.[1] || (fromBrut.includes("@") ? fromBrut : "");
    if (emailFrom && c.user && emailFrom.toLowerCase() !== c.user.toLowerCase()) {
      console.warn(
        "[mail] MAIL_FROM (",
        emailFrom,
        ") ≠ EMAIL_USER (",
        c.user,
        ") — Gmail refuse souvent ; utilisation de EMAIL_USER comme expéditeur."
      );
      const name = String(process.env.MAIL_FROM_NAME || "CosmétiShop").trim();
      return `"${name}" <${c.user}>`;
    }
    return fromBrut.includes("@") && !fromBrut.includes("<")
      ? `"CosmétiShop" <${fromBrut}>`
      : fromBrut;
  }
  const name = String(process.env.MAIL_FROM_NAME || "CosmétiShop").trim();
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
      "[mail] SMTP non configuré (EMAIL_HOST + EMAIL_USER + EMAIL_PASS sur Render). Sujet:",
      opts.subject,
      "→",
      to
    );
    console.warn("[mail] Aperçu texte:\n", opts.text);
    return { ok: false, erreur: "smtp_non_configure" };
  }

  try {
    const from = adresseExpediteur();
    await transport.sendMail({
      from,
      to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || opts.text.replace(/\n/g, "<br/>")
    });
    console.log("[mail] Envoyé OK →", to, "—", opts.subject);
    return { ok: true };
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("[mail] Échec envoi vers", to, ":", msg);
    if (e?.response) {
      console.error("[mail] Réponse SMTP:", e.response);
    }
    transporter = null;
    return { ok: false, erreur: msg };
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
      "Aucun email envoyé : sur Render, ajoutez EMAIL_HOST, EMAIL_USER, EMAIL_PASS (et MAIL_FROM = même email que USER) " +
      "dans Environment du service Web — pas seulement sur Vercel. Redéployez ensuite."
    );
  }
  const detail = resultat.erreur || "erreur inconnue";
  return (
    "L'email n'a pas pu être envoyé. Détail : " +
    detail +
    ". Vérifiez : mot de passe d'application Google (16 caractères), " +
    "validation en 2 étapes activée, MAIL_FROM = la même adresse que EMAIL_USER, variables bien sur Render."
  );
}

/** Au démarrage : teste la connexion SMTP (les logs Render montreront si auth échoue) */
async function verifierSmtpAuDemarrage() {
  if (!smtpConfigure()) {
    console.warn("[mail] Pas de test SMTP : variables manquantes.");
    return;
  }
  try {
    const t = obtenirTransporteur();
    await t.verify();
    console.log("[mail] Test SMTP réussi (connexion + authentification).");
  } catch (e) {
    console.error("[mail] Test SMTP échoué — les mails ne partiront pas tant que ce n'est pas corrigé :", e?.message || e);
  }
}

module.exports = {
  smtpConfigure,
  envoyerMail,
  codesDevAutorises,
  texteAvertissementEmail,
  verifierSmtpAuDemarrage
};
