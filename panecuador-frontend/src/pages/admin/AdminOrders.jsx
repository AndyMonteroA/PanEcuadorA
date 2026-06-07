import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadOrders(); }, [filter]);

  const loadOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter) params.estado = filter;
      const res = await adminAPI.getOrders(params);
      setOrders(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminAPI.updateOrderStatus(id, newStatus);
      setAlert({ message: `Pedido #${id} actualizado a "${newStatus}"`, type: 'success' });
      setTimeout(() => setAlert(null), 3000);
      loadOrders(pagination.page);
    } catch (err) {
      setAlert({ message: err.response?.data?.message || 'Error', type: 'error' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const statuses = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado'];

  return (
    <div>
      <div className="admin-section-header">
        <h2>Gestión de Pedidos</h2>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h3>Pedidos</h3>
          <div className="admin-table-actions">
            <select className="admin-search" value={filter} onChange={e => setFilter(e.target.value)} style={{width:'180px'}}>
              <option value="">Todos los estados</option>
              {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_',' ')}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">Cargando pedidos...</div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th># Pedido</th>
                  <th>Cliente</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Cambiar Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id_pedido}>
                    <td style={{fontWeight:600}}>#{o.id_pedido}</td>
                    <td>
                      <div>{o.nombre} {o.apellido}</div>
                      <div style={{fontSize:'0.72rem',color:'#71717a'}}>{o.email}</div>
                    </td>
                    <td>{o.cantidad_total_items}</td>
                    <td style={{fontWeight:600}}>${parseFloat(o.total).toFixed(2)}</td>
                    <td><span className={`admin-badge badge-${o.estado}`}>{o.estado.replace('_',' ')}</span></td>
                    <td style={{fontSize:'0.78rem',color:'#a1a1aa'}}>
                      {new Date(o.fecha_pedido).toLocaleDateString('es-EC')}
                    </td>
                    <td>
                      {o.estado !== 'entregado' && o.estado !== 'cancelado' ? (
                        <select
                          className="status-select"
                          value={o.estado}
                          onChange={e => handleStatusChange(o.id_pedido, e.target.value)}
                        >
                          {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_',' ')}</option>)}
                        </select>
                      ) : (
                        <span style={{fontSize:'0.75rem',color:'#52525b'}}>Finalizado</span>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="admin-empty">No hay pedidos</td></tr>
                )}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={pagination.page <= 1} onClick={() => loadOrders(pagination.page - 1)}>Anterior</button>
                <span className="admin-pagination-info">Página {pagination.page} de {pagination.totalPages}</span>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadOrders(pagination.page + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
