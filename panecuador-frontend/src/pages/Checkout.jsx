import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMapPin, FiCreditCard, FiClock, FiTag, FiCalendar, FiCheck, FiArrowLeft, FiShield } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, usersAPI } from '../services/api';
import './Checkout.css';

export default function Checkout() {
  const { items, resumen, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');


  const [success, setSuccess] = useState(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState({
    dateStr: '',
    formatted: '',
    reason: ''
  });

  const [form, setForm] = useState({
    id_direccion: '',
    id_metodo_pago: '',
    codigo_cupon: '',
    fecha_entrega_programada: '',
    franja_horaria: '',
    notas_cliente: ''
  });

  useEffect(() => {
    if (items.length > 0) {
      const now = new Date();
      const cutoffHour = 18; // 6:00 PM
      const totalElabMin = resumen.tiempoElaboracionEstimado || 0;
      
      let daysToAdd = 1; // Por defecto: Mañana
      let reason = '🥖 Pedido procesado a tiempo para la entrega del día siguiente.';
      
      if (now.getHours() >= cutoffHour) {
        daysToAdd += 1;
        reason = '🌙 Pedido realizado después de la hora límite (6:00 PM), programado para el día siguiente.';
      }
      
      if (totalElabMin > 300) {
        daysToAdd += 1;
        reason = '⚠️ Contiene productos con alto tiempo de preparación, requiere 1 día adicional de elaboración artesanal.';
      }
      
      const deliveryDate = new Date();
      deliveryDate.setDate(now.getDate() + daysToAdd);
      
      const dateStr = deliveryDate.toISOString().split('T')[0];
      const formatted = deliveryDate.toLocaleDateString('es-EC', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedCapitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
      
      setForm(f => ({
        ...f,
        fecha_entrega_programada: f.fecha_entrega_programada || dateStr,
        franja_horaria: f.franja_horaria || '09:00 - 12:00'
      }));
      
      setEstimatedDelivery({
        dateStr,
        formatted: formattedCapitalized,
        reason
      });
    }
  }, [items, resumen.tiempoElaboracionEstimado]);

  // Nuevo dirección form
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    alias: '', calle: '', ciudad: '', provincia: '', referencia: '', es_principal: true
  });

  // Nuevo método de pago form
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    tipo: 'tarjeta_credito', ultimos_4_digitos: '', marca: 'Visa', token_cifrado: 'demo_token', es_principal: true
  });

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (items.length === 0) { navigate('/carrito'); return; }

    async function fetchData() {
      try {
        const res = await usersAPI.getProfile();
        setAddresses(res.data.data.direcciones || []);
        setPaymentMethods(res.data.data.metodosPago || []);
        if (res.data.data.direcciones?.length > 0) {
          const principal = res.data.data.direcciones.find(d => d.es_principal) || res.data.data.direcciones[0];
          setForm(f => ({ ...f, id_direccion: principal.id_direccion }));
        }
        if (res.data.data.metodosPago?.length > 0) {
          const principal = res.data.data.metodosPago.find(p => p.es_principal) || res.data.data.metodosPago[0];
          setForm(f => ({ ...f, id_metodo_pago: principal.id_metodo }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated, items.length, navigate]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await usersAPI.addAddress(newAddress);
      setAddresses([...addresses, res.data.data]);
      setForm({ ...form, id_direccion: res.data.data.id_direccion });
      setShowNewAddress(false);
      setNewAddress({ alias: '', calle: '', ciudad: '', provincia: '', referencia: '', es_principal: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al agregar dirección');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await usersAPI.addPaymentMethod(newPayment);
      setPaymentMethods([...paymentMethods, res.data.data]);
      setForm({ ...form, id_metodo_pago: res.data.data.id_metodo });
      setShowNewPayment(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al agregar método de pago');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.id_direccion) { setError('Selecciona una dirección de entrega'); return; }
    if (!form.id_metodo_pago) { setError('Selecciona un método de pago'); return; }

    setSubmitting(true);
    try {
      const res = await ordersAPI.create({
        id_direccion: parseInt(form.id_direccion),
        id_metodo_pago: parseInt(form.id_metodo_pago),
        codigo_cupon: form.codigo_cupon || undefined,
        fecha_entrega_programada: form.fecha_entrega_programada || undefined,
        franja_horaria: form.franja_horaria || undefined,
        notas_cliente: form.notas_cliente || undefined
      });
      setSuccess(res.data.data.pedido);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  // Pantalla de éxito
  if (success) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="checkout-success animate-fade-in">
            <div className="success-icon">✅</div>
            <h1>¡Pedido Confirmado!</h1>
            <p className="success-order-id">Pedido #{success.id}</p>

            <div className="success-details">
              <div className="success-detail">
                <span>Total</span>
                <strong>${parseFloat(success.total).toFixed(2)}</strong>
              </div>
              <div className="success-detail">
                <span>Productos</span>
                <strong>{success.totalItems}</strong>
              </div>
              <div className="success-detail">
                <span>Tiempo estimado</span>
                <strong>{success.tiempoEstimadoMin} min</strong>
              </div>
              {success.fechaEntregaProgramada && (
                <div className="success-detail">
                  <span>Entrega programada</span>
                  <strong>{new Date(success.fechaEntregaProgramada).toLocaleDateString('es-EC')}</strong>
                </div>
              )}
            </div>

            <div className="success-actions">
              <Link to={`/pedidos`} className="btn btn-primary btn-lg">
                Ver mis pedidos
              </Link>
              <Link to="/catalogo" className="btn btn-secondary btn-lg">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="container">
          <div className="loading-screen"><div className="spinner" /><p>Cargando checkout...</p></div>
        </div>
      </div>
    );
  }

  const formatTime = (min) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m > 0 ? m + 'min' : ''}`;
  };

  // Fecha mínima: mañana
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="checkout-page">
      <div className="container">
        <Link to="/carrito" className="back-link"><FiArrowLeft /> Volver al carrito</Link>
        <h1 className="checkout-title">Finalizar Pedido</h1>

        {error && <div className="auth-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="checkout-layout">
          {/* Left: Form */}
          <div className="checkout-form">
            {/* Address */}
            <div className="checkout-section card">
              <h2><FiMapPin /> Dirección de entrega</h2>
              {addresses.length > 0 ? (
                <div className="address-list">
                  {addresses.map(addr => (
                    <label key={addr.id_direccion}
                      className={`address-option ${form.id_direccion == addr.id_direccion ? 'selected' : ''}`}>
                      <input type="radio" name="address"
                        value={addr.id_direccion}
                        checked={form.id_direccion == addr.id_direccion}
                        onChange={(e) => setForm({ ...form, id_direccion: e.target.value })} />
                      <div>
                        <strong>{addr.alias || 'Dirección'}</strong>
                        <span>{addr.calle}, {addr.ciudad}, {addr.provincia}</span>
                        {addr.referencia && <small>{addr.referencia}</small>}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No tienes direcciones guardadas.</p>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNewAddress(!showNewAddress)}>
                + Agregar nueva dirección
              </button>
              {showNewAddress && (
                <form className="inline-form" onSubmit={handleAddAddress}>
                  <input className="input" placeholder="Alias (ej: Casa)" value={newAddress.alias}
                    onChange={e => setNewAddress({ ...newAddress, alias: e.target.value })} />
                  <input className="input" placeholder="Calle y número *" required value={newAddress.calle}
                    onChange={e => setNewAddress({ ...newAddress, calle: e.target.value })} />
                  <div className="inline-row">
                    <input className="input" placeholder="Ciudad *" required value={newAddress.ciudad}
                      onChange={e => setNewAddress({ ...newAddress, ciudad: e.target.value })} />
                    <input className="input" placeholder="Provincia *" required value={newAddress.provincia}
                      onChange={e => setNewAddress({ ...newAddress, provincia: e.target.value })} />
                  </div>
                  <input className="input" placeholder="Referencia" value={newAddress.referencia}
                    onChange={e => setNewAddress({ ...newAddress, referencia: e.target.value })} />
                  <button type="submit" className="btn btn-primary btn-sm">Guardar dirección</button>
                </form>
              )}
            </div>

            {/* Payment */}
            <div className="checkout-section card">
              <h2><FiCreditCard /> Método de pago</h2>
              {paymentMethods.length > 0 ? (
                <div className="address-list">
                  {paymentMethods.map(pm => (
                    <label key={pm.id_metodo}
                      className={`address-option ${form.id_metodo_pago == pm.id_metodo ? 'selected' : ''}`}>
                      <input type="radio" name="payment"
                        value={pm.id_metodo}
                        checked={form.id_metodo_pago == pm.id_metodo}
                        onChange={(e) => setForm({ ...form, id_metodo_pago: e.target.value })} />
                      <div>
                        <strong>{pm.marca} •••• {pm.ultimos_4_digitos}</strong>
                        <span>{pm.tipo.replace('_', ' ')}</span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No tienes métodos de pago guardados.</p>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNewPayment(!showNewPayment)}>
                + Agregar método de pago
              </button>
              {showNewPayment && (
                <form className="inline-form" onSubmit={handleAddPayment}>
                  <select className="input" value={newPayment.tipo}
                    onChange={e => setNewPayment({ ...newPayment, tipo: e.target.value })}>
                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                    <option value="tarjeta_debito">Tarjeta de Débito</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                  <div className="inline-row">
                    <select className="input" value={newPayment.marca}
                      onChange={e => setNewPayment({ ...newPayment, marca: e.target.value })}>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="Diners">Diners</option>
                    </select>
                    <input className="input" placeholder="Últimos 4 dígitos" maxLength={4} minLength={4}
                      value={newPayment.ultimos_4_digitos}
                      onChange={e => setNewPayment({ ...newPayment, ultimos_4_digitos: e.target.value })} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">Guardar método</button>
                </form>
              )}
            </div>

            {/* Delivery */}
            <div className="checkout-section card">
              <h2><FiCalendar /> Entrega programada (Garantizada estilo Amazon)</h2>
              
              <div className="amazon-delivery-indicator">
                <div className="indicator-header">
                  <span className="amazon-badge">✓ Envío Garantizado</span>
                  <h4>Fecha estimada de entrega</h4>
                </div>
                <p className="delivery-date-highlight">
                  Llega el <strong>{estimatedDelivery.formatted || 'Cargando...'}</strong>
                </p>
                <p className="delivery-reason-hint">{estimatedDelivery.reason}</p>
              </div>

              <p className="section-hint" style={{ marginTop: '16px' }}>
                Si deseas reprogramar para una fecha posterior, puedes cambiarla a continuación:
              </p>

              <div className="inline-row">
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Cambiar fecha de entrega</label>
                  <input type="date" className="input" min={minDate} value={form.fecha_entrega_programada}
                    onChange={e => setForm({ ...form, fecha_entrega_programada: e.target.value })} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Franja horaria de entrega</label>
                  <select className="input" value={form.franja_horaria}
                    onChange={e => setForm({ ...form, franja_horaria: e.target.value })}>
                    <option value="06:00 - 09:00">🌅 06:00 - 09:00</option>
                    <option value="09:00 - 12:00">☀️ 09:00 - 12:00</option>
                    <option value="12:00 - 15:00">🌤 12:00 - 15:00</option>
                    <option value="15:00 - 18:00">🌇 15:00 - 18:00</option>
                    <option value="18:00 - 21:00">🌙 18:00 - 21:00</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Coupon & Notes */}
            <div className="checkout-section card">
              <h2><FiTag /> Cupón y notas</h2>
              <div className="input-group">
                <label>Código de cupón</label>
                <input className="input" placeholder="Ej: BIENVENIDO10" value={form.codigo_cupon}
                  onChange={e => setForm({ ...form, codigo_cupon: e.target.value.toUpperCase() })} />
              </div>
              <div className="input-group">
                <label>Notas especiales</label>
                <textarea className="input" placeholder="Instrucciones especiales para tu pedido..."
                  rows={3} value={form.notas_cliente}
                  onChange={e => setForm({ ...form, notas_cliente: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <aside className="checkout-summary card">
            <h3>Resumen del pedido</h3>

            <div className="summary-items">
              {items.map(item => (
                <div key={item.id_carrito} className="summary-item">
                  <span className="summary-item-qty">{item.cantidad}x</span>
                  <span className="summary-item-name">{item.nombre}</span>
                  <span className="summary-item-price">${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="summary-divider" />

            <div className="summary-row">
              <span>Subtotal ({resumen.totalItems} items)</span>
              <span>${parseFloat(resumen.subtotal).toFixed(2)}</span>
            </div>

            <div className="summary-row">
              <span><FiClock size={14} /> Elaboración estimada</span>
              <span>{formatTime(resumen.tiempoElaboracionEstimado)}</span>
            </div>

            <div className="summary-divider" />

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>${parseFloat(resumen.subtotal).toFixed(2)}</span>
            </div>

            <button
              className="btn btn-accent btn-lg summary-checkout-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              ) : (
                <><FiCheck /> Confirmar Pedido</>
              )}
            </button>

            <div className="summary-secure">
              <FiShield size={14} /> Pago seguro garantizado
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
