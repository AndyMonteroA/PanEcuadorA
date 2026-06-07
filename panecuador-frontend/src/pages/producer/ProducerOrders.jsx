import { useState, useEffect } from 'react';
import { producerAPI } from '../../services/api';

export default function ProducerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    producerAPI.getOrders()
      .then(res => setOrders(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (estado) => {
    const colors = {
      pendiente: 'badge-pendiente', confirmado: 'badge-confirmado',
      preparando: 'badge-preparando', en_camino: 'badge-en_camino',
      entregado: 'badge-entregado', cancelado: 'badge-cancelado'
    };
    return <span className={`admin-badge ${colors[estado] || ''}`}>{estado}</span>;
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Mis Pedidos</h2>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{orders.length} pedidos con tus productos</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Mis Items</th><th>Total Pedido</th><th>Estado</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id_pedido}>
                  <td style={{fontWeight:600}}>#{o.id_pedido}</td>
                  <td>
                    <div style={{color:'#fff'}}>{o.cliente_nombre} {o.cliente_apellido}</div>
                    <div style={{fontSize:'0.72rem',color:'#71717a'}}>{o.cliente_email}</div>
                  </td>
                  <td>
                    {o.mis_items?.map((item, i) => (
                      <div key={i} style={{fontSize:'0.78rem',marginBottom:'2px'}}>
                        <span style={{color:'#c47f3b'}}>{item.cantidad}x</span> {item.producto} — ${parseFloat(item.subtotal).toFixed(2)}
                      </div>
                    )) || '—'}
                  </td>
                  <td style={{fontWeight:600}}>${parseFloat(o.total).toFixed(2)}</td>
                  <td>{statusBadge(o.estado)}</td>
                  <td style={{fontSize:'0.78rem',color:'#a1a1aa'}}>
                    {new Date(o.fecha_pedido).toLocaleDateString('es-EC', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">
                  <div className="admin-empty-icon">📋</div>
                  <p>No hay pedidos con tus productos aún</p>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
