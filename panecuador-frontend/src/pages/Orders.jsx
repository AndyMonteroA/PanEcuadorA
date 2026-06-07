import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPackage, FiClock, FiMapPin, FiChevronRight, FiX, FiRefreshCw } from 'react-icons/fi';
import { ordersAPI, reviewsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Orders.css';

const estadoConfig = {
  pendiente: { label: 'Pendiente', color: '#E8943D', icon: '⏳' },
  confirmado: { label: 'Confirmado', color: '#3B7EC4', icon: '✅' },
  preparando: { label: 'Preparando', color: '#C47F3B', icon: '👨‍🍳' },
  en_camino: { label: 'En camino', color: '#2D9D5C', icon: '🚚' },
  entregado: { label: 'Entregado', color: '#2D9D5C', icon: '📦' },
  cancelado: { label: 'Cancelado', color: '#D14343', icon: '❌' }
};

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnMotivo, setReturnMotivo] = useState('');
  const [returnComentarios, setReturnComentarios] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [returnSuccess, setReturnSuccess] = useState(false);

  useEffect(() => {
    setShowReturnForm(false);
    setReturnMotivo('');
    setReturnComentarios('');
    setReturnError('');
    setReturnSuccess(false);
  }, [selectedOrder?.id_pedido]);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    fetchOrders();
  }, [isAuthenticated, filter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.estado = filter;
      const res = await ordersAPI.getAll(params);
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function viewDetail(id) {
    setDetailLoading(true);
    try {
      const res = await ordersAPI.getById(id);
      setSelectedOrder(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  async function cancelOrder(id) {
    if (!confirm('¿Estás seguro de cancelar este pedido?')) return;
    try {
      await ordersAPI.cancel(id);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cancelar');
    }
  }

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnMotivo) { setReturnError('Selecciona un motivo principal'); return; }
    if (!returnComentarios.trim()) { setReturnError('Por favor escribe tus comentarios'); return; }

    setSubmittingReturn(true);
    setReturnError('');
    try {
      const motivoCompleto = `${returnMotivo}: ${returnComentarios.trim()}`;
      await reviewsAPI.createReturn({
        id_pedido: selectedOrder.id_pedido,
        motivo: motivoCompleto
      });
      setReturnSuccess(true);
      setShowReturnForm(false);
      viewDetail(selectedOrder.id_pedido);
      fetchOrders();
    } catch (err) {
      setReturnError(err.response?.data?.message || 'Error al enviar la solicitud de devolución.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-EC', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="orders-page">
      <div className="container">
        <h1 className="orders-title"><FiPackage /> Mis Pedidos</h1>

        {/* Filters */}
        <div className="orders-filters">
          {['', 'pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado'].map(f => (
            <button key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}>
              {f ? estadoConfig[f]?.icon + ' ' + estadoConfig[f]?.label : '📋 Todos'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Cargando pedidos...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">📦</span>
            <h3>No tienes pedidos{filter ? ` con estado "${estadoConfig[filter]?.label}"` : ''}</h3>
            <p>¡Explora nuestro catálogo y haz tu primer pedido!</p>
            <Link to="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => {
              const config = estadoConfig[order.estado] || estadoConfig.pendiente;
              return (
                <div key={order.id_pedido} className="order-card card" onClick={() => viewDetail(order.id_pedido)}>
                  <div className="order-card-header">
                    <div>
                      <span className="order-id">Pedido #{order.id_pedido}</span>
                      <span className="order-date">{formatDate(order.fecha_pedido)}</span>
                    </div>
                    <span className="order-status" style={{ background: config.color + '18', color: config.color }}>
                      {config.icon} {config.label}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-info-row">
                      <span><FiClock size={14} /> Elaboración: {order.tiempo_estimado_min} min</span>
                      <span>{order.cantidad_total_items} productos</span>
                    </div>
                    {order.fecha_entrega_programada && (
                      <div className="order-info-row">
                        <span>📅 Entrega: {new Date(order.fecha_entrega_programada).toLocaleDateString('es-EC')}</span>
                        {order.franja_horaria && <span>{order.franja_horaria}</span>}
                      </div>
                    )}
                  </div>

                  <div className="order-card-footer">
                    <span className="order-total">${parseFloat(order.total).toFixed(2)}</span>
                    <span className="order-detail-link">Ver detalle <FiChevronRight /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}><FiX /></button>

              {detailLoading ? (
                <div className="loading-screen" style={{ minHeight: '200px' }}><div className="spinner" /></div>
              ) : (
                <>
                  <div className="modal-header">
                    <h2>Pedido #{selectedOrder.id_pedido}</h2>
                    <span className="order-status" style={{
                      background: (estadoConfig[selectedOrder.estado]?.color || '#888') + '18',
                      color: estadoConfig[selectedOrder.estado]?.color || '#888'
                    }}>
                      {estadoConfig[selectedOrder.estado]?.icon} {estadoConfig[selectedOrder.estado]?.label}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="order-timeline">
                    {['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado'].map((step, idx) => {
                      const stepIdx = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado'].indexOf(selectedOrder.estado);
                      const isActive = idx <= stepIdx && selectedOrder.estado !== 'cancelado';
                      return (
                        <div key={step} className={`timeline-step ${isActive ? 'active' : ''}`}>
                          <div className="timeline-dot">{estadoConfig[step].icon}</div>
                          <span>{estadoConfig[step].label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Items */}
                  <div className="modal-section">
                    <h3>Productos</h3>
                    <div className="order-items-list">
                      {selectedOrder.items?.map((item, idx) => (
                        <div key={idx} className="order-item">
                          <div className="order-item-img">
                            {item.imagen ? <img src={item.imagen} alt="" /> : <span>🍞</span>}
                          </div>
                          <div className="order-item-info">
                            <strong>{item.nombre}</strong>
                            <span>{item.cantidad}x ${parseFloat(item.precio_unitario).toFixed(2)}</span>
                          </div>
                          <span className="order-item-total">${parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="modal-section modal-totals">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                    </div>
                    {parseFloat(selectedOrder.descuento) > 0 && (
                      <div className="summary-row" style={{ color: 'var(--color-success)' }}>
                        <span>Descuento</span>
                        <span>-${parseFloat(selectedOrder.descuento).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="summary-row summary-total">
                      <span>Total</span>
                      <span>${parseFloat(selectedOrder.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Delivery info */}
                  <div className="modal-section">
                    <h3>Entrega</h3>
                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                      <FiMapPin size={14} /> {selectedOrder.calle}, {selectedOrder.ciudad}, {selectedOrder.provincia}
                    </p>
                    {selectedOrder.fecha_entrega_programada && (
                      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        📅 {new Date(selectedOrder.fecha_entrega_programada).toLocaleDateString('es-EC')}
                        {selectedOrder.franja_horaria && ` — ${selectedOrder.franja_horaria}`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {selectedOrder.estado === 'pendiente' && (
                    <button className="btn btn-secondary" style={{ width: '100%', color: 'var(--color-error)' }}
                      onClick={() => cancelOrder(selectedOrder.id_pedido)}>
                      <FiX /> Cancelar pedido
                    </button>
                  )}

                  {selectedOrder.id_devolucion && (
                    <div style={{
                      marginTop: '16px', padding: '14px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--color-primary)'
                    }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                        Solicitud de Devolución
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Motivo: <strong>{selectedOrder.devolucion_motivo}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        Estado: <span className={`admin-badge badge-${
                          selectedOrder.devolucion_estado === 'solicitada' ? 'pendiente' :
                          selectedOrder.devolucion_estado === 'en_proceso' ? 'preparando' :
                          selectedOrder.devolucion_estado === 'resuelta' ? 'confirmado' : 'cancelado'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {selectedOrder.devolucion_estado.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedOrder.estado === 'entregado' && !selectedOrder.id_devolucion && (
                    <div style={{ marginTop: '16px' }}>
                      {!showReturnForm && (
                        <button className="btn btn-secondary" style={{ width: '100%', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => setShowReturnForm(true)}>
                          📦 Solicitar Devolución o Reembolso
                        </button>
                      )}

                      {showReturnForm && (
                        <form onSubmit={handleReturnSubmit} style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                          <h4 style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Formulario de Devolución</h4>
                          {returnError && <div className="auth-error" style={{ marginBottom: '12px' }}>{returnError}</div>}
                          
                          <div className="input-group" style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Motivo principal</label>
                            <select className="input" required value={returnMotivo} onChange={e => setReturnMotivo(e.target.value)}
                              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }}>
                              <option value="">-- Seleccionar --</option>
                              <option value="Productos dañados o en mal estado">🥖 Productos dañados o en mal estado</option>
                              <option value="Pedido equivocado o incompleto">📦 Pedido equivocado o incompleto</option>
                              <option value="Retraso excesivo en la entrega">⏳ Retraso excesivo en la entrega</option>
                              <option value="Calidad no corresponde a lo esperado">⭐ Calidad no corresponde a lo esperado</option>
                              <option value="Otro">✏️ Otro (especificar abajo)</option>
                            </select>
                          </div>
                          
                          <div className="input-group" style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Comentarios adicionales</label>
                            <textarea className="input" rows={3} placeholder="Explica detalladamente la razón de la devolución..." required value={returnComentarios} onChange={e => setReturnComentarios(e.target.value)}
                              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '4px' }} />
                          </div>
                          
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={submittingReturn}>
                              {submittingReturn ? 'Enviando...' : 'Enviar Solicitud'}
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowReturnForm(false); setReturnError(''); }}>
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {returnSuccess && (
                    <div style={{
                      marginTop: '16px', padding: '12px', borderRadius: '6px',
                      background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)',
                      color: '#22c55e', fontSize: '0.85rem'
                    }}>
                      ✓ ¡Solicitud de devolución enviada con éxito!
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
