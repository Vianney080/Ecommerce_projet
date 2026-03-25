import { Link } from "react-router-dom";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <p className="footer-logo">CosmetiShop</p>
            <p className="footer-description">
              Votre boutique beaute en ligne avec une experience simple, rapide et elegante.
            </p>
            <div className="footer-socials">
              <a href="#" className="footer-social-link" aria-label="Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4.1" />
                  <circle cx="17.6" cy="6.4" r="1.1" />
                </svg>
                <span>Instagram</span>
              </a>
              <a href="#" className="footer-social-link" aria-label="Facebook">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1z" />
                </svg>
                <span>Facebook</span>
              </a>
              <a href="#" className="footer-social-link" aria-label="TikTok">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 4c.7 1.8 2.1 3 4 3.4V11a8.2 8.2 0 0 1-3.8-1v5.4a5.2 5.2 0 1 1-4.7-5.2v3.4a1.9 1.9 0 1 0 1.3 1.8V4H14z" />
                </svg>
                <span>TikTok</span>
              </a>
            </div>
            <div className="footer-newsletter">
              <p className="footer-newsletter-title">Newsletter beaute</p>
              <p className="footer-newsletter-text">Recevez nos nouveautes et offres exclusives.</p>
              <form className="footer-newsletter-form" onSubmit={(event) => event.preventDefault()}>
                <label htmlFor="newsletter-email-global" className="sr-only">
                  Adresse email
                </label>
                <input id="newsletter-email-global" type="email" placeholder="Votre email" />
                <button type="submit">S&apos;inscrire</button>
              </form>
            </div>
          </div>

          <div className="footer-column">
            <p className="footer-column-title">Boutique</p>
            <Link to="/">Accueil</Link>
            <Link to="/catalogue">Catalogue</Link>
            <Link to="/espace-client">Espace client</Link>
          </div>

          <div className="footer-column">
            <p className="footer-column-title">Compte</p>
            <Link to="/connexion">Se connecter</Link>
            <Link to="/inscription">Creer un compte</Link>
            <Link to="/commandes">Suivi commande</Link>
          </div>

          <div className="footer-column">
            <p className="footer-column-title">Contact</p>
            <a href="mailto:contact@cosmetishop.com">contact@cosmetishop.com</a>
            <a href="tel:5144359870">514 435 9870</a>
            <p className="footer-help">Lun - Sam, 9h00 a 20h00</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CosmetiShop. Tous droits reserves.</p>
          <div className="footer-bottom-links">
            <Link to="/mentions-legales">Mentions legales</Link>
            <Link to="/politique-confidentialite">Confidentialite</Link>
            <Link to="/cgv">CGV</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
