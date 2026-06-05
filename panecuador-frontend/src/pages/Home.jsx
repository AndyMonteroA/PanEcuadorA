import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTruck, FiClock, FiShield, FiStar, FiArrowRight, FiBox } from 'react-icons/fi';
import ProductCard from '../components/product/ProductCard';
import { productsAPI, categoriesAPI } from '../services/api';
import './Home.css';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, catRes] = await Promise.all([
          productsAPI.getFeatured(),
          categoriesAPI.getAll()
        ]);
        setFeaturedProducts(prodRes.data.data);
        setCategories(catRes.data.data);
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const categoryEmojis = ['🥖', '🎂', '🥮', '🍰', '🌾', '🎄'];

  return (
    <div className="home">
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-particles">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="particle" style={{ '--delay': `${i * 0.5}s`, '--x': `${20 + i * 15}%` }}>
                {['🥐', '🍞', '🎂', '🧁', '🥖', '🍰'][i]}
              </span>
            ))}
          </div>
        </div>
        <div className="container hero-content">
          <div className="hero-text">
            <span className="hero-badge">🇪🇨 Sabor ecuatoriano artesanal</span>
            <h1 className="hero-title">
              Pan fresco y pasteles
              <span className="hero-highlight"> directo a tu puerta</span>
            </h1>
            <p className="hero-desc">
              Descubre los mejores productos de panadería y pastelería ecuatoriana.
              Pedidos con anticipación, productos frescos de máximo 3 días, 
              y entregas programadas a tu conveniencia.
            </p>
            <div className="hero-actions">
              <Link to="/catalogo" className="btn btn-accent btn-lg">
                Explorar Catálogo <FiArrowRight />
              </Link>
              <Link to="/panpass" className="btn btn-panpass btn-lg">
                ⭐ Conocer PanPass
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-stack">
              <div className="hero-float-card card-1">🥐<span>Pan de Yema</span><small>$0.35</small></div>
              <div className="hero-float-card card-2">🎂<span>Tres Leches</span><small>$12.50</small></div>
              <div className="hero-float-card card-3">🥖<span>Pan de Agua</span><small>$0.25</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="features section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card animate-fade-in">
              <div className="feature-icon"><FiClock /></div>
              <h3>Pedidos Anticipados</h3>
              <p>Programa tu pedido y te damos estimación exacta de entrega</p>
            </div>
            <div className="feature-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="feature-icon"><FiBox /></div>
              <h3>Frescura 3 Días</h3>
              <p>Productos con máximo 3 días de elaboración garantizado</p>
            </div>
            <div className="feature-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="feature-icon"><FiTruck /></div>
              <h3>Entrega Programada</h3>
              <p>Elige la fecha y franja horaria que mejor te convenga</p>
            </div>
            <div className="feature-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="feature-icon"><FiShield /></div>
              <h3>Pago Seguro</h3>
              <p>Tarjetas de crédito, débito y transferencia bancaria</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES ============ */}
      <section className="categories-section section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Nuestras Categorías</h2>
            <Link to="/catalogo" className="section-link">
              Ver todas <FiArrowRight />
            </Link>
          </div>
          <div className="categories-grid">
            {categories.map((cat, index) => (
              <Link
                key={cat.id_categoria}
                to={`/catalogo?categoria=${cat.id_categoria}`}
                className="category-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="category-emoji">{categoryEmojis[index] || '🍞'}</span>
                <h3>{cat.nombre}</h3>
                <p>{cat.descripcion}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURED PRODUCTS ============ */}
      <section className="featured-section section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Productos Destacados</h2>
            <Link to="/catalogo" className="section-link">
              Ver todos <FiArrowRight />
            </Link>
          </div>
          
          {loading ? (
            <div className="products-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="product-skeleton">
                  <div className="skeleton" style={{ height: '200px' }} />
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="skeleton" style={{ height: '14px', width: '60%' }} />
                    <div className="skeleton" style={{ height: '18px', width: '90%' }} />
                    <div className="skeleton" style={{ height: '14px', width: '40%' }} />
                    <div className="skeleton" style={{ height: '24px', width: '30%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id_producto} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ PANPASS CTA ============ */}
      <section className="panpass-section section">
        <div className="container">
          <div className="panpass-cta">
            <div className="panpass-content">
              <span className="panpass-badge">⭐ PANPASS</span>
              <h2>Tu membresía de panadería artesanal</h2>
              <p>
                Entregas gratis, descuentos exclusivos y cajas mensuales sorpresa 
                con los mejores productos de panadería ecuatoriana.
              </p>
              <div className="panpass-plans">
                <div className="panpass-plan">
                  <h4>PanPass Básico</h4>
                  <span className="plan-price">$4.99<small>/mes</small></span>
                  <ul>
                    <li>✅ Entregas gratis</li>
                    <li>✅ 10% descuento</li>
                  </ul>
                </div>
                <div className="panpass-plan plan-featured">
                  <div className="plan-popular">Más popular</div>
                  <h4>PanPass Plus</h4>
                  <span className="plan-price">$9.99<small>/mes</small></span>
                  <ul>
                    <li>✅ Todo del Básico</li>
                    <li>✅ 15% descuento</li>
                    <li>✅ Caja mensual sorpresa</li>
                  </ul>
                </div>
              </div>
              <Link to="/panpass" className="btn btn-panpass btn-lg">
                Conocer PanPass <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST SECTION ============ */}
      <section className="trust-section section">
        <div className="container text-center">
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            ¿Por qué PanEcuador?
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto var(--space-2xl)' }}>
            Más de 10 productores artesanales ecuatorianos, productos frescos elaborados 
            en turnos rotativos 24/7 para garantizar disponibilidad.
          </p>
          <div className="trust-stats">
            <div className="stat-card">
              <span className="stat-number">10+</span>
              <span className="stat-label">Productos artesanales</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">3</span>
              <span className="stat-label">Productores verificados</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Producción en turnos</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">3 días</span>
              <span className="stat-label">Frescura garantizada</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
