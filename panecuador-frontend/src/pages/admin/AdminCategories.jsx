import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCategories();
      setCategories(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ nombre: '', descripcion: '' });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (cat) => {
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion || '' });
    setModal({ open: true, mode: 'edit', data: cat });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await adminAPI.createCategory(form);
        showAlert('Categoría creada', 'success');
      } else {
        await adminAPI.updateCategory(modal.data.id_categoria, form);
        showAlert('Categoría actualizada', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadCategories();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
    try {
      await adminAPI.deleteCategory(id);
      showAlert('Categoría eliminada', 'success');
      loadCategories();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error al eliminar', 'error');
    }
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Categorías</h2>
        <button className="btn-admin btn-admin-primary" onClick={openCreate}>
          <FiPlus /> Nueva Categoría
        </button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h3>{categories.length} categorías</h3>
        </div>
        {loading ? (
          <div className="admin-loading">Cargando...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Productos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id_categoria}>
                  <td>{c.id_categoria}</td>
                  <td style={{fontWeight:600,color:'#fff'}}>{c.nombre}</td>
                  <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.descripcion || '—'}</td>
                  <td>{c.total_productos}</td>
                  <td>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(c)}><FiEdit2 size={14} /></button>
                      <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDelete(c.id_categoria, c.nombre)}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <div className="admin-modal-overlay" onClick={() => setModal({open:false,mode:'create',data:null})}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? '✨ Nueva Categoría' : '✏️ Editar Categoría'}</h2>
            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label>Nombre *</label>
                <input className="admin-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
              </div>
              <div className="admin-form-group">
                <label>Descripción</label>
                <textarea className="admin-textarea" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => setModal({open:false,mode:'create',data:null})}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (modal.mode === 'create' ? 'Crear' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
