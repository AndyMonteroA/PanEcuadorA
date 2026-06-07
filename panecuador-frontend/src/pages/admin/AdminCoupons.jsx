import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState({ codigo: '', tipo_descuento: 'porcentaje', valor: '', fecha_vencimiento: '', usos_maximos: '' });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try { const res = await adminAPI.getCoupons(); setCoupons(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ codigo: '', tipo_descuento: 'porcentaje', valor: '', fecha_vencimiento: '', usos_maximos: '' });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (c) => {
    setForm({
      codigo: c.codigo, tipo_descuento: c.tipo_descuento,
      valor: c.valor, fecha_vencimiento: c.fecha_vencimiento?.split('T')[0] || '',
      usos_maximos: c.usos_maximos || ''
    });
    setModal({ open: true, mode: 'edit', data: c });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await adminAPI.createCoupon(form);
        showAlert('Cupón creado', 'success');
      } else {
        await adminAPI.updateCoupon(modal.data.id_cupon, form);
        showAlert('Cupón actualizado', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadCoupons();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, codigo) => {
    if (!confirm(`¿Eliminar cupón "${codigo}"?`)) return;
    try { await adminAPI.deleteCoupon(id); showAlert('Cupón eliminado', 'success'); loadCoupons(); }
    catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const showAlert = (message, type) => { setAlert({ message, type }); setTimeout(() => setAlert(null), 4000); };

  const isExpired = (date) => date && new Date(date) < new Date();

  return (
    <div>
      <div className="admin-section-header">
        <h2>Cupones de Descuento</h2>
        <button className="btn-admin btn-admin-primary" onClick={openCreate}><FiPlus /> Nuevo Cupón</button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{coupons.length} cupones</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Vencimiento</th>
                <th>Usos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id_cupon}>
                  <td style={{fontWeight:700,color:'#c47f3b',letterSpacing:'0.05em'}}>{c.codigo}</td>
                  <td>
                    <span className={`admin-badge ${c.tipo_descuento === 'porcentaje' ? 'badge-confirmado' : 'badge-preparando'}`}>
                      {c.tipo_descuento === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                    </span>
                  </td>
                  <td style={{fontWeight:600}}>
                    {c.tipo_descuento === 'porcentaje' ? `${parseFloat(c.valor)}%` : `$${parseFloat(c.valor).toFixed(2)}`}
                  </td>
                  <td style={{fontSize:'0.78rem'}}>
                    {c.fecha_vencimiento ? (
                      <span style={{color: isExpired(c.fecha_vencimiento) ? '#ef4444' : '#a1a1aa'}}>
                        {new Date(c.fecha_vencimiento).toLocaleDateString('es-EC')}
                        {isExpired(c.fecha_vencimiento) && ' (Vencido)'}
                      </span>
                    ) : 'Sin vencimiento'}
                  </td>
                  <td>{c.usos_actuales} / {c.usos_maximos || '∞'}</td>
                  <td>
                    <span className={`admin-badge ${c.activo && !isExpired(c.fecha_vencimiento) ? 'badge-available' : 'badge-unavailable'}`}>
                      {c.activo && !isExpired(c.fecha_vencimiento) ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(c)}><FiEdit2 size={14} /></button>
                      <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDelete(c.id_cupon, c.codigo)}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={7} className="admin-empty">No hay cupones</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {modal.open && (
        <div className="admin-modal-overlay" onClick={() => setModal({open:false,mode:'create',data:null})}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? '🎟️ Nuevo Cupón' : '✏️ Editar Cupón'}</h2>
            <form onSubmit={handleSave}>
              <div className="admin-form-group">
                <label>Código *</label>
                <input className="admin-input" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})} required placeholder="Ej: BIENVENIDO10" style={{textTransform:'uppercase'}} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Tipo de descuento *</label>
                  <select className="admin-select" value={form.tipo_descuento} onChange={e => setForm({...form, tipo_descuento: e.target.value})}>
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto_fijo">Monto fijo ($)</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Valor * {form.tipo_descuento === 'porcentaje' ? '(%)' : '($)'}</label>
                  <input type="number" step="0.01" min="0" className="admin-input" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} required />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Fecha de vencimiento</label>
                  <input type="date" className="admin-input" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} />
                </div>
                <div className="admin-form-group">
                  <label>Usos máximos</label>
                  <input type="number" min="1" className="admin-input" value={form.usos_maximos} onChange={e => setForm({...form, usos_maximos: e.target.value})} placeholder="Ilimitado" />
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => setModal({open:false,mode:'create',data:null})}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (modal.mode === 'create' ? 'Crear Cupón' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
