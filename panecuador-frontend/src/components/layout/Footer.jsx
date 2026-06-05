import { Link } from 'react-router-dom';
import { FiInstagram, FiFacebook, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-wave">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,40 C360,100 720,0 1080,60 C1260,90 1380,40 1440,50 L1440,100 L0,100 Z" 
                fill="var(--color-secondary)" />
        </svg>
      </div>

      <div className="footer-content">
        <div className="container">
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="logo-icon">🍞</span>
                <span className="logo-name">PanEcuador</span>
              </div>
              <p className="footer-desc">
                Plataforma digital para la comercialización de productos de 
                panadería y pastelería ecuatorianos con suscripciones y entregas programadas.
              </p>
              <div className="footer-social">
                <a href="#" className="social-link" aria-label="Instagram"><FiInstagram size={20} /></a>
                <a href="#" className="social-link" aria-label="Facebook"><FiFacebook size={20} /></a>
                <a href="#" className="social-link" aria-label="Email"><FiMail size={20} /></a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="footer-section">
              <h4 className="footer-title">Explorar</h4>
              <Link to="/catalogo" className="footer-link">Catálogo</Link>
              <Link to="/catalogo?categoria=1" className="footer-link">Panes Artesanales</Link>
              <Link to="/catalogo?categoria=2" className="footer-link">Pasteles y Tortas</Link>
              <Link to="/catalogo?categoria=4" className="footer-link">Postres</Link>
              <Link to="/panpass" className="footer-link footer-panpass">⭐ PanPass</Link>
            </div>

            {/* Account */}
            <div className="footer-section">
              <h4 className="footer-title">Mi Cuenta</h4>
              <Link to="/perfil" className="footer-link">Mi Perfil</Link>
              <Link to="/pedidos" className="footer-link">Mis Pedidos</Link>
              <Link to="/favoritos" className="footer-link">Favoritos</Link>
              <Link to="/carrito" className="footer-link">Carrito</Link>
            </div>

            {/* Contact */}
            <div className="footer-section">
              <h4 className="footer-title">Contacto</h4>
              <div className="footer-contact">
                <FiMapPin size={16} />
                <span>Quito, Ecuador</span>
              </div>
              <div className="footer-contact">
                <FiPhone size={16} />
                <span>+593 99 123 4567</span>
              </div>
              <div className="footer-contact">
                <FiMail size={16} />
                <span>info@panecuador.ec</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} PanEcuador. Todos los derechos reservados.</p>
            <p className="footer-credits">Plataforma de Inteligencia de Negocios</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
