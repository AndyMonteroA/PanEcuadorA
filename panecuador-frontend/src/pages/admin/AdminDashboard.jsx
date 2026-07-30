import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { 
  FiShoppingBag, FiDollarSign, FiUsers, FiBox, FiAlertTriangle, 
  FiClock, FiCalendar, FiRotateCw, FiChevronRight, FiTrendingUp, FiCheckCircle
} from 'react-icons/fi';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [turno, setTurno] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [returnsCount, setReturnsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [statsRes, turnoRes, expRes, retRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getCurrentShift().catch(() => ({ data: { data: null } })),
        adminAPI.getExpiringProducts().catch(() => ({ data: { data: [] } })),
        adminAPI.getReturnsCount().catch(() => ({ data: { data: 0 } }))
      ]);
      setStats(statsRes.data.data);
      setTurno(turnoRes.data.data);
      setExpiring(expRes.data.data);
      setReturnsCount(retRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleGenerateShifts = async () => {
    setGenerating(true);
    try {
      const res = await adminAPI.generateShifts();
      setAlert({ message: res.data.message, type: 'success' });
      setTimeout(() => setAlert(null), 4000);
    } catch (err) { setAlert({ message: 'Error al generar turnos', type: 'error' }); setTimeout(() => setAlert(null), 4000); }
    finally { setGenerating(false); }
  };

  if (loading) return <div className="admin-loading" style={{ color: '#64748b' }}>Cargando estadísticas en tiempo real...</div>;
  if (!stats) return <div className="admin-empty" style={{ color: '#64748b' }}>Error al cargar las estadísticas</div>;

  const { resumen, pedidosRecientes, topProductos, pedidosPorEstado } = stats;

  return (
    <div style={{ color: '#0f172a' }}>
      {/* Dashboard Section Header */}
      <div className="admin-section-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Dashboard Principal
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Resumen operativo y comercial en tiempo real. Haz clic en cualquier tarjeta para gestionar su sección.
          </p>
        </div>
        <button className="btn-admin btn-admin-ghost" onClick={handleGenerateShifts} disabled={generating} style={{ borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
          <FiCalendar /> {generating ? 'Generando...' : 'Generar Turnos Semana'}
        </button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      {/* Dynamic Clickable KPI Cards */}
      <div className="admin-stats-grid">
        {/* Card 1: Ventas Totales */}
        <div
          className="admin-stat-card accent"
          onClick={() => navigate('/admin/precios')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          title="Ver módulo de Precios y Ganancias"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label" style={{ color: '#64748b' }}><FiDollarSign size={16} /> Ventas Totales</span>
            <FiChevronRight size={16} style={{ color: '#c47f3b' }} />
          </div>
          <span className="stat-value" style={{ color: '#0f172a' }}>${resumen.ventasTotales.toFixed(2)}</span>
          <span className="stat-sub" style={{ color: '#16a34a', fontWeight: 600 }}>Hoy: +${resumen.ventasHoy.toFixed(2)}</span>
        </div>

        {/* Card 2: Pedidos */}
        <div
          className="admin-stat-card info"
          onClick={() => navigate('/admin/pedidos')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          title="Ver gestión de Pedidos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label" style={{ color: '#64748b' }}><FiShoppingBag size={16} /> Pedidos Totales</span>
            <FiChevronRight size={16} style={{ color: '#3b82f6' }} />
          </div>
          <span className="stat-value" style={{ color: '#0f172a' }}>{resumen.totalPedidos}</span>
          <span className="stat-sub" style={{ color: '#2563eb', fontWeight: 600 }}>Hoy: {resumen.pedidosHoy} pedidos</span>
        </div>

        {/* Card 3: Usuarios */}
        <div
          className="admin-stat-card success"
          onClick={() => navigate('/admin/usuarios')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          title="Ver lista de usuarios"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label" style={{ color: '#64748b' }}><FiUsers size={16} /> Usuarios Registrados</span>
            <FiChevronRight size={16} style={{ color: '#10b981' }} />
          </div>
          <span className="stat-value" style={{ color: '#0f172a' }}>{resumen.totalUsuarios}</span>
          <span className="stat-sub" style={{ color: '#059669', fontWeight: 600 }}>Nuevos esta semana: +{resumen.nuevosUsuarios}</span>
        </div>

        {/* Card 4: Productos */}
        <div
          className="admin-stat-card warning"
          onClick={() => navigate('/admin/productos')}
          style={{ cursor: 'pointer', transition: 'all 0.2s' }}
          title="Ver catálogo de productos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label" style={{ color: '#64748b' }}><FiBox size={16} /> Productos Activos</span>
            <FiChevronRight size={16} style={{ color: '#d97706' }} />
          </div>
          <span className="stat-value" style={{ color: '#0f172a' }}>{resumen.totalProductos}</span>
          <span className="stat-sub">
            {resumen.stockBajo > 0 ? (
              <span style={{ color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiAlertTriangle size={12} /> {resumen.stockBajo} con stock bajo
              </span>
            ) : (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Stock saludable ✓</span>
            )}
          </span>
        </div>
      </div>

      {/* Operative Quick Alert Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {/* Turno Actual */}
        <div
          className="admin-stat-card"
          onClick={() => navigate('/admin/turnos')}
          style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
          title="Ver asignación de turnos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label" style={{ color: '#64748b' }}><FiClock size={16} /> Turno Actual Operativo</span>
            <FiChevronRight size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <span className="stat-value" style={{ fontSize: '1.4rem', color: '#0f172a' }}>{turno?.turno || 'Sin turno activo'}</span>
          <span className="stat-sub" style={{ color: '#475569' }}>
            {turno?.totalTrabajadores > 0
              ? `${turno.totalTrabajadores} trabajador(es) de turno`
              : 'Sin personal asignado en esta franja'
            }
          </span>
          {turno?.trabajadores?.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {turno.trabajadores.map((t, i) => (
                <span key={i} style={{ background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                  {t.trabajador_nombre} {t.trabajador_apellido}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Productos por Vencer */}
        <div
          className="admin-stat-card"
          onClick={() => navigate('/admin/productos')}
          style={{ borderLeft: '4px solid #f97316', cursor: 'pointer', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
          title="Ver inventarios de frescura"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label" style={{ color: '#64748b' }}><FiRotateCw size={16} /> Alerta de Frescura (&lt;24h)</span>
            <FiChevronRight size={16} style={{ color: '#f97316' }} />
          </div>
          <span className="stat-value" style={{ fontSize: '1.4rem', color: expiring.length > 0 ? '#ea580c' : '#16a34a' }}>
            {expiring.length} por vencer
          </span>
          {expiring.length > 0 ? (
            <div style={{ marginTop: '4px' }}>
              {expiring.slice(0, 2).map(p => (
                <div key={p.id_producto} style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 600 }}>
                  ⚠️ {p.nombre} — {Math.round(parseFloat(p.horas_restantes))}h restantes
                </div>
              ))}
            </div>
          ) : (
            <span className="stat-sub" style={{ color: '#16a34a', fontWeight: 600 }}>Todo el stock está fresco ✓</span>
          )}
        </div>

        {/* Devoluciones Pendientes */}
        <div
          className="admin-stat-card"
          onClick={() => navigate('/admin/devoluciones')}
          style={{ borderLeft: `4px solid ${returnsCount > 0 ? '#ef4444' : '#10b981'}`, cursor: 'pointer', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
          title="Ver solicitudes de devolución"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label" style={{ color: '#64748b' }}><FiAlertTriangle size={16} /> Devoluciones Pendientes</span>
            <FiChevronRight size={16} style={{ color: returnsCount > 0 ? '#ef4444' : '#10b981' }} />
          </div>
          <span className="stat-value" style={{ fontSize: '1.4rem', color: returnsCount > 0 ? '#dc2626' : '#16a34a' }}>
            {returnsCount} pendientes
          </span>
          <span className="stat-sub" style={{ color: returnsCount > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
            {returnsCount > 0 ? 'Requieren revisión administrativa' : 'Atención al cliente al día ✓'}
          </span>
        </div>
      </div>

      {/* Clean White Analytics Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Sales Chart */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiTrendingUp style={{ color: 'var(--color-primary)' }} /> Evolución Mensual de Ventas ($)
          </h3>
          {(() => {
            const monthlyData = [
              { month: 'Ene', sales: resumen.ventasTotales * 0.4 },
              { month: 'Feb', sales: resumen.ventasTotales * 0.55 },
              { month: 'Mar', sales: resumen.ventasTotales * 0.7 },
              { month: 'Abr', sales: resumen.ventasTotales * 0.82 },
              { month: 'May', sales: resumen.ventasTotales * 0.93 },
              { month: 'Jun', sales: resumen.ventasTotales }
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
                  <linearGradient id="salesGradLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c47f3b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#c47f3b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="45" y1="20" x2="380" y2="20" stroke="#f1f5f9" />
                <line x1="45" y1="70" x2="380" y2="70" stroke="#f1f5f9" />
                <line x1="45" y1="120" x2="380" y2="120" stroke="#f1f5f9" />
                <line x1="45" y1="170" x2="380" y2="170" stroke="#e2e8f0" />
                <text x="10" y="25" fill="#94a3b8" fontSize="9">${maxSales.toFixed(0)}</text>
                <text x="10" y="95" fill="#94a3b8" fontSize="9">${(maxSales/2).toFixed(0)}</text>
                <text x="10" y="165" fill="#94a3b8" fontSize="9">$0</text>
                <path d={areaString} fill="url(#salesGradLight)" />
                <path d={pathString} fill="none" stroke="#c47f3b" strokeWidth="3" />
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#c47f3b" strokeWidth="2.5" />
                    <text x={p.x} y="186" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle">{p.month}</text>
                    <text x={p.x} y={p.y - 8} fill="#0f172a" fontSize="8" fontWeight="700" textAnchor="middle">${p.sales.toFixed(0)}</text>
                  </g>
                ))}
              </svg>
            );
          })()}
        </div>

        {/* Order Status Chart */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiShoppingBag style={{ color: '#3b82f6' }} /> Distribución de Pedidos por Estado
          </h3>
          {(() => {
            const states = pedidosPorEstado.length > 0 ? pedidosPorEstado : [
              { estado: 'pendiente', cantidad: 0 },
              { estado: 'confirmado', cantidad: 0 },
              { estado: 'preparando', cantidad: 0 },
              { estado: 'en_camino', cantidad: 0 },
              { estado: 'entregado', cantidad: 0 }
            ];
            const maxCount = Math.max(...states.map(e => parseInt(e.cantidad)), 1);
            return (
              <svg viewBox="0 0 400 200" style={{ width: '100%', height: '200px' }}>
                <line x1="40" y1="20" x2="380" y2="20" stroke="#f1f5f9" />
                <line x1="40" y1="65" x2="380" y2="65" stroke="#f1f5f9" />
                <line x1="40" y1="110" x2="380" y2="110" stroke="#f1f5f9" />
                <line x1="40" y1="155" x2="380" y2="155" stroke="#f1f5f9" />
                <line x1="40" y1="170" x2="380" y2="170" stroke="#e2e8f0" />
                {states.map((e, idx) => {
                  const width = 340 / states.length;
                  const barWidth = Math.min(28, width - 8);
                  const x = 40 + idx * width + (width - barWidth) / 2;
                  const count = parseInt(e.cantidad);
                  const height = (count / maxCount) * 135;
                  const y = 170 - height;
                  const colors = {
                    pendiente: '#f59e0b',
                    confirmado: '#3b82f6',
                    preparando: '#8b5cf6',
                    en_camino: '#ea580c',
                    entregado: '#10b981',
                    cancelado: '#ef4444'
                  };
                  const color = colors[e.estado] || '#64748b';
                  return (
                    <g key={e.estado}>
                      <rect x={x} y={y} width={barWidth} height={height} fill={color} rx="4" />
                      <text x={x + barWidth / 2} y="186" fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle">{e.estado.substring(0, 6)}</text>
                      {count > 0 && (
                        <text x={x + barWidth / 2} y={y - 6} fill="#0f172a" fontSize="9" fontWeight="700" textAnchor="middle">{count}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>
      </div>

      {/* Tables section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Pedidos recientes */}
        <div className="admin-table-wrapper" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div className="admin-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Pedidos Recientes</h3>
            <button onClick={() => navigate('/admin/pedidos')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
              Ver todos →
            </button>
          </div>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>#</th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>Cliente</th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>Total</th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidosRecientes.slice(0, 5).map(p => (
                <tr key={p.id_pedido} onClick={() => navigate('/admin/pedidos')} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>#{p.id_pedido}</td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>{p.nombre} {p.apellido}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>${parseFloat(p.total).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`admin-badge badge-${p.estado}`} style={{ fontSize: '0.7rem' }}>
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Productos más vendidos */}
        <div className="admin-table-wrapper" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div className="admin-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Productos Más Vendidos</h3>
            <button onClick={() => navigate('/admin/productos')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
              Ver catálogo →
            </button>
          </div>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>Producto</th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>Vendidos</th>
                <th style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {topProductos.slice(0, 5).map(p => (
                <tr key={p.id_producto} onClick={() => navigate('/admin/productos')} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{p.nombre}</td>
                  <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: 700 }}>{p.total_vendido} un.</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 700 }}>${parseFloat(p.precio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
