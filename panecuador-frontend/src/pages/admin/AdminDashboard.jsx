import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiShoppingBag, FiDollarSign, FiUsers, FiBox, FiAlertTriangle, FiClock, FiCalendar, FiRotateCw } from 'react-icons/fi';

export default function AdminDashboard() {
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

  if (loading) return <div className="admin-loading">Cargando estadísticas...</div>;
  if (!stats) return <div className="admin-empty">Error al cargar las estadísticas</div>;

  const { resumen, pedidosRecientes, topProductos, pedidosPorEstado } = stats;

  return (
    <div>
      <div className="admin-section-header">
        <h2>Dashboard</h2>
        <button className="btn-admin btn-admin-ghost" onClick={handleGenerateShifts} disabled={generating}>
          <FiCalendar /> {generating ? 'Generando...' : 'Generar Turnos Semana'}
        </button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card accent">
          <span className="stat-label"><FiDollarSign size={14} /> Ventas Totales</span>
          <span className="stat-value">${resumen.ventasTotales.toFixed(2)}</span>
          <span className="stat-sub">Hoy: ${resumen.ventasHoy.toFixed(2)}</span>
        </div>
        <div className="admin-stat-card info">
          <span className="stat-label"><FiShoppingBag size={14} /> Pedidos</span>
          <span className="stat-value">{resumen.totalPedidos}</span>
          <span className="stat-sub">Hoy: {resumen.pedidosHoy}</span>
        </div>
        <div className="admin-stat-card success">
          <span className="stat-label"><FiUsers size={14} /> Usuarios</span>
          <span className="stat-value">{resumen.totalUsuarios}</span>
          <span className="stat-sub">Nuevos esta semana: {resumen.nuevosUsuarios}</span>
        </div>
        <div className="admin-stat-card warning">
          <span className="stat-label"><FiBox size={14} /> Productos</span>
          <span className="stat-value">{resumen.totalProductos}</span>
          <span className="stat-sub">
            {resumen.stockBajo > 0 && <><FiAlertTriangle size={12} /> {resumen.stockBajo} con stock bajo</>}
            {resumen.stockBajo === 0 && 'Stock saludable ✓'}
          </span>
        </div>
      </div>

      {/* Tarjetas operativas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Turno actual */}
        <div className="admin-stat-card" style={{ borderLeft: '3px solid #a855f7' }}>
          <span className="stat-label"><FiClock size={14} /> Turno Actual</span>
          <span className="stat-value" style={{ fontSize: '1.3rem' }}>{turno?.turno || 'Sin turno'}</span>
          <span className="stat-sub">
            {turno?.totalTrabajadores > 0
              ? `${turno.totalTrabajadores} trabajador(es) activo(s)`
              : 'Sin trabajadores asignados'
            }
          </span>
          {turno?.trabajadores?.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {turno.trabajadores.map((t, i) => (
                <span key={i} className="admin-badge badge-preparando" style={{ fontSize: '0.7rem' }}>
                  {t.trabajador_nombre} {t.trabajador_apellido}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Productos por vencer */}
        <div className="admin-stat-card" style={{ borderLeft: '3px solid #f97316' }}>
          <span className="stat-label"><FiRotateCw size={14} /> Productos por Vencer (&lt;24h)</span>
          <span className="stat-value" style={{ fontSize: '1.3rem', color: expiring.length > 0 ? '#f97316' : '#22c55e' }}>
            {expiring.length}
          </span>
          {expiring.length > 0 ? (
            <div style={{ marginTop: '4px' }}>
              {expiring.slice(0, 3).map(p => (
                <div key={p.id_producto} style={{ fontSize: '0.75rem', color: '#f97316', marginBottom: '2px' }}>
                  ⚠️ {p.nombre} — {Math.round(parseFloat(p.horas_restantes))}h restantes
                </div>
              ))}
            </div>
          ) : <span className="stat-sub">Todo el stock está fresco ✓</span>}
        </div>

        {/* Devoluciones pendientes */}
        <div className="admin-stat-card" style={{ borderLeft: `3px solid ${returnsCount > 0 ? '#ef4444' : '#22c55e'}` }}>
          <span className="stat-label"><FiAlertTriangle size={14} /> Devoluciones Pendientes</span>
          <span className="stat-value" style={{ fontSize: '1.3rem', color: returnsCount > 0 ? '#ef4444' : '#22c55e' }}>
            {returnsCount}
          </span>
          <span className="stat-sub">
            {returnsCount > 0 ? 'Requieren atención' : 'Sin devoluciones pendientes ✓'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Pedidos recientes */}
        <div className="admin-table-wrapper">
          <div className="admin-table-header"><h3>Pedidos Recientes</h3></div>
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {pedidosRecientes.map(p => (
                <tr key={p.id_pedido}>
                  <td>#{p.id_pedido}</td>
                  <td>{p.nombre} {p.apellido}</td>
                  <td>${parseFloat(p.total).toFixed(2)}</td>
                  <td><span className={`admin-badge badge-${p.estado}`}>{p.estado}</span></td>
                </tr>
              ))}
              {pedidosRecientes.length === 0 && (
                <tr><td colSpan={4} style={{textAlign:'center', color:'#52525b'}}>Sin pedidos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Productos más vendidos */}
        <div className="admin-table-wrapper">
          <div className="admin-table-header"><h3>Productos Más Vendidos</h3></div>
          <table className="admin-table">
            <thead>
              <tr><th>Producto</th><th>Precio</th><th>Vendidos</th><th>Stock</th></tr>
            </thead>
            <tbody>
              {topProductos.map(p => (
                <tr key={p.id_producto}>
                  <td>
                    <div className="product-cell">
                      {p.imagen_principal ? (
                        <img src={p.imagen_principal} className="product-img" alt="" />
                      ) : (
                        <div className="product-img" style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>🍞</div>
                      )}
                      <span className="product-name">{p.nombre}</span>
                    </div>
                  </td>
                  <td>${parseFloat(p.precio).toFixed(2)}</td>
                  <td>{p.total_vendido}</td>
                  <td>{p.stock}</td>
                </tr>
              ))}
              {topProductos.length === 0 && (
                <tr><td colSpan={4} style={{textAlign:'center', color:'#52525b'}}>Sin ventas aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pedidos por estado */}
      {pedidosPorEstado.length > 0 && (
        <div className="admin-table-wrapper" style={{ marginTop: '24px' }}>
          <div className="admin-table-header"><h3>Pedidos por Estado</h3></div>
          <div style={{ padding: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {pedidosPorEstado.map(e => (
              <div key={e.estado} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '10px'
              }}>
                <span className={`admin-badge badge-${e.estado}`}>{e.estado}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{e.cantidad}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
