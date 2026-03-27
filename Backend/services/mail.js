const nodemailer = require("nodemailer");

function resendActif() {
  return Boolean(String(process.env.RESEND_API_KEY || "").trim());
}

function echapperHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Envoi via l’API Resend (HTTPS :443) — fonctionne sur Render gratuit où SMTP sortant est souvent bloqué.
 * @returns {Promise<{ ok: boolean; erreur?: string }>}
 */
async function envoyerViaResend(opts) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  const to = String(opts.to || "").trim();
  const html =
    opts.html ||
    `<div style="font-family:sans-serif;white-space:pre-wrap">${echapperHtml(opts.text || "")}</div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: String(process.env.RESEND_FROM || "onboarding@resend.dev").trim(),
        to: [to],
        subject: opts.subject,
        html,
        text: opts.text
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = Array.isArray(data?.errors)
        ? data.errors.map((e) => e.message).join("; ")
        : data?.message || `HTTP ${r.status}`;
      console.error("[mail] Resend échec:", err, data);
      return { ok: false, erreur: err };
    }
    console.log("[mail] Resend OK →", to, "—", opts.subject);
    return { ok: true };
  } catch (e) {
    const msg = e?.message || String(e);
    console.error("[mail] Resend exception:", msg);
    return { ok: false, erreur: msg };
  }
}

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

  if (resendActif()) {
    return envoyerViaResend({ ...opts, to });
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
      "Aucun email envoyé : sur Render, ajoutez RESEND_API_KEY (recommandé, HTTPS) ou bien EMAIL_HOST, EMAIL_USER, EMAIL_PASS " +
      "(et MAIL_FROM = même email que USER) dans Environment du service Web — pas seulement sur Vercel. Redéployez ensuite."
    );
  }
  const detail = resultat.erreur || "erreur inconnue";
  if (/timeout|timed out|etimedout|econnreset|connection closed unexpectedly/i.test(detail)) {
    return (
      "L'email n'a pas pu être envoyé. Connexion SMTP bloquée ou expirée (souvent « Connection timeout »). " +
      "Sur Render gratuit, la sortie vers Gmail (ports 587 / 465) est souvent impossible : ce n'est pas forcément un mauvais mot de passe. " +
      "Solution recommandée : ajouter RESEND_API_KEY sur Render (envoi via HTTPS, port 443). " +
      "Alternative : plan Render payant si votre offre autorise le SMTP sortant. Détail : " +
      detail
    );
  }
  // Resend (clé API sans domaine vérifié) : seuls les destinataires « autorisés » par le compte Resend reçoivent les mails.
  if (/only send testing emails to your own email|verify a domain at resend\.com/i.test(detail)) {
    return (
      "L’email n’a pas pu être envoyé : votre compte Resend est en mode test (expéditeur type onboarding@resend.dev). " +
      "Resend n’autorise alors que l’envoi vers l’adresse liée au compte Resend, pas vers n’importe quel client. " +
      "Pour envoyer les codes d’inscription à de vrais utilisateurs : vérifiez un domaine sur https://resend.com/domains , " +
      "puis définissez RESEND_FROM sur Render avec une adresse de ce domaine (ex. noreply@votredomaine.com). " +
      "Détail technique : " +
      detail
    );
  }
  return (
    "L'email n'a pas pu être envoyé. Détail : " +
    detail +
    ". Vérifiez : mot de passe d'application Google (16 caractères), " +
    "validation en 2 étapes activée, MAIL_FROM = la même adresse que EMAIL_USER, variables bien sur Render."
  );
}

/** Au démarrage : teste la connexion SMTP (les logs Render montreront si auth échoue) */
async function verifierSmtpAuDemarrage() {
  if (resendActif()) {
    console.log(
      "[mail] RESEND_API_KEY défini : envoi des mails via l’API Resend (HTTPS). Le SMTP n’est pas utilisé — adapté au plan Render gratuit."
    );
    return;
  }
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

/** True si RESEND_API_KEY est définie (Render / .env) — prioritaire sur SMTP dans envoyerMail */
function resendConfigure() {
  return resendActif();
}

module.exports = {
  smtpConfigure,
  resendConfigure,
  envoyerMail,
  codesDevAutorises,
  texteAvertissementEmail,
  verifierSmtpAuDemarrage
};
