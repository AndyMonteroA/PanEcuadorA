import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPackage, FiClock, FiMapPin, FiChevronRight, FiX, FiRefreshCw, FiPrinter, FiStar, FiCheckCircle } from 'react-icons/fi';
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
  const [returnEvidencia, setReturnEvidencia] = useState(null);
  const [returnEvidenciaPreview, setReturnEvidenciaPreview] = useState(null);

  // Review & Rating state per product item
  const [activeReviewItem, setActiveReviewItem] = useState(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedItems, setReviewedItems] = useState({});

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
      const formData = new FormData();
      formData.append('id_pedido', selectedOrder.id_pedido);
      formData.append('motivo', motivoCompleto);
      if (returnEvidencia) {
        formData.append('evidencia', returnEvidencia);
      }
      await reviewsAPI.createReturn(formData);
      setReturnSuccess(true);
      setShowReturnForm(false);
      setReturnEvidencia(null);
      setReturnEvidenciaPreview(null);
      viewDetail(selectedOrder.id_pedido);
      fetchOrders();
    } catch (err) {
      setReturnError(err.response?.data?.message || 'Error al enviar la solicitud de devolución.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleReviewSubmit = async (productId) => {
    setSubmittingReview(true);
    try {
      await reviewsAPI.create({
        id_producto: productId,
        id_pedido: selectedOrder.id_pedido,
        calificacion: reviewStars,
        comentario: reviewComment.trim()
      });
      setReviewedItems(prev => ({ ...prev, [productId]: true }));
      setActiveReviewItem(null);
      setReviewComment('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al enviar la reseña');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDownloadPDF = (order) => {
    const printWindow = window.open('', '_blank');
    const itemsHtml = order.items?.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.nombre}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.precio_unitario).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante Pedido #${order.id_pedido} — PanEcuador</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #C47F3B; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 26px; font-weight: bold; color: #C47F3B; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-box { background: #FFF9F3; padding: 16px; border-radius: 8px; border: 1px solid #F0E6D9; font-size: 14px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #3E2723; color: white; padding: 12px; text-align: left; font-size: 14px; }
          .totals { text-align: right; font-size: 15px; }
          .totals div { margin-bottom: 6px; }
          .total-final { font-size: 22px; font-weight: bold; color: #C47F3B; border-top: 2px solid #C47F3B; padding-top: 8px; margin-top: 8px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🍞 PanEcuador</div>
            <div style="font-size: 13px; color: #666;">Plataforma Digital de Panadería Artesanal</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #333;">COMPROBANTE DE COMPRA</h2>
            <strong style="color: #C47F3B; font-size: 18px;">#PED-${order.id_pedido}</strong>
            <div style="font-size: 12px; color: #666;">${new Date(order.fecha_pedido).toLocaleDateString('es-EC')}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <strong>Datos del Envío:</strong><br/>
            Dirección: ${order.calle || ''}, ${order.ciudad || ''}, ${order.provincia || ''}<br/>
            Estado del Pedido: <span style="text-transform: capitalize; font-weight: bold;">${order.estado}</span>
          </div>
          <div class="info-box">
            <strong>Logística y Horario:</strong><br/>
            Fecha de Entrega: ${order.fecha_entrega_programada ? new Date(order.fecha_entrega_programada).toLocaleDateString('es-EC') : 'Programada en sistema'}<br/>
            Franja Horaria: ${order.franja_horaria || '09:00 - 12:00'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Precio Unit.</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div>Subtotal: $${parseFloat(order.subtotal).toFixed(2)}</div>
          ${parseFloat(order.descuento) > 0 ? `<div style="color: #22c55e;">Descuento Aplicado: -$${parseFloat(order.descuento).toFixed(2)}</div>` : ''}
          <div class="total-final">Total Pagado: $${parseFloat(order.total).toFixed(2)}</div>
        </div>

        <div class="footer">
          <p>¡Gracias por tu compra en PanEcuador! 🥖 Documento generado electrónicamente para comprobante oficial del cliente.</p>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                    <div>
                      <h2>Pedido #{selectedOrder.id_pedido}</h2>
                      <span className="order-status" style={{
                        background: (estadoConfig[selectedOrder.estado]?.color || '#888') + '18',
                        color: estadoConfig[selectedOrder.estado]?.color || '#888'
                      }}>
                        {estadoConfig[selectedOrder.estado]?.icon} {estadoConfig[selectedOrder.estado]?.label}
                      </span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadPDF(selectedOrder)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiPrinter size={15} /> Comprobante PDF
                    </button>
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
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="order-item">
                            <div className="order-item-img">
                              {item.imagen ? <img src={item.imagen} alt="" /> : <span>🍞</span>}
                            </div>
                            <div className="order-item-info">
                              <strong>{item.nombre}</strong>
                              <span>{item.cantidad}x ${parseFloat(item.precio_unitario).toFixed(2)}</span>
                            </div>
                            <span className="order-item-total">${parseFloat(item.subtotal).toFixed(2)}</span>
                          </div>

                          {/* Option to rate delivered item */}
                          {selectedOrder.estado === 'entregado' && (
                            reviewedItems[item.id_producto] ? (
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FiCheckCircle /> Reseña enviada con éxito
                              </div>
                            ) : activeReviewItem === item.id_producto ? (
                              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calificación:</span>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <FiStar key={star} size={16}
                                      style={{ cursor: 'pointer', color: star <= reviewStars ? '#F59E0B' : '#666', fill: star <= reviewStars ? '#F59E0B' : 'transparent' }}
                                      onClick={() => setReviewStars(star)} />
                                  ))}
                                </div>
                                <textarea
                                  placeholder="Escribe tu comentario sobre este producto..."
                                  value={reviewComment}
                                  onChange={e => setReviewComment(e.target.value)}
                                  rows={2}
                                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveReviewItem(null)} style={{ fontSize: '0.75rem' }}>
                                    Cancelar
                                  </button>
                                  <button className="btn btn-primary btn-sm" onClick={() => handleReviewSubmit(item.id_producto)} disabled={submittingReview} style={{ fontSize: '0.75rem' }}>
                                    {submittingReview ? 'Enviando...' : 'Publicar Reseña'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '4px 10px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => { setActiveReviewItem(item.id_producto); setReviewStars(5); setReviewComment(''); }}>
                                <FiStar size={13} /> Calificar producto
                              </button>
                            )
                          )}
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

                  {/* Historial de Eventos Registrados */}
                  <div className="modal-section">
                    <h3>📜 Historial de Eventos del Pedido</h3>
                    <div className="order-events-log">
                      {selectedOrder.historial_eventos && selectedOrder.historial_eventos.length > 0 ? (
                        selectedOrder.historial_eventos.map((ev, idx) => (
                          <div key={idx} className="event-log-item">
                            <div className="event-log-badge">
                              {estadoConfig[ev.estado]?.icon || '📌'}
                            </div>
                            <div className="event-log-content">
                              <div className="event-log-header">
                                <strong>{ev.titulo}</strong>
                                <span className="event-log-time">
                                  {new Date(ev.fecha_evento).toLocaleDateString('es-EC', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              {ev.descripcion && <p className="event-log-desc">{ev.descripcion}</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          Pedido registrado en el sistema.
                        </p>
                      )}
                    </div>
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

                          <div className="input-group" style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>📸 Adjuntar evidencia (foto del producto dañado)</label>
                            <input type="file" accept="image/*" onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setReturnEvidencia(file);
                                const reader = new FileReader();
                                reader.onload = (ev) => setReturnEvidenciaPreview(ev.target.result);
                                reader.readAsDataURL(file);
                              }
                            }}
                              style={{ width: '100%', fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                            {returnEvidenciaPreview && (
                              <div style={{ marginTop: '8px', position: 'relative', display: 'inline-block' }}>
                                <img src={returnEvidenciaPreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <button type="button" onClick={() => { setReturnEvidencia(null); setReturnEvidenciaPreview(null); }}
                                  style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: '10px' }}>✕</button>
                              </div>
                            )}
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
