import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiMapPin, FiCreditCard, FiClock, FiTag, FiCalendar, FiCheck, FiArrowLeft, FiShield } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, usersAPI } from '../services/api';
import { ECUADOR_PROVINCIAS, getCantonesByProvincia } from '../data/ecuadorData';
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
      const cutoffHour = 18;
      const totalElabMin = resumen.tiempoElaboracionEstimado || 0;
      
      let daysToAdd = 1;
      let reasons = [];
      
      if (now.getHours() >= cutoffHour) {
        daysToAdd += 1;
        reasons.push('🌙 Pedido realizado después de las 6:00 PM, se programa para el siguiente día hábil.');
      }
      
      if (totalElabMin > 300) {
        daysToAdd += 1;
        reasons.push('⚠️ Contiene productos con alto tiempo de preparación artesanal (+1 día).');
      }

      // Factor: stock insuficiente
      const hayStockBajo = items.some(item => (item.cantidad || 1) > (item.stock || 0));
      if (hayStockBajo) {
        daysToAdd += 1;
        reasons.push('⏳ Algunos productos requieren reposición del proveedor (+1 día).');
      }
      
      if (reasons.length === 0) {
        reasons.push('🥖 Pedido procesado a tiempo para entrega del día siguiente.');
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
        reason: reasons.join(' ')
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
  const [cardFields, setCardFields] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    tipo: 'tarjeta_credito'
  });

  const [gatewayPhase, setGatewayPhase] = useState(0);
  const [gatewayMessage, setGatewayMessage] = useState('');

  // Live Coupon validation
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' });
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!form.codigo_cupon.trim()) {
      setCouponMsg({ type: 'error', text: 'Ingresa un código de cupón' });
      return;
    }
    setValidatingCoupon(true);
    setCouponMsg({ type: '', text: '' });
    try {
      const res = await ordersAPI.validateCoupon({
        codigo_cupon: form.codigo_cupon,
        subtotal: resumen.subtotal
      });
      setCouponApplied(res.data.data);
      setCouponMsg({
        type: 'success',
        text: `¡Cupón APLICADO! Descuento de $${res.data.data.monto_descuento.toFixed(2)}`
      });
    } catch (err) {
      setCouponApplied(null);
      setCouponMsg({ type: 'error', text: err.response?.data?.message || 'Cupón no válido' });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const detectCardBrand = (number) => {
    const clean = number.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'American Express';
    if (/^36|^30[0-5]|^38/.test(clean)) return 'Diners';
    if (/^6011|^65|^64[4-9]/.test(clean)) return 'Discover';
    return 'Tarjeta';
  };

  const luhnCheck = (number) => {
    const clean = number.replace(/\D/g, '');
    if (clean.length < 13 || clean.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let n = parseInt(clean[i], 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  };

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
      setNewAddress({ alias: '', calle: '', ciudad: 'Quito', provincia: 'Pichincha', referencia: '', es_principal: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al agregar dirección');
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setError('');
    const cleanNum = cardFields.number.replace(/\D/g, '');
    if (cleanNum.length < 16) {
      setError('El número de tarjeta debe tener 16 dígitos.');
      return;
    }
    const cleanExpiry = cardFields.expiry.replace(/\D/g, '');
    if (cleanExpiry.length < 4) {
      setError('Fecha de vencimiento inválida. Formato MM/YY.');
      return;
    }
    if (cardFields.cvv.length < 3) {
      setError('El código de seguridad CVV debe tener al menos 3 dígitos.');
      return;
    }

    try {
      const marca = detectCardBrand(cardFields.number);
      const ultimos_4_digitos = cleanNum.slice(-4);
      const token_cifrado = `tok_${Math.random().toString(36).substring(2, 10)}`;
      
      const payload = {
        tipo: cardFields.tipo,
        ultimos_4_digitos,
        marca,
        token_cifrado,
        es_principal: true
      };

      const res = await usersAPI.addPaymentMethod(payload);
      setPaymentMethods([...paymentMethods, res.data.data]);
      setForm(f => ({ ...f, id_metodo_pago: res.data.data.id_metodo }));
      setShowNewPayment(false);
      setCardFields({ number: '', name: '', expiry: '', cvv: '', tipo: 'tarjeta_credito' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al agregar método de pago');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.id_direccion) { setError('Selecciona una dirección de entrega'); return; }
    if (!form.id_metodo_pago) { setError('Selecciona un método de pago'); return; }

    const selectedPayment = paymentMethods.find(pm => pm.id_metodo == form.id_metodo_pago);
    const paymentBrand = selectedPayment ? selectedPayment.marca : 'Tarjeta';
    const paymentLast4 = selectedPayment ? selectedPayment.ultimos_4_digitos : '••••';
    const formattedAmount = parseFloat(resumen.subtotal).toFixed(2);

    setSubmitting(true);
    setGatewayPhase(1);
    setGatewayMessage('Conectando de forma segura con la pasarela de pagos...');

    // Phase 1 -> Phase 2 (1.5s)
    setTimeout(() => {
      setGatewayPhase(2);
      setGatewayMessage(`Procesando pago por $${formattedAmount} a través de ${paymentBrand} terminada en ${paymentLast4}...`);

      // Phase 2 -> Phase 3 (1.5s)
      setTimeout(() => {
        setGatewayPhase(3);
        setGatewayMessage('¡Pago Aprobado con Éxito! Guardando pedido...');

        // Phase 3 -> Backend Call (1.2s)
        setTimeout(async () => {
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
            clearCart();
          } catch (err) {
            setError(err.response?.data?.message || 'Error al procesar el pedido con el servidor.');
          } finally {
            setGatewayPhase(0);
            setSubmitting(false);
          }
        }, 1200);

      }, 1500);

    }, 1500);
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
                  <input className="input" placeholder="Alias (ej: Casa, Oficina)" value={newAddress.alias}
                    onChange={e => setNewAddress({ ...newAddress, alias: e.target.value })} />
                  
                  <div className="inline-row">
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Provincia (Ecuador)</label>
                      <select className="input" required value={newAddress.provincia}
                        onChange={e => {
                          const prov = e.target.value;
                          const cantones = getCantonesByProvincia(prov);
                          const firstCanton = cantones[0] || '';
                          setNewAddress({ ...newAddress, provincia: prov, ciudad: firstCanton });
                        }}>
                        {Object.keys(ECUADOR_PROVINCIAS).map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cantón / Ciudad</label>
                      <select className="input" required value={newAddress.ciudad}
                        onChange={e => setNewAddress({ ...newAddress, ciudad: e.target.value })}>
                        {getCantonesByProvincia(newAddress.provincia).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <input className="input" placeholder="Calle principal, secundaria y # de casa/dpto *" required value={newAddress.calle}
                    onChange={e => setNewAddress({ ...newAddress, calle: e.target.value })} />

                  <input className="input" placeholder="Referencia (ej: Frente al parque)" value={newAddress.referencia}
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
                <div className="new-card-flow" style={{ width: '100%' }}>
                  {/* Interactive card preview */}
                  <div className="card-wrapper">
                    <div className={`interactive-card ${detectCardBrand(cardFields.number).toLowerCase()}`}>
                      <div className="card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-chip"></div>
                        <div className="card-logo">
                          {detectCardBrand(cardFields.number)}
                        </div>
                      </div>
                      <div className="card-number">
                        {cardFields.number || '•••• •••• •••• ••••'}
                      </div>
                      <div className="card-info-row">
                        <div>
                          <div className="card-info-label">Titular</div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cardFields.name || 'NOMBRE APELLIDO'}</div>
                        </div>
                        <div>
                          <div className="card-info-label">Vence</div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cardFields.expiry || 'MM/YY'}</div>
                        </div>
                        <div>
                          <div className="card-info-label">CVV</div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cardFields.cvv ? '•••' : '•••'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form className="inline-form" onSubmit={handleAddPayment} style={{ marginTop: '16px' }}>
                    <div className="inline-row">
                      <div className="input-group">
                        <label>Tipo de tarjeta</label>
                        <select className="input" value={cardFields.tipo}
                          onChange={e => setCardFields({ ...cardFields, tipo: e.target.value })}>
                          <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                          <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Nombre del Titular (Solo letras)</label>
                        <input className="input" placeholder="TITULAR DE LA TARJETA" required maxLength={40}
                          value={cardFields.name}
                          onChange={e => {
                            const cleanLetters = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                            setCardFields({ ...cardFields, name: cleanLetters.toUpperCase() });
                          }} />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Número de Tarjeta</label>
                      <input className="input" placeholder="4000 1234 5678 9010" required
                        value={cardFields.number}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = clean.replace(/(\d{4})(?=\d)/g, '$1 ');
                          setCardFields({ ...cardFields, number: formatted });
                        }} />
                    </div>

                    <div className="inline-row">
                      <div className="input-group">
                        <label>Vencimiento</label>
                        <input className="input" placeholder="MM/YY" required maxLength={5}
                          value={cardFields.expiry}
                          onChange={e => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                            const formatted = clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
                            setCardFields({ ...cardFields, expiry: formatted });
                          }} />
                      </div>
                      <div className="input-group">
                        <label>CVV</label>
                        <input className="input" placeholder="123" required type="password" maxLength={4}
                          value={cardFields.cvv}
                          onChange={e => setCardFields({ ...cardFields, cvv: e.target.value.replace(/\D/g, '') })} />
                      </div>
                    </div>
                    
                    <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '12px', width: '100%' }}>
                      Guardar Tarjeta Segura
                    </button>
                  </form>
                </div>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="input" placeholder="Ej: BIENVENIDO10" value={form.codigo_cupon}
                    style={{ flex: 1 }}
                    onChange={e => setForm({ ...form, codigo_cupon: e.target.value.toUpperCase() })} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleApplyCoupon} disabled={validatingCoupon}>
                    {validatingCoupon ? 'Validando...' : 'Aplicar Cupón'}
                  </button>
                </div>
                {couponMsg.text && (
                  <p style={{
                    fontSize: '0.85rem',
                    marginTop: '6px',
                    color: couponMsg.type === 'success' ? '#10b981' : '#ef4444',
                    fontWeight: 500
                  }}>
                    {couponMsg.text}
                  </p>
                )}
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

            {couponApplied && (
              <div className="summary-row" style={{ color: '#10b981', fontWeight: 600 }}>
                <span>Descuento ({couponApplied.codigo})</span>
                <span>-${couponApplied.monto_descuento.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-row">
              <span><FiClock size={14} /> Elaboración estimada</span>
              <span>{formatTime(resumen.tiempoElaboracionEstimado)}</span>
            </div>

            <div className="summary-divider" />

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>
                ${(
                  parseFloat(resumen.subtotal) - (couponApplied ? couponApplied.monto_descuento : 0)
                ).toFixed(2)}
              </span>
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
      {gatewayPhase > 0 && (
        <div className="gateway-overlay">
          <div className="gateway-content">
            <div className="gateway-spinner-ring">
              <div></div><div></div><div></div><div></div>
            </div>
            <p className="gateway-phase-text">{gatewayMessage}</p>
            <div className="gateway-secured-badge">
              🔒 Transacción Encriptada (PCI-DSS)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
