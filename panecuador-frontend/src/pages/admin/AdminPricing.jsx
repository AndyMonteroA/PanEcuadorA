import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  FiDollarSign, FiTrendingUp, FiArrowUp, FiEdit3, FiClock, 
  FiRefreshCw, FiChevronDown, FiChevronUp, FiSearch, FiSliders, 
  FiPieChart, FiCheck, FiX, FiLayers, FiTag 
} from 'react-icons/fi';

export default function AdminPricing() {
  const [products, setProducts] = useState([]);
  const [profitStats, setProfitStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [alert, setAlert] = useState(null);
  
  // Edit mode state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ precio_compra: '', incremento_mensual: '', motivo: '' });
  const [saving, setSaving] = useState(false);
  
  // History drawer/accordion state
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

  const openEditModal = (p) => {
    setEditingProduct(p);
    setEditForm({
      precio_compra: p.precio_compra || '0.00',
      incremento_mensual: p.incremento_mensual || '0.10',
      motivo: ''
    });
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    try {
      const res = await adminAPI.updatePricing(editingProduct.id_producto, editForm);
      showAlert(res.data.message || 'Precio de compra y margen actualizado correctamente.', 'success');
      setEditingProduct(null);
      loadData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error al actualizar precio', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyIncrement = async (id, nombre) => {
    try {
      const res = await adminAPI.applyMonthlyIncrement(id);
      showAlert(`Incremento de margen aplicado a "${nombre}".`, 'success');
      loadData();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const handleApplyAllIncrements = async () => {
    if (!confirm('¿Deseas aplicar el ajuste de margen mensual programado a TODOS los productos del catálogo?')) return;
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

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Filter categories dynamically
  const categoriesList = Array.from(new Set(products.map(p => p.categoria_nombre).filter(Boolean)));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
    const matchesCat = !selectedCategory || p.categoria_nombre === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const totalGanancia = products.reduce((sum, p) => sum + (parseFloat(p.ganancia_unitaria) || 0) * (parseInt(p.unidades_vendidas) || 0), 0);

  // Live preview calculation for edit modal
  const calcNewPV = () => {
    if (!editingProduct) return 0;
    const oldPC = parseFloat(editingProduct.precio_compra) || 0;
    const newPC = parseFloat(editForm.precio_compra) || 0;
    const deltaC = newPC - oldPC;
    const oldPV = parseFloat(editingProduct.precio_venta) || 0;
    return (deltaC !== 0) ? (oldPV + deltaC) : oldPV;
  };

  const calcNewMargin = () => {
    const newPV = calcNewPV();
    const newPC = parseFloat(editForm.precio_compra) || 0;
    return newPV - newPC;
  };

  return (
    <div style={{ color: '#0f172a' }}>
      {/* Header section */}
      <div className="admin-section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiSliders style={{ color: 'var(--color-primary)' }} /> Precios, Márgenes & Fondo de Reinversión
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Gestión inteligente de precios de compra, margen comercial dinámico e historial de ajustes por inflación de insumos.
          </p>
        </div>
        <button className="btn-admin btn-admin-primary" onClick={handleApplyAllIncrements} disabled={applyingAll} style={{ borderRadius: '10px', padding: '10px 18px' }}>
          <FiTrendingUp /> {applyingAll ? 'Aplicando...' : 'Ajustar Márgenes Fijos (+I)'}
        </button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      {/* Financial KPIs */}
      {profitStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '18px', marginBottom: '28px' }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Fondo Acumulado</span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiDollarSign size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
              ${profitStats.fondo_acumulado.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Ganancias netas acumuladas por ventas</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Reinvertido en Negocio</span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiPieChart size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '-0.02em' }}>
              ${profitStats.total_reinvertido.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Fondos destinados a reposición y producción</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Saldo Disponible</span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiTrendingUp size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', letterSpacing: '-0.02em' }}>
              ${profitStats.saldo_disponible.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Caja lista para nuevas inversiones</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Ganancia Proyectada</span>
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiLayers size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c47f3b', letterSpacing: '-0.02em' }}>
              ${totalGanancia.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Margen estimado total del catálogo</div>
          </div>
        </div>
      )}

      {/* Category filter & Search bar */}
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
            <input
              type="text"
              placeholder="Buscar producto por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.875rem', color: '#0f172a' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflowX: 'auto', paddingBottom: '2px' }}>
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: selectedCategory === '' ? 'var(--color-primary)' : '#f1f5f9',
              color: selectedCategory === '' ? '#ffffff' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            Todas ({products.length})
          </button>
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: selectedCategory === cat ? 'var(--color-primary)' : '#f1f5f9',
                color: selectedCategory === cat ? '#ffffff' : '#475569',
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Pricing Table */}
      <div className="admin-table-wrapper" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <div className="admin-table-header" style={{ padding: '18px 24px', background: '#ffffff' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            Listado de Productos y Configuración de Márgenes ({filteredProducts.length})
          </h3>
        </div>

        {loading ? <div className="admin-loading" style={{ padding: '40px', color: '#64748b' }}>Cargando datos de precios...</div> : (
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Producto</th>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Costo Compra (PC)</th>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Precio Venta (PV)</th>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Margen Unitario (G)</th>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Ajuste Mensual (I)</th>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Ventas</th>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Ganancia Total</th>
                <th style={{ padding: '12px 20px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const gu = parseFloat(p.ganancia_unitaria) || 0;
                const uv = parseInt(p.unidades_vendidas) || 0;
                const gTotal = gu * uv;
                const pc = parseFloat(p.precio_compra) || 0;
                const pv = parseFloat(p.precio_venta) || 0;
                const marginPct = pv > 0 ? ((gu / pv) * 100).toFixed(0) : 0;

                return (
                  <tr key={p.id_producto} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{p.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569', fontWeight: 500 }}>
                          {p.categoria_nombre || 'Sin categoría'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.95rem' }}>
                        ${pc.toFixed(2)}
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '1rem' }}>
                        ${pv.toFixed(2)}
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: gu > 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                          ${gu.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', background: gu > 0 ? '#dcfce7' : '#fee2e2', color: gu > 0 ? '#15803d' : '#991b1b', fontWeight: 600 }}>
                          {marginPct}%
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ color: '#d97706', fontWeight: 600 }}>
                        +${parseFloat(p.incremento_mensual).toFixed(2)}
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#334155', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {uv} un.
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontWeight: 800, color: gTotal > 0 ? '#15803d' : '#64748b' }}>
                        ${gTotal.toFixed(2)}
                      </span>
                    </td>

                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-admin btn-admin-sm btn-admin-edit"
                          onClick={() => openEditModal(p)}
                          title="Modificar precio de compra / margen"
                          style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                        >
                          <FiEdit3 size={13} /> Editar
                        </button>
                        <button
                          className="btn-admin btn-admin-sm btn-admin-primary"
                          onClick={() => handleApplyIncrement(p.id_producto, p.nombre)}
                          title="Aplicar ajuste de margen (+I)"
                          style={{ borderRadius: '8px' }}
                        >
                          <FiArrowUp size={13} /> +I
                        </button>
                        <button
                          className="btn-admin btn-admin-sm btn-admin-ghost"
                          onClick={() => toggleHistory(p.id_producto)}
                          title="Ver historial de cambios"
                          style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        >
                          {historyId === p.id_producto ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                        </button>
                      </div>

                      {/* Dropdown Historial */}
                      {historyId === p.id_producto && (
                        <div style={{ marginTop: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', textAlign: 'left' }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                            📋 Historial de Cambios de Precio
                          </h5>
                          {history.length === 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin cambios registrados aún.</div>
                          ) : (
                            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                              {history.map(h => (
                                <div key={h.id_historial} style={{ fontSize: '0.72rem', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                                  <div style={{ color: '#475569', fontWeight: 600 }}>{new Date(h.fecha).toLocaleDateString('es-EC')} — {h.actor}</div>
                                  <div style={{ color: '#0f172a' }}>PC: ${parseFloat(h.precio_compra_anterior).toFixed(2)} $\rightarrow$ ${parseFloat(h.precio_compra_nuevo).toFixed(2)} | PV: ${parseFloat(h.precio_venta_anterior).toFixed(2)} $\rightarrow$ ${parseFloat(h.precio_venta_nuevo).toFixed(2)}</div>
                                  {h.motivo && <div style={{ color: 'var(--color-primary)', fontStyle: 'italic' }}>{h.motivo}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No se encontraron productos con el filtro aplicado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Price Modal */}
      {editingProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Ajustar Precio & Margen
              </h3>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePrice} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', background: '#fffbeb', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fef3c7', fontSize: '0.82rem', color: '#92400e' }}>
                <strong>{editingProduct.nombre}</strong>
                <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: '2px' }}>
                  Precio Venta Actual: <strong>${parseFloat(editingProduct.precio_venta).toFixed(2)}</strong>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Nuevo Precio de Compra / Costo Insumo ($PC)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  required
                  value={editForm.precio_compra}
                  onChange={e => setEditForm({ ...editForm, precio_compra: e.target.value })}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px', borderRadius: '8px' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Incremento Fijo de Margen Mensual ($I)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  required
                  value={editForm.incremento_mensual}
                  onChange={e => setEditForm({ ...editForm, incremento_mensual: e.target.value })}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px', borderRadius: '8px' }}
                />
              </div>

              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Motivo del Cambio de Precio
                </label>
                <input
                  type="text"
                  placeholder="Ej: Aumento en costo de harina / reajuste mensual"
                  className="input"
                  value={editForm.motivo}
                  onChange={e => setEditForm({ ...editForm, motivo: e.target.value })}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px', borderRadius: '8px' }}
                />
              </div>

              {/* Realtime calculation preview */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569' }}>
                  <span>Nuevo Precio Venta Sugerido (PV):</span>
                  <strong style={{ color: '#16a34a', fontSize: '0.95rem' }}>${calcNewPV().toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Nuevo Margen Unitario (G):</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>${calcNewMargin().toFixed(2)}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProduct(null)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ borderRadius: '8px' }}>
                  {saving ? 'Guardando...' : 'Guardar y Recalcular PV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
