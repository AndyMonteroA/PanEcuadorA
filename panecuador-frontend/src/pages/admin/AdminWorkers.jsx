import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiClock } from 'react-icons/fi';

export default function AdminWorkers() {
  const [workers, setWorkers] = useState([]);
  const [producers, setProducers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [shiftModal, setShiftModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', cedula: '', especialidad: 'panadero', telefono: '', id_productor: '' });
  const [shiftForm, setShiftForm] = useState({ id_trabajador: '', id_turno: '', fecha: '' });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wRes, pRes, sRes, aRes] = await Promise.all([
        adminAPI.getWorkers(),
        adminAPI.getProducers(),
        adminAPI.getShifts(),
        adminAPI.getShiftAssignments()
      ]);
      setWorkers(wRes.data.data);
      setProducers(pRes.data.data);
      setShifts(sRes.data.data);
      setAssignments(aRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ nombre: '', apellido: '', cedula: '', especialidad: 'panadero', telefono: '', id_productor: '' });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (w) => {
    setForm({
      nombre: w.nombre, apellido: w.apellido, cedula: w.cedula,
      especialidad: w.especialidad, telefono: w.telefono || '',
      id_productor: w.id_productor || ''
    });
    setModal({ open: true, mode: 'edit', data: w });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await adminAPI.createWorker(form);
        showAlert('Trabajador registrado', 'success');
      } else {
        await adminAPI.updateWorker(modal.data.id_trabajador, form);
        showAlert('Trabajador actualizado', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadAll();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
    try { await adminAPI.deleteWorker(id); showAlert('Trabajador eliminado', 'success'); loadAll(); }
    catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createShiftAssignment(shiftForm);
      showAlert('Turno asignado', 'success');
      setShiftModal(false);
      loadAll();
    } catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const handleDeleteAssignment = async (id) => {
    try { await adminAPI.deleteShiftAssignment(id); showAlert('Asignación eliminada', 'success'); loadAll(); }
    catch (err) { showAlert(err.response?.data?.message || 'Error', 'error'); }
  };

  const showAlert = (message, type) => { setAlert({ message, type }); setTimeout(() => setAlert(null), 4000); };

  const especialidadBadge = (esp) => {
    const colors = { panadero: 'badge-confirmado', pastelero: 'badge-preparando', ambos: 'badge-entregado' };
    return <span className={`admin-badge ${colors[esp] || ''}`}>{esp}</span>;
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Trabajadores y Turnos</h2>
        <div style={{display:'flex',gap:'10px'}}>
          <button className="btn-admin btn-admin-ghost" onClick={() => { setShiftForm({ id_trabajador: '', id_turno: '', fecha: new Date().toISOString().split('T')[0] }); setShiftModal(true); }}>
            <FiCalendar /> Asignar Turno
          </button>
          <button className="btn-admin btn-admin-primary" onClick={openCreate}><FiPlus /> Nuevo Trabajador</button>
        </div>
      </div>

      {alert && <div className={`admin-alert admin-alert-${alert.type}`}>{alert.message}</div>}

      {/* Tabla de trabajadores */}
      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{workers.length} trabajadores</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cédula</th>
                <th>Especialidad</th>
                <th>Productor</th>
                <th>Teléfono</th>
                <th>Turno Hoy</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id_trabajador}>
                  <td style={{fontWeight:600,color:'#fff'}}>{w.nombre} {w.apellido}</td>
                  <td>{w.cedula}</td>
                  <td>{especialidadBadge(w.especialidad)}</td>
                  <td>
                    {w.productor_nombre ? (
                      <span style={{fontSize:'0.8rem',color:'#c47f3b'}}>{w.productor_nombre}</span>
                    ) : <span style={{color:'#52525b',fontSize:'0.78rem'}}>Sin asignar</span>}
                  </td>
                  <td>{w.telefono || '—'}</td>
                  <td>
                    {w.turno_hoy ? (
                      <span style={{fontSize:'0.78rem'}}>
                        <FiClock size={12} /> {w.turno_hoy.nombre} ({w.turno_hoy.hora_inicio?.slice(0,5)} - {w.turno_hoy.hora_fin?.slice(0,5)})
                      </span>
                    ) : <span style={{color:'#52525b',fontSize:'0.78rem'}}>Sin turno</span>}
                  </td>
                  <td>
                    <span className={`admin-badge ${w.activo ? 'badge-available' : 'badge-unavailable'}`}>
                      {w.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button className="btn-admin btn-admin-sm btn-admin-edit" onClick={() => openEdit(w)}><FiEdit2 size={14} /></button>
                      <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDelete(w.id_trabajador, w.nombre)}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && <tr><td colSpan={8} className="admin-empty">No hay trabajadores</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Turnos de la semana */}
      <div className="admin-table-wrapper" style={{marginTop:'24px'}}>
        <div className="admin-table-header"><h3>Turnos de la Semana</h3></div>
        {assignments.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📅</div>
            <p>No hay turnos asignados esta semana</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Trabajador</th>
                <th>Especialidad</th>
                <th>Turno</th>
                <th>Horario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id_asignacion}>
                  <td style={{fontWeight:500}}>{new Date(a.fecha).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td style={{color:'#fff'}}>{a.nombre} {a.apellido}</td>
                  <td>{especialidadBadge(a.especialidad)}</td>
                  <td><span className="admin-badge badge-confirmado">{a.turno_nombre}</span></td>
                  <td>{a.hora_inicio?.slice(0,5)} - {a.hora_fin?.slice(0,5)}</td>
                  <td>
                    <button className="btn-admin btn-admin-sm btn-admin-delete" onClick={() => handleDeleteAssignment(a.id_asignacion)}><FiTrash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Crear/Editar trabajador */}
      {modal.open && (
        <div className="admin-modal-overlay" onClick={() => setModal({open:false,mode:'create',data:null})}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? '👷 Nuevo Trabajador' : '✏️ Editar Trabajador'}</h2>
            <form onSubmit={handleSave}>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Nombre *</label>
                  <input className="admin-input" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Apellido *</label>
                  <input className="admin-input" value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})} required />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Cédula *</label>
                  <input className="admin-input" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})} required maxLength={15} />
                </div>
                <div className="admin-form-group">
                  <label>Especialidad *</label>
                  <select className="admin-select" value={form.especialidad} onChange={e => setForm({...form, especialidad: e.target.value})}>
                    <option value="panadero">Panadero</option>
                    <option value="pastelero">Pastelero</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Productor (Panadería)</label>
                  <select className="admin-select" value={form.id_productor} onChange={e => setForm({...form, id_productor: e.target.value})}>
                    <option value="">Sin asignar</option>
                    {producers.map(p => <option key={p.id_productor} value={p.id_productor}>{p.nombre_negocio}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Teléfono</label>
                  <input className="admin-input" value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})} />
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => setModal({open:false,mode:'create',data:null})}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (modal.mode === 'create' ? 'Registrar' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Asignar turno */}
      {shiftModal && (
        <div className="admin-modal-overlay" onClick={() => setShiftModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>📅 Asignar Turno</h2>
            <form onSubmit={handleAssignShift}>
              <div className="admin-form-group">
                <label>Trabajador *</label>
                <select className="admin-select" value={shiftForm.id_trabajador} onChange={e => setShiftForm({...shiftForm, id_trabajador: e.target.value})} required>
                  <option value="">Seleccionar...</option>
                  {workers.filter(w => w.activo).map(w => <option key={w.id_trabajador} value={w.id_trabajador}>{w.nombre} {w.apellido} ({w.especialidad})</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Turno *</label>
                  <select className="admin-select" value={shiftForm.id_turno} onChange={e => setShiftForm({...shiftForm, id_turno: e.target.value})} required>
                    <option value="">Seleccionar...</option>
                    {shifts.map(s => <option key={s.id_turno} value={s.id_turno}>{s.nombre} ({s.hora_inicio?.slice(0,5)} - {s.hora_fin?.slice(0,5)})</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Fecha *</label>
                  <input type="date" className="admin-input" value={shiftForm.fecha} onChange={e => setShiftForm({...shiftForm, fecha: e.target.value})} required />
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn-admin btn-admin-ghost" onClick={() => setShiftModal(false)}>Cancelar</button>
                <button type="submit" className="btn-admin btn-admin-primary">Asignar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
