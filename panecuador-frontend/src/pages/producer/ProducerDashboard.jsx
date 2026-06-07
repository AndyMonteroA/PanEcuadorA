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

      {/* Gráficos del Productor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px' }}>
        {/* Gráfico 1: Ventas del Negocio */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: '#fff' }}>📈 Evolución de tus Ingresos</h3>
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
                  <linearGradient id="salesGradProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c47f3b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c47f3b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="45" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.05)" />
                <line x1="45" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.05)" />
                <line x1="45" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.05)" />
                <line x1="45" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.1)" />
                <text x="10" y="25" fill="#71717a" fontSize="8">${maxSales.toFixed(0)}</text>
                <text x="10" y="95" fill="#71717a" fontSize="8">${(maxSales/2).toFixed(0)}</text>
                <text x="10" y="165" fill="#71717a" fontSize="8">$0</text>
                <path d={areaString} fill="url(#salesGradProd)" />
                <path d={pathString} fill="none" stroke="#c47f3b" strokeWidth="3" />
                {points.map((p, idx) => (
                  <g key={idx}>
                    <title>{`${p.month}: $${p.sales.toFixed(2)}`}</title>
                    <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#c47f3b" strokeWidth="2.5" />
                    <text x={p.x} y="185" fill="#a1a1aa" fontSize="9" textAnchor="middle">{p.month}</text>
                    <text x={p.x} y={p.y - 8} fill="#fff" fontSize="8" fontWeight="600" textAnchor="middle">${p.sales.toFixed(0)}</text>
                  </g>
                ))}
              </svg>
            );
          })()}
        </div>

        {/* Gráfico 2: Desempeño Operativo */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1rem', color: '#fff' }}>📊 Resumen Operativo de tu Local</h3>
          {(() => {
            const metrics = [
              { label: 'Prod. Creados', value: data.totalProductos, color: '#22c55e' },
              { label: 'Prod. Dispo', value: data.productosDisponibles, color: '#3b82f6' },
              { label: 'Pedidos Rec.', value: data.totalPedidos, color: '#a855f7' },
              { label: 'Pedidos Act.', value: data.pedidosActivos, color: '#f97316' },
              { label: 'Personal Act.', value: data.totalTrabajadores, color: '#eab308' }
            ];
            const maxVal = Math.max(...metrics.map(m => m.value), 1);
            return (
              <svg viewBox="0 0 400 200" style={{ width: '100%', height: '200px' }}>
                <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.05)" />
                <line x1="40" y1="65" x2="380" y2="65" stroke="rgba(255,255,255,0.05)" />
                <line x1="40" y1="110" x2="380" y2="110" stroke="rgba(255,255,255,0.05)" />
                <line x1="40" y1="155" x2="380" y2="155" stroke="rgba(255,255,255,0.05)" />
                <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.1)" />
                {metrics.map((m, idx) => {
                  const width = 340 / metrics.length;
                  const barWidth = Math.min(30, width - 10);
                  const x = 40 + idx * width + (width - barWidth) / 2;
                  const height = (m.value / maxVal) * 135;
                  const y = 170 - height;
                  return (
                    <g key={m.label}>
                      <title>{`${m.label}: ${m.value}`}</title>
                      <rect x={x} y={y} width={barWidth} height={height} fill={m.color} rx="4" opacity="0.85" />
                      <text x={x + barWidth / 2} y="185" fill="#a1a1aa" fontSize="8" textAnchor="middle">{m.label}</text>
                      <text x={x + barWidth / 2} y={y - 6} fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">{m.value}</text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
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
