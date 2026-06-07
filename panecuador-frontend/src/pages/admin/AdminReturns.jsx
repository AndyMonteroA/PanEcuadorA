import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadReturns(); }, [filter]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.estado = filter;
      const res = await adminAPI.getReturns(params);
      setReturns(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminAPI.updateReturnStatus(id, newStatus);
      showAlert(`Devolución #${id} actualizada a "${newStatus}"`, 'success');
      loadReturns();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const showAlert = (message, type) => { setAlert({ message, type }); setTimeout(() => setAlert(null), 4000); };

  const statuses = ['solicitada', 'en_proceso', 'resuelta', 'rechazada'];

  const statusBadge = (estado) => {
    const colors = {
      solicitada: 'badge-pendiente', en_proceso: 'badge-preparando',
      resuelta: 'badge-entregado', rechazada: 'badge-cancelado'
    };
    return <span className={`admin-badge ${colors[estado] || ''}`}>{estado.replace('_', ' ')}</span>;
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Devoluciones</h2>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h3>{returns.length} devoluciones</h3>
          <div className="admin-table-actions">
            <select className="admin-search" value={filter} onChange={e => setFilter(e.target.value)} style={{width:'180px'}}>
              <option value="">Todos los estados</option>
              {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Pedido</th>
                <th>Total Pedido</th>
                <th>Motivo</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Cambiar Estado</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id_devolucion}>
                  <td style={{fontWeight:600}}>#{r.id_devolucion}</td>
                  <td>
                    <div>{r.nombre} {r.apellido}</div>
                    <div style={{fontSize:'0.72rem',color:'#71717a'}}>{r.email}</div>
                  </td>
                  <td>
                    <span style={{color:'#60a5fa'}}>Pedido #{r.id_pedido}</span>
                    <div style={{fontSize:'0.72rem',color:'#71717a'}}>{r.estado_pedido}</div>
                  </td>
                  <td style={{fontWeight:600}}>${parseFloat(r.total).toFixed(2)}</td>
                  <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.motivo}>
                    {r.motivo}
                  </td>
                  <td>{statusBadge(r.estado)}</td>
                  <td style={{fontSize:'0.78rem',color:'#a1a1aa'}}>
                    {new Date(r.fecha_solicitud).toLocaleDateString('es-EC')}
                  </td>
                  <td>
                    {r.estado !== 'resuelta' && r.estado !== 'rechazada' ? (
                      <select
                        className="status-select"
                        value={r.estado}
                        onChange={e => handleStatusChange(r.id_devolucion, e.target.value)}
                      >
                        {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
                      </select>
                    ) : (
                      <span style={{fontSize:'0.75rem',color:'#52525b'}}>
                        {r.fecha_resolucion ? `Resuelto ${new Date(r.fecha_resolucion).toLocaleDateString('es-EC')}` : 'Finalizado'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr><td colSpan={8} className="admin-empty">
                  <div className="admin-empty-icon">📦</div>
                  <p>No hay devoluciones {filter ? `con estado "${filter}"` : ''}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
