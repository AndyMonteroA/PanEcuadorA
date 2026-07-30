import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiDollarSign, FiTrendingUp, FiArrowUp, FiEdit2, FiClock, FiRefreshCw, FiChevronDown, FiChevronUp, FiPackage } from 'react-icons/fi';

export default function AdminPricing() {
  const [products, setProducts] = useState([]);
  const [profitStats, setProfitStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ precio_compra: '', incremento_mensual: '', motivo: '' });
  const [saving, setSaving] = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [history, setHistory] = useState([]);
  const [applyingAll, setApplyingAll] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricingRes, profitRes] = await Promise.all([
        adminAPI.getPricing(),
        adminAPI.getProfitStats()
      ]);
      setProducts(pricingRes.data.data);
      setProfitStats(profitRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openEdit = (p) => {
    setEditForm({ precio_compra: p.precio_compra || '', incremento_mensual: p.incremento_mensual || '0.10', motivo: '' });
    setEditingId(p.id_producto);
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      await adminAPI.updatePricing(id, editForm);
      showAlert('Precio actualizado con fórmula PV(t) = PV(t-1) + ΔC(t)', 'success');
      setEditingId(null);
      loadData();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const handleApplyIncrement = async (id) => {
    try {
      const res = await adminAPI.applyMonthlyIncrement(id);
      showAlert(res.data.message, 'success');
      loadData();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const handleApplyAllIncrements = async () => {
    if (!confirm('¿Aplicar incremento mensual (I) a TODOS los productos? Esta acción actualizará todos los precios de venta.')) return;
    setApplyingAll(true);
    try {
      const res = await adminAPI.applyAllIncrements();
      showAlert(res.data.message, 'success');
      loadData();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
    finally { setApplyingAll(false); }
  };

  const toggleHistory = async (productId) => {
    if (historyId === productId) { setHistoryId(null); return; }
    try {
      const res = await adminAPI.getPricingHistory(productId);
      setHistory(res.data.data);
      setHistoryId(productId);
    } catch (err) { console.error(err); }
  };

  const showAlert = (message, type) => { setAlert({ message, type }); setTimeout(() => setAlert(null), 5000); };

  const totalGanancia = products.reduce((sum, p) => sum + (parseFloat(p.ganancia_unitaria) || 0) * (parseInt(p.unidades_vendidas) || 0), 0);

  return (
    <div>
      <div className="admin-section-header">
        <h2>💰 Precios, Ganancias y Fondo de Reinversión</h2>
        <button className="btn-admin btn-admin-primary" onClick={handleApplyAllIncrements} disabled={applyingAll}>
          <FiTrendingUp /> {applyingAll ? 'Aplicando...' : 'Aplicar Incremento Mensual (I) a Todos'}
        </button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      {/* KPIs del Fondo de Reinversión */}
      {profitStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(196,127,59,0.08)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(196,127,59,0.15)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Fondo Acumulado (Ventas)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#22c55e' }}>${profitStats.fondo_acumulado.toFixed(2)}</div>
          </div>
          <div style={{ background: 'rgba(59,126,196,0.08)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(59,126,196,0.15)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Reinvertido</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3b82f6' }}>${profitStats.total_reinvertido.toFixed(2)}</div>
          </div>
          <div style={{ background: 'rgba(212,160,23,0.08)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(212,160,23,0.15)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Saldo Disponible</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#D4A017' }}>${profitStats.saldo_disponible.toFixed(2)}</div>
          </div>
          <div style={{ background: 'rgba(196,59,59,0.08)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(196,59,59,0.15)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Ganancia Total Estimada</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#C47F3B' }}>${totalGanancia.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Fórmula del profesor */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(196,127,59,0.15)', borderRadius: '10px', padding: '16px', marginBottom: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--color-primary)' }}>Fórmula del Profesor:</strong> PV(t) = PV(t-1) + ΔC(t) + I &nbsp;|&nbsp; G(t) = PV(t) - PC(t) &nbsp;|&nbsp; G_total = G(t) × cantidad_vendida
      </div>

      {/* Tabla de productos con precios */}
      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{products.length} productos con modelo de precios</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>PC (Compra)</th>
                <th>PV (Venta)</th>
                <th>G (Ganancia)</th>
                <th>I (Incremento)</th>
                <th>Vendidas</th>
                <th>G Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const gu = parseFloat(p.ganancia_unitaria) || 0;
                const uv = parseInt(p.unidades_vendidas) || 0;
                const gTotal = gu * uv;
                return (
                  <tr key={p.id_producto}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.categoria_nombre} · {p.productor_nombre || 'Sin proveedor'}</div>
                    </td>
                    <td>
                      {editingId === p.id_producto ? (
                        <input type="number" step="0.01" className="admin-input" style={{ width: '80px' }}
                          value={editForm.precio_compra} onChange={e => setEditForm({ ...editForm, precio_compra: e.target.value })} />
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>${parseFloat(p.precio_compra).toFixed(2)}</span>
                      )}
                    </td>
                    <td><span style={{ color: '#22c55e', fontWeight: 700 }}>${parseFloat(p.precio_venta).toFixed(2)}</span></td>
                    <td>
                      <span style={{ color: gu > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                        ${gu.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {editingId === p.id_producto ? (
                        <input type="number" step="0.01" className="admin-input" style={{ width: '70px' }}
                          value={editForm.incremento_mensual} onChange={e => setEditForm({ ...editForm, incremento_mensual: e.target.value })} />
                      ) : (
                        <span style={{ color: '#D4A017' }}>${parseFloat(p.incremento_mensual).toFixed(2)}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{uv}</td>
                    <td><span style={{ fontWeight: 700, color: gTotal > 0 ? '#22c55e' : '#888' }}>${gTotal.toFixed(2)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {editingId === p.id_producto ? (
                          <>
                            <input className="admin-input" placeholder="Motivo del cambio" style={{ width: '120px', fontSize: '0.72rem' }}
                              value={editForm.motivo} onChange={e => setEditForm({ ...editForm, motivo: e.target.value })} />
                            <button className="btn-admin btn-admin-sm btn-admin-primary" onClick={() => handleSave(p.id_producto)} disabled={saving}>
                              {saving ? '...' : '✓'}
                            </button>
                            <button className="btn-admin btn-admin-sm btn-admin-ghost" onClick={() => setEditingId(null)}>✕</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(p)} title="Editar PC e I">
                              <FiEdit2 size={12} />
                            </button>
                            <button className="btn-admin btn-admin-sm btn-admin-primary" onClick={() => handleApplyIncrement(p.id_producto)} title="Aplicar +I">
                              <FiArrowUp size={12} />
                            </button>
                            <button className="btn-admin btn-admin-sm btn-admin-ghost" onClick={() => toggleHistory(p.id_producto)} title="Ver historial">
                              {historyId === p.id_producto ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                            </button>
                          </>
                        )}
                      </div>
                      {/* Historial inline */}
                      {historyId === p.id_producto && history.length > 0 && (
                        <div style={{ marginTop: '8px', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                          {history.map(h => (
                            <div key={h.id_historial} style={{ fontSize: '0.7rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ color: 'var(--text-muted)' }}>{new Date(h.fecha).toLocaleDateString('es-EC')} · {h.actor}</div>
                              <div>PC: ${parseFloat(h.precio_compra_anterior).toFixed(2)} → ${parseFloat(h.precio_compra_nuevo).toFixed(2)} | PV: ${parseFloat(h.precio_venta_anterior).toFixed(2)} → ${parseFloat(h.precio_venta_nuevo).toFixed(2)}</div>
                              <div style={{ color: 'var(--color-primary)' }}>ΔC: ${parseFloat(h.delta_compra).toFixed(2)} | I: ${parseFloat(h.incremento_aplicado).toFixed(2)} | G: ${parseFloat(h.ganancia_unitaria).toFixed(2)}</div>
                              {h.motivo && <div style={{ fontStyle: 'italic', color: '#888' }}>{h.motivo}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
