import { useState, useEffect } from 'react';
import { producerAPI } from '../../services/api';
import { FiBox, FiShoppingBag, FiUsers, FiDollarSign, FiAlertTriangle } from 'react-icons/fi';

export default function ProducerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    producerAPI.getDashboard()
      .then(res => setData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">Cargando...</div>;
  if (!data) return <div className="admin-empty">Error al cargar el dashboard</div>;

  return (
    <div>
      <div className="admin-section-header">
        <h2>Bienvenido, {data.negocio.nombre_negocio}</h2>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card accent">
          <span className="stat-label"><FiDollarSign size={14} /> Ingresos Totales</span>
          <span className="stat-value">${data.ingresos.toFixed(2)}</span>
          <span className="stat-sub">De todos tus productos vendidos</span>
        </div>
        <div className="admin-stat-card info">
          <span className="stat-label"><FiShoppingBag size={14} /> Pedidos</span>
          <span className="stat-value">{data.totalPedidos}</span>
          <span className="stat-sub">{data.pedidosActivos} activos</span>
        </div>
        <div className="admin-stat-card success">
          <span className="stat-label"><FiBox size={14} /> Productos</span>
          <span className="stat-value">{data.totalProductos}</span>
          <span className="stat-sub">{data.productosDisponibles} disponibles</span>
        </div>
        <div className="admin-stat-card warning">
          <span className="stat-label"><FiUsers size={14} /> Trabajadores</span>
          <span className="stat-value">{data.totalTrabajadores}</span>
          <span className="stat-sub">Activos en tu negocio</span>
        </div>
      </div>

      {data.productosPorVencer.length > 0 && (
        <div className="admin-table-wrapper" style={{marginTop:'20px'}}>
          <div className="admin-table-header">
            <h3><FiAlertTriangle style={{color:'#f97316'}} /> Productos próximos a vencer (&lt;24h)</h3>
          </div>
          <table className="admin-table">
            <thead><tr><th>Producto</th><th>Stock</th><th>Horas restantes</th></tr></thead>
            <tbody>
              {data.productosPorVencer.map((p, i) => (
                <tr key={i}>
                  <td style={{fontWeight:600,color:'#f97316'}}>{p.nombre}</td>
                  <td>{p.stock} unidades</td>
                  <td>{Math.round(parseFloat(p.horas_restantes))}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-table-wrapper" style={{marginTop:'20px'}}>
        <div className="admin-table-header"><h3>Información del Negocio</h3></div>
        <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div><span style={{color:'#71717a',fontSize:'0.8rem'}}>Ciudad</span><div style={{color:'#fff',fontWeight:500}}>{data.negocio.ciudad || '—'}</div></div>
          <div><span style={{color:'#71717a',fontSize:'0.8rem'}}>Provincia</span><div style={{color:'#fff',fontWeight:500}}>{data.negocio.provincia || '—'}</div></div>
          <div><span style={{color:'#71717a',fontSize:'0.8rem'}}>Teléfono</span><div style={{color:'#fff',fontWeight:500}}>{data.negocio.telefono || '—'}</div></div>
          <div><span style={{color:'#71717a',fontSize:'0.8rem'}}>Email</span><div style={{color:'#fff',fontWeight:500}}>{data.negocio.email || '—'}</div></div>
          <div><span style={{color:'#71717a',fontSize:'0.8rem'}}>Registrado</span><div style={{color:'#fff',fontWeight:500}}>{new Date(data.negocio.fecha_registro).toLocaleDateString('es-EC')}</div></div>
        </div>
      </div>
    </div>
  );
}
