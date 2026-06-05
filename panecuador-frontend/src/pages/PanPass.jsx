import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiTruck, FiPercent, FiBox, FiStar, FiArrowRight } from 'react-icons/fi';
import { subscriptionsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PanPass.css';

export default function PanPass() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [mySub, setMySub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const plansRes = await subscriptionsAPI.getPlans();
        setPlans(plansRes.data.data);

        if (isAuthenticated) {
          const myRes = await subscriptionsAPI.getMy();
          setMySub(myRes.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated]);

  const handleSubscribe = (planId) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    // En una app real se procesaría el pago aquí
    alert('Para suscribirte necesitas tener un método de pago configurado. Ve a tu perfil para agregarlo.');
  };

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de cancelar tu suscripción PanPass?')) return;
    try {
      await subscriptionsAPI.cancel();
      setMySub(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cancelar');
    }
  };

  if (loading) {
    return (
      <div className="panpass-page">
        <div className="container">
          <div className="loading-screen"><div className="spinner" /><p>Cargando PanPass...</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="panpass-page">
      {/* Hero */}
      <section className="pp-hero">
        <div className="pp-hero-bg" />
        <div className="container pp-hero-content">
          <span className="pp-hero-badge">⭐ PANPASS</span>
          <h1>Tu membresía de panadería artesanal</h1>
          <p>
            Disfruta de entregas gratis, descuentos exclusivos y cajas mensuales sorpresa
            con los mejores productos de panadería y pastelería ecuatoriana.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="pp-benefits section">
        <div className="container">
          <h2 className="section-title text-center" style={{ margin: '0 auto var(--space-2xl)', textAlign: 'center' }}>
            Beneficios PanPass
          </h2>
          <div className="pp-benefits-grid">
            <div className="pp-benefit">
              <div className="pp-benefit-icon"><FiTruck /></div>
              <h3>Entregas Gratis</h3>
              <p>Todos tus pedidos sin costo de envío, sin mínimo de compra</p>
            </div>
            <div className="pp-benefit">
              <div className="pp-benefit-icon"><FiPercent /></div>
              <h3>Descuentos Exclusivos</h3>
              <p>Hasta 15% de descuento en todos los productos del catálogo</p>
            </div>
            <div className="pp-benefit">
              <div className="pp-benefit-icon"><FiBox /></div>
              <h3>Caja Mensual Sorpresa</h3>
              <p>Recibe una selección curada de productos artesanales cada mes (Plus)</p>
            </div>
            <div className="pp-benefit">
              <div className="pp-benefit-icon"><FiStar /></div>
              <h3>Acceso Prioritario</h3>
              <p>Sé el primero en probar nuevos productos y ediciones limitadas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Active subscription */}
      {mySub && mySub.estado === 'activa' && (
        <section className="pp-active section">
          <div className="container">
            <div className="pp-active-card">
              <div className="pp-active-header">
                <span className="pp-active-badge">⭐ TU PLAN ACTIVO</span>
                <h2>{mySub.plan_nombre}</h2>
              </div>
              <div className="pp-active-details">
                <div className="pp-active-detail">
                  <span>Precio</span>
                  <strong>${parseFloat(mySub.precio_mensual).toFixed(2)}/mes</strong>
                </div>
                <div className="pp-active-detail">
                  <span>Descuento</span>
                  <strong>{parseFloat(mySub.descuento_porcentaje)}%</strong>
                </div>
                <div className="pp-active-detail">
                  <span>Desde</span>
                  <strong>{new Date(mySub.fecha_inicio).toLocaleDateString('es-EC')}</strong>
                </div>
                <div className="pp-active-detail">
                  <span>Renovación</span>
                  <strong>{new Date(mySub.fecha_renovacion).toLocaleDateString('es-EC')}</strong>
                </div>
              </div>

              {mySub.cajas && mySub.cajas.length > 0 && (
                <div className="pp-boxes">
                  <h3>📦 Tus Cajas PanPass</h3>
                  <div className="pp-boxes-grid">
                    {mySub.cajas.map((caja, idx) => (
                      <div key={idx} className="pp-box-card">
                        <span className="pp-box-date">
                          {new Date(caja.mes_anio).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}
                        </span>
                        <span className={`badge badge-${caja.estado === 'entregada' ? 'success' : caja.estado === 'enviada' ? 'primary' : 'warning'}`}>
                          {caja.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-secondary" onClick={handleCancel}
                style={{ color: 'var(--color-error)', marginTop: 'var(--space-lg)' }}>
                Cancelar suscripción
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Plans */}
      <section className="pp-plans section">
        <div className="container">
          <h2 className="section-title text-center" style={{ margin: '0 auto var(--space-2xl)', textAlign: 'center' }}>
            Elige tu plan
          </h2>
          <div className="pp-plans-grid">
            {plans.map((plan, idx) => (
              <div key={plan.id_membresia} className={`pp-plan-card ${idx === 1 ? 'pp-plan-featured' : ''}`}>
                {idx === 1 && <div className="pp-plan-popular">⭐ Más popular</div>}
                <h3>{plan.nombre}</h3>
                <div className="pp-plan-price">
                  <span className="pp-price-amount">${parseFloat(plan.precio_mensual).toFixed(2)}</span>
                  <span className="pp-price-period">/mes</span>
                </div>
                <p className="pp-plan-desc">{plan.descripcion}</p>
                <ul className="pp-plan-features">
                  <li><FiCheck className="check-icon" /> Entregas gratis ilimitadas</li>
                  <li><FiCheck className="check-icon" /> {parseFloat(plan.descuento_porcentaje)}% de descuento</li>
                  {plan.incluye_caja && (
                    <li><FiCheck className="check-icon" /> Caja mensual sorpresa</li>
                  )}
                  <li><FiCheck className="check-icon" /> Acceso prioritario</li>
                  <li><FiCheck className="check-icon" /> Soporte preferente</li>
                </ul>
                <button
                  className={`btn ${idx === 1 ? 'btn-panpass' : 'btn-primary'} btn-lg pp-plan-btn`}
                  onClick={() => handleSubscribe(plan.id_membresia)}
                  disabled={mySub?.estado === 'activa'}
                >
                  {mySub?.estado === 'activa' ? 'Ya tienes un plan' : 'Suscribirme'} <FiArrowRight />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
