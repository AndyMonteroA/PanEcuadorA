import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiSearch } from 'react-icons/fi';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async (page = 1, searchTerm = '') => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ page, limit: 20, search: searchTerm });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers(1, search);
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Usuarios Registrados</h2>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h3>{pagination.total || 0} usuarios</h3>
          <div className="admin-table-actions">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                className="admin-search"
                placeholder="Buscar usuario..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </form>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">Cargando usuarios...</div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Rol</th>
                  <th>Pedidos</th>
                  <th>Total Gastado</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id_usuario}>
                    <td>{u.id_usuario}</td>
                    <td style={{fontWeight:500,color:'#fff'}}>{u.nombre} {u.apellido}</td>
                    <td>{u.email}</td>
                    <td>{u.telefono || '—'}</td>
                    <td><span className={`admin-badge badge-${u.rol}`}>{u.rol}</span></td>
                    <td>{u.total_pedidos}</td>
                    <td style={{fontWeight:600}}>${parseFloat(u.total_gastado).toFixed(2)}</td>
                    <td style={{fontSize:'0.78rem',color:'#a1a1aa'}}>
                      {new Date(u.fecha_registro).toLocaleDateString('es-EC')}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={8} className="admin-empty">No se encontraron usuarios</td></tr>
                )}
              </tbody>
            </table>

            {pagination.totalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={pagination.page <= 1} onClick={() => loadUsers(pagination.page - 1, search)}>Anterior</button>
                <span className="admin-pagination-info">Página {pagination.page} de {pagination.totalPages}</span>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadUsers(pagination.page + 1, search)}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
