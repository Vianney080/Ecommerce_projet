/** Textes de validation côté client (formulation claire pour l’utilisateur). */
export const MSG_EMAIL_INVALIDE =
  "Entrez une adresse e-mail valide, par exemple : prenom@exemple.com.";

export const MSG_EMAIL_REQUIS = "L’adresse e-mail est obligatoire.";

export const MSG_MDP_REQUIS = "Le mot de passe est obligatoire.";

export const MSG_MDP_REGLES =
  "Au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un symbole (par exemple : ! ? # @).";

export const MSG_CONFIRMATION_MDP =
  "Les deux mots de passe ne correspondent pas. Saisissez le même mot de passe deux fois.";

export const MSG_NOM_INVALIDE = "Indiquez votre nom ou prénom (2 à 60 caractères).";

export const MSG_CODE_6 =
  "Le code reçu par e-mail comporte exactement 6 chiffres. Vérifiez votre boîte de réception.";

export const MSG_CONFIDENTIALITE =
  "Vous devez accepter la politique de confidentialité pour créer un compte.";

/** Rend les réponses API plus lisibles (connexion, inscription, mot de passe, etc.). */
export function clarifierMessageApiAuth(message: string | undefined | null): string {
  const m = String(message || "").trim();
  if (!m) return "Une erreur s’est produite. Réessayez dans quelques instants.";

  const exact: Record<string, string> = {
    "Identifiants invalides":
      "Adresse e-mail ou mot de passe incorrect. Vérifiez vos saisies, ou utilisez « Mot de passe oublié ».",
    "Email et mot de passe requis": "Renseignez votre adresse e-mail et votre mot de passe.",
    "Champs obligatoires manquants": "Certains champs obligatoires sont vides. Complétez le formulaire.",
    "Email déjà utilisé":
      "Cette adresse e-mail est déjà utilisée. Connectez-vous ou récupérez votre mot de passe.",
    "Cet email est deja utilise.":
      "Cette adresse e-mail est déjà utilisée. Connectez-vous ou récupérez votre mot de passe.",
    "Erreur lors de l'inscription":
      "L’inscription n’a pas pu aboutir. Vérifiez vos informations ou réessayez plus tard.",
    "Erreur de connexion":
      "La connexion a échoué. Vérifiez votre connexion internet et réessayez.",
    "Erreur serveur":
      "Le service est temporairement indisponible. Réessayez dans quelques minutes.",
    "Compte desactive. Contactez un administrateur.":
      "Ce compte est désactivé. Pour toute question, contactez le support.",
    "Validez votre adresse email avec le code reçu avant de vous connecter.":
      "Votre compte n’est pas encore activé. Saisissez le code reçu par e-mail sur la page « Vérifier mon e-mail », puis reconnectez-vous.",
    "Utilisateur introuvable":
      "Aucun compte ne correspond à cette adresse. Vérifiez l’e-mail saisi ou créez un compte.",
    "Code incorrect.":
      "Le code saisi est incorrect. Vérifiez les chiffres ou demandez un nouveau code.",
    "Code invalide ou expiré.":
      "Ce code n’est plus valide ou a expiré. Demandez un nouveau code depuis « Mot de passe oublié ».",
    "Code invalide ou expiré. Refaites une demande depuis « Mot de passe oublié ».":
      "Ce code n’est plus valide. Effectuez une nouvelle demande depuis « Mot de passe oublié ».",
    "Aucun code actif. Demandez un nouveau code.":
      "Il n’y a pas de code actif pour ce compte. Demandez un nouveau code par e-mail.",
    "Code expiré. Demandez un nouveau code.":
      "Ce code a expiré. Lancez une nouvelle demande depuis « Mot de passe oublié ».",
    "Adresse email invalide.": MSG_EMAIL_INVALIDE,
    "Le code doit contenir 6 chiffres.": MSG_CODE_6,
    "Erreur lors de la demande de reinitialisation.":
      "L’envoi du code a échoué. Vérifiez votre connexion et réessayez.",
    "Erreur lors de la réinitialisation du mot de passe.":
      "La réinitialisation n’a pas pu être enregistrée. Vérifiez le code et réessayez.",
    "Vérification impossible.":
      "La vérification a échoué. Vérifiez le code à 6 chiffres ou demandez un nouvel e-mail.",
    "Erreur lors de l'envoi.":
      "L’envoi du code a échoué. Vérifiez votre connexion et réessayez.",
  };

  if (exact[m]) return exact[m];

  if (/identifiant/i.test(m) && /invalid/i.test(m)) {
    return exact["Identifiants invalides"]!;
  }

  return m;
}

export function messageErreurRequeteAuth(err: unknown, fallback: string): string {
  const e = err as {
    code?: string;
    message?: string;
    response?: { data?: { message?: string } };
  };
  if (e?.code === "ERR_NETWORK" || e?.message === "Network Error") {
    return "Connexion au serveur impossible. Vérifiez votre réseau (Wi-Fi ou données mobiles).";
  }
  const api = e?.response?.data?.message;
  if (typeof api === "string" && api.trim()) return clarifierMessageApiAuth(api);
  return clarifierMessageApiAuth(fallback);
}
