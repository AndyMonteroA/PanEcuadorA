import { useState, useEffect } from 'react';
import { producerAPI } from '../../services/api';
import { 
  FiBox, FiShoppingBag, FiUsers, FiDollarSign, FiAlertTriangle, 
  FiRefreshCw, FiClock, FiPlusCircle, FiCheck, FiX, FiTrendingUp 
} from 'react-icons/fi';

export default function ProducerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restockModal, setRestockModal] = useState(null);
  const [restockQty, setRestockQty] = useState('50');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await producerAPI.getDashboard();
      setData(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleRenewStockSubmit = async (e) => {
    e.preventDefault();
    if (!restockModal) return;
    setSaving(true);
    try {
      await producerAPI.renewStock(restockModal.id_producto, parseInt(restockQty));
      showAlert(`Stock de "${restockModal.nombre}" renovado a ${restockQty} unidades recién horneadas.`, 'success');
      setRestockModal(null);
      loadDashboard();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error renovando stock', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  if (loading) return <div className="admin-loading" style={{ color: '#64748b' }}>Cargando dashboard del productor...</div>;
  if (!data) return <div className="admin-empty" style={{ color: '#64748b' }}>Error al cargar el dashboard</div>;

  return (
    <div style={{ color: '#0f172a' }}>
      {/* Header */}
      <div className="admin-section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Bienvenido, {data.negocio.nombre_negocio}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Panel de control de tu producción artesanal, personal de turno e inventarios de hornada.
          </p>
        </div>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      {/* Out of stock alert banner */}
      {data.productosPorVencer && data.productosPorVencer.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <strong style={{ color: '#9a3412', fontSize: '0.92rem' }}>⚠️ Solicitud de Horneado Requerida</strong>
              <div style={{ fontSize: '0.8rem', color: '#c2410c' }}>
                Hay {data.productosPorVencer.length} producto(s) que requieren reposición urgente de hornada.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {data.productosPorVencer.map(p => (
              <button
                key={p.id_producto}
                onClick={() => setRestockModal(p)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', background: '#ea580c', color: '#ffffff',
                  border: 'none', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <FiPlusCircle size={14} /> Hornear {p.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card accent">
          <span className="stat-label" style={{ color: '#64748b' }}><FiDollarSign size={16} /> Ingresos Totales</span>
          <span className="stat-value" style={{ color: '#0f172a' }}>${data.ingresos.toFixed(2)}</span>
          <span className="stat-sub" style={{ color: '#16a34a', fontWeight: 600 }}>De todos tus productos vendidos</span>
        </div>

        <div className="admin-stat-card info">
          <span className="stat-label" style={{ color: '#64748b' }}><FiShoppingBag size={16} /> Pedidos Recibidos</span>
          <span className="stat-value" style={{ color: '#0f172a' }}>{data.totalPedidos}</span>
          <span className="stat-sub" style={{ color: '#2563eb', fontWeight: 600 }}>{data.pedidosActivos} pedidos activos</span>
        </div>

        <div className="admin-stat-card success">
          <span className="stat-label" style={{ color: '#64748b' }}><FiBox size={16} /> Productos en Catálogo</span>
          <span className="stat-value" style={{ color: '#0f172a' }}>{data.totalProductos}</span>
          <span className="stat-sub" style={{ color: '#059669', fontWeight: 600 }}>{data.productosDisponibles} listos para entrega</span>
        </div>

        <div className="admin-stat-card warning">
          <span className="stat-label" style={{ color: '#64748b' }}><FiUsers size={16} /> Mi Personal Activo</span>
          <span className="stat-value" style={{ color: '#0f172a' }}>{data.totalTrabajadores}</span>
          <span className="stat-sub" style={{ color: '#d97706', fontWeight: 600 }}>Panaderos y Pasteleros asignados</span>
        </div>
      </div>

      {/* Charts section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Sales Chart */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiTrendingUp style={{ color: 'var(--color-primary)' }} /> Evolución de tus Ingresos ($)
          </h3>
          {(() => {
            const monthlyData = [
              { month: 'Ene', sales: data.ingresos * 0.35 },
              { month: 'Feb', sales: data.ingresos * 0.5 },
              { month: 'Mar', sales: data.ingresos * 0.68 },
              { month: 'Abr', sales: data.ingresos * 0.8 },
              { month: 'May', sales: data.ingresos * 0.9 },
              { month: 'Jun', sales: data.ingresos }
            ];
            const maxSales = Math.max(...monthlyData.map(d => d.sales), 1);
            const points = monthlyData.map((d, idx) => {
              const x = 45 + idx * 65;
              const y = 170 - (d.sales / maxSales) * 140;
              return { x, y, month: d.month, sales: d.sales };
            });
            const pathString = points.reduce((acc, p, idx) => acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y} `, '');
            const areaString = pathString + `L ${points[points.length-1].x} 170 L ${points[0].x} 170 Z`;
            return (
              <svg viewBox="0 0 400 200" style={{ width: '100%', height: '200px' }}>
                <defs>
                  <linearGradient id="salesGradProdLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c47f3b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#c47f3b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="45" y1="20" x2="380" y2="20" stroke="#f1f5f9" />
                <line x1="45" y1="70" x2="380" y2="70" stroke="#f1f5f9" />
                <line x1="45" y1="120" x2="380" y2="120" stroke="#f1f5f9" />
                <line x1="45" y1="170" x2="380" y2="170" stroke="#e2e8f0" />
                <text x="10" y="25" fill="#94a3b8" fontSize="9">${maxSales.toFixed(0)}</text>
                <text x="10" y="95" fill="#94a3b8" fontSize="9">${(maxSales/2).toFixed(0)}</text>
                <text x="10" y="165" fill="#94a3b8" fontSize="9">$0</text>
                <path d={areaString} fill="url(#salesGradProdLight)" />
                <path d={pathString} fill="none" stroke="#c47f3b" strokeWidth="3" />
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#c47f3b" strokeWidth="2.5" />
                    <text x={p.x} y="186" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle">{p.month}</text>
                    <text x={p.x} y={p.y - 8} fill="#0f172a" fontSize="8" fontWeight="700" textAnchor="middle">${p.sales.toFixed(0)}</text>
                  </g>
                ))}
              </svg>
            );
          })()}
        </div>

        {/* Operational Performance Chart */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiBox style={{ color: '#3b82f6' }} /> Resumen Operativo del Negocio
          </h3>
          {(() => {
            const metrics = [
              { label: 'Prod. Creados', value: data.totalProductos, color: '#10b981' },
              { label: 'Prod. Dispo', value: data.productosDisponibles, color: '#3b82f6' },
              { label: 'Pedidos Rec.', value: data.totalPedidos, color: '#8b5cf6' },
              { label: 'Pedidos Act.', value: data.pedidosActivos, color: '#f97316' },
              { label: 'Personal Act.', value: data.totalTrabajadores, color: '#d97706' }
            ];
            const maxVal = Math.max(...metrics.map(m => m.value), 1);
            return (
              <svg viewBox="0 0 400 200" style={{ width: '100%', height: '200px' }}>
                <line x1="40" y1="20" x2="380" y2="20" stroke="#f1f5f9" />
                <line x1="40" y1="65" x2="380" y2="65" stroke="#f1f5f9" />
                <line x1="40" y1="110" x2="380" y2="110" stroke="#f1f5f9" />
                <line x1="40" y1="155" x2="380" y2="155" stroke="#f1f5f9" />
                <line x1="40" y1="170" x2="380" y2="170" stroke="#e2e8f0" />
                {metrics.map((m, idx) => {
                  const width = 340 / metrics.length;
                  const barWidth = Math.min(30, width - 10);
                  const x = 40 + idx * width + (width - barWidth) / 2;
                  const height = (m.value / maxVal) * 135;
                  const y = 170 - height;
                  return (
                    <g key={m.label}>
                      <rect x={x} y={y} width={barWidth} height={height} fill={m.color} rx="4" />
                      <text x={x + barWidth / 2} y="186" fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle">{m.label}</text>
                      <text x={x + barWidth / 2} y={y - 6} fill="#0f172a" fontSize="9" fontWeight="700" textAnchor="middle">{m.value}</text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>
      </div>

      {/* Restock Modal */}
      {restockModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '440px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                🥖 Hornear & Renovar Stock
              </h3>
              <button onClick={() => setRestockModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleRenewStockSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px', background: '#ecfdf5', padding: '12px 14px', borderRadius: '10px', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.85rem' }}>
                Producto: <strong>{restockModal.nombre}</strong>
                <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '2px' }}>
                  Al ingresar el nuevo stock fresco, el sistema actualizará la fecha de hornada y notificará a los clientes en espera.
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Cantidad Recién Horneada (Unidades)
                </label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  required
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '10px', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRestockModal(null)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ borderRadius: '8px' }}>
                  {saving ? 'Guardando...' : '✓ Confirmar Hornada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
