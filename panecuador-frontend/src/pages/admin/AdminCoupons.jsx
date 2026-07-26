import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiSend, FiMail, FiUsers, FiAward } from 'react-icons/fi';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [campaignModal, setCampaignModal] = useState({ open: false, coupon: null, audience: 'todos' });
  const [form, setForm] = useState({ codigo: '', tipo_descuento: 'porcentaje', valor: '', fecha_vencimiento: '', usos_maximos: '', es_multiuso_usuario: false });
  const [saving, setSaving] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try { const res = await adminAPI.getCoupons(); setCoupons(res.data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ codigo: '', tipo_descuento: 'porcentaje', valor: '', fecha_vencimiento: '', usos_maximos: '', es_multiuso_usuario: false });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (c) => {
    setForm({
      codigo: c.codigo, tipo_descuento: c.tipo_descuento,
      valor: c.valor, fecha_vencimiento: c.fecha_vencimiento?.split('T')[0] || '',
      usos_maximos: c.usos_maximos || '',
      es_multiuso_usuario: !!c.es_multiuso_usuario
    });
    setModal({ open: true, mode: 'edit', data: c });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await adminAPI.createCoupon(form);
        showAlert('Cupón creado exitosamente', 'success');
      } else {
        await adminAPI.updateCoupon(modal.data.id_cupon, form);
        showAlert('Cupón actualizado exitosamente', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadCoupons();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const handleSendCampaign = async () => {
    if (!campaignModal.coupon) return;
    setSendingCampaign(true);
    try {
      const res = await adminAPI.sendCouponCampaign(campaignModal.coupon.id_cupon, { tipo_audiencia: campaignModal.audience });
      showAlert(res.data.message || 'Campaña enviada con éxito', 'success');
      setCampaignModal({ open: false, coupon: null, audience: 'todos' });
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error al enviar campaña', 'error');
    } finally {
      setSendingCampaign(false);
    }
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
        <h2>Cupones de Descuento y Campañas</h2>
        <button className="btn-admin btn-admin-primary" onClick={openCreate}><FiPlus /> Nuevo Cupón</button>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{coupons.length} cupones registrados</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Fidelidad / Reuso</th>
                <th>Vencimiento</th>
                <th>Usos Totales</th>
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
                  <td>
                    <span className={`admin-badge ${c.es_multiuso_usuario ? 'badge-confirmado' : 'badge-pendiente'}`}>
                      {c.es_multiuso_usuario ? '♾️ Multiuso por usuario' : '👤 1 uso por usuario'}
                    </span>
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
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-admin btn-admin-sm btn-admin-primary" onClick={() => setCampaignModal({ open: true, coupon: c, audience: 'fieles' })} title="Enviar por correo a clientes">
                        <FiSend size={13} /> Enviar
                      </button>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(c)}><FiEdit2 size={13} /></button>
                      <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDelete(c.id_cupon, c.codigo)}><FiTrash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={7} className="admin-empty">No hay cupones</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear/Editar Cupón */}
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
                  <label>Usos máximos generales</label>
                  <input type="number" min="1" className="admin-input" value={form.usos_maximos} onChange={e => setForm({...form, usos_maximos: e.target.value})} placeholder="Ilimitado" />
                </div>
              </div>
              <div className="admin-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
                <input type="checkbox" id="es_multiuso_usuario" checked={form.es_multiuso_usuario} onChange={e => setForm({...form, es_multiuso_usuario: e.target.checked})} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="es_multiuso_usuario" style={{ cursor: 'pointer', margin: 0, fontSize: '0.88rem' }}>
                  Permitir que el mismo cliente use este cupón varias veces (Multiuso)
                </label>
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

      {/* Modal Enviar Campaña por Email */}
      {campaignModal.open && (
        <div className="admin-modal-overlay" onClick={() => setCampaignModal({ open: false, coupon: null, audience: 'todos' })}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>📧 Enviar Cupón a Clientes por Email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Estás a punto de enviar el cupón <strong>{campaignModal.coupon?.codigo}</strong> por correo electrónico y notificación in-app.
            </p>
            
            <div className="admin-form-group">
              <label>Seleccionar Audiencia de Clientes:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="audience" value="fieles" checked={campaignModal.audience === 'fieles'} onChange={() => setCampaignModal({ ...campaignModal, audience: 'fieles' })} />
                  <div>
                    <strong>⭐ Clientes Fieles (TOP Compradores)</strong><br/>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Usuarios que han realizado 2 o más pedidos exitosos.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="audience" value="todos" checked={campaignModal.audience === 'todos'} onChange={() => setCampaignModal({ ...campaignModal, audience: 'todos' })} />
                  <div>
                    <strong>📢 Todos los Clientes Registrados</strong><br/>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Envío masivo a toda la base de datos de usuarios activos.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="admin-modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-admin btn-admin-ghost" onClick={() => setCampaignModal({ open: false, coupon: null, audience: 'todos' })}>Cancelar</button>
              <button type="button" className="btn-admin btn-admin-primary" onClick={handleSendCampaign} disabled={sendingCampaign}>
                {sendingCampaign ? 'Enviando Campaña...' : '🚀 Enviar Campaña por Correo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
