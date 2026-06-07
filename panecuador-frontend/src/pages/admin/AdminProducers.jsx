import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AdminProducers() {
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState({ nombre_negocio: '', descripcion: '', ciudad: '', provincia: '', telefono: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadProducers(); }, []);

  const loadProducers = async () => {
    setLoading(true);
    try { const res = await adminAPI.getProducers(); setProducers(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ nombre_negocio: '', descripcion: '', ciudad: '', provincia: '', telefono: '', email: '' });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (p) => {
    setForm({
      nombre_negocio: p.nombre_negocio || '', descripcion: p.descripcion || '',
      ciudad: p.ciudad || '', provincia: p.provincia || '',
      telefono: p.telefono || '', email: p.email || ''
    });
    setModal({ open: true, mode: 'edit', data: p });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await adminAPI.createProducer(form);
        showAlert('Productor creado', 'success');
      } else {
        await adminAPI.updateProducer(modal.data.id_productor, form);
        showAlert('Productor actualizado', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadProducers();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await adminAPI.deleteProducer(id);
      showAlert('Productor eliminado', 'success');
      loadProducers();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const showAlert = (message, type) => { setAlert({ message, type }); setTimeout(() => setAlert(null), 4000); };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Productores</h2>
        <button className="btn-admin btn-admin-primary" onClick={openCreate}><FiPlus /> Nuevo Productor</button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{producers.length} productores</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Ciudad</th>
                <th>Provincia</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Productos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {producers.map(p => (
                <tr key={p.id_productor}>
                  <td style={{fontWeight:600,color:'#fff'}}>{p.nombre_negocio}</td>
                  <td>{p.ciudad || '—'}</td>
                  <td>{p.provincia || '—'}</td>
                  <td>{p.telefono || '—'}</td>
                  <td style={{fontSize:'0.78rem'}}>{p.email || '—'}</td>
                  <td>{p.total_productos}</td>
                  <td>
                    <span className={`admin-badge ${p.activo ? 'badge-available' : 'badge-unavailable'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(p)}><FiEdit2 size={14} /></button>
                      <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDelete(p.id_productor, p.nombre_negocio)}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {producers.length === 0 && <tr><td colSpan={8} className="admin-empty">No hay productores</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <div className="admin-modal-overlay" onClick={() => setModal({open:false,mode:'create',data:null})}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? '🏪 Nuevo Productor' : '✏️ Editar Productor'}</h2>
            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label>Nombre del negocio *</label>
                <input className="admin-input" value={form.nombre_negocio} onChange={e => setForm({...form, nombre_negocio: e.target.value})} required />
              </div>
              <div className="admin-form-group">
                <label>Descripción</label>
                <textarea className="admin-textarea" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Ciudad</label>
                  <input className="admin-input" value={form.ciudad} onChange={e => setForm({...form, ciudad: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label>Provincia</label>
                  <input className="admin-input" value={form.provincia} onChange={e => setForm({...form, provincia: e.target.value})} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Teléfono</label>
                  <input className="admin-input" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label>Email</label>
                  <input type="email" className="admin-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
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
