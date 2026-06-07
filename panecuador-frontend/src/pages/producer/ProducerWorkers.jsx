import { useState, useEffect } from 'react';
import { producerAPI } from '../../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiClock, FiUser, FiPhone, FiMail, FiLock } from 'react-icons/fi';

const SPECIALTIES = { panadero: '🥖 Panadero', pastelero: '🎂 Pastelero', ambos: '🍞 Ambos' };

export default function ProducerWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    especialidad: 'panadero',
    telefono: '',
    email: '',
    password: ''
  });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const res = await producerAPI.getWorkers();
      setWorkers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({
      nombre: '',
      apellido: '',
      cedula: '',
      especialidad: 'panadero',
      telefono: '',
      email: '',
      password: ''
    });
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (w) => {
    setForm({
      nombre: w.nombre,
      apellido: w.apellido,
      cedula: w.cedula,
      especialidad: w.especialidad,
      telefono: w.telefono || '',
      email: w.email || '',
      password: '' // Contraseña en blanco por seguridad al editar
    });
    setModal({ open: true, mode: 'edit', data: w });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.email) delete payload.email;
      if (!payload.password) delete payload.password;

      if (modal.mode === 'create') {
        await producerAPI.createWorker(payload);
        showAlert('Trabajador registrado y cuenta de acceso creada (si se proporcionó correo)', 'success');
      } else {
        await producerAPI.updateWorker(modal.data.id_trabajador, payload);
        showAlert('Trabajador y credenciales actualizados correctamente', 'success');
      }
      setModal({ open: false, mode: 'create', data: null });
      loadWorkers();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error al guardar trabajador', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar al trabajador "${nombre}"? Esto también eliminará su cuenta de usuario y asignaciones de turno.`)) return;
    try {
      await producerAPI.deleteWorker(id);
      showAlert('Trabajador eliminado correctamente', 'success');
      loadWorkers();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error al eliminar trabajador', 'error');
    }
  };

  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const especialidadBadge = (esp) => {
    const colors = { panadero: 'badge-confirmado', pastelero: 'badge-preparando', ambos: 'badge-entregado' };
    return <span className={`admin-badge ${colors[esp] || ''}`}>{SPECIALTIES[esp] || esp}</span>;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-page-title">👷 Gestión de Personal</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            Registra trabajadores, edita sus especialidades y configura sus credenciales de acceso para la cocina.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <FiPlus /> Registrar Trabajador
        </button>
      </div>

      {alert && (
        <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
          {alert.message}
        </div>
      )}

      {/* Workers table */}
      <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '20px' }}>Miembros de tu Equipo ({workers.length})</h3>
        
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Cargando trabajadores...</p></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--bg-secondary)', color: 'var(--text-muted)', fontWeight: '600' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}><FiUser size={14} /> Nombre</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cédula</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Especialidad</th>
                <th style={{ padding: '12px', textAlign: 'left' }}><FiPhone size={14} /> Teléfono</th>
                <th style={{ padding: '12px', textAlign: 'left' }}><FiMail size={14} /> Correo de Acceso</th>
                <th style={{ padding: '12px', textAlign: 'left' }}><FiClock size={14} /> Turno Hoy</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id_trabajador} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{w.nombre} {w.apellido}</td>
                  <td style={{ padding: '12px' }}>{w.cedula}</td>
                  <td style={{ padding: '12px' }}>{especialidadBadge(w.especialidad)}</td>
                  <td style={{ padding: '12px' }}>{w.telefono || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    {w.email ? (
                      <span style={{ color: 'var(--color-primary-light)', fontWeight: '500' }}>{w.email}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin cuenta</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {w.turno_hoy ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🟢 {w.turno_hoy.nombre}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Off hoy</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span className={`admin-badge ${w.activo ? 'badge-available' : 'badge-unavailable'}`}>
                      {w.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(w)} title="Editar">
                        <FiEdit2 size={14} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(w.id_trabajador, w.nombre)} title="Eliminar" style={{ color: 'red' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No hay trabajadores registrados en tu local.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Crear/Editar trabajador */}
      {modal.open && (
        <div className="admin-modal-overlay" onClick={() => setModal({ open: false, mode: 'create', data: null })}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <h2 style={{ marginBottom: '20px' }}>
              {modal.mode === 'create' ? '👷 Registrar Nuevo Trabajador' : '✏️ Editar Datos del Trabajador'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="admin-form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej: Juan" />
                </div>
                <div className="admin-form-group">
                  <label className="form-label">Apellido *</label>
                  <input className="input" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required placeholder="Ej: Pérez" />
                </div>
              </div>

              <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="admin-form-group">
                  <label className="form-label">Cédula *</label>
                  <input className="input" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} required maxLength={15} placeholder="Ej: 1712345678" />
                </div>
                <div className="admin-form-group">
                  <label className="form-label">Especialidad *</label>
                  <select className="input" value={form.especialidad} onChange={e => setForm({ ...form, especialidad: e.target.value })}>
                    <option value="panadero">Panadero 🥖</option>
                    <option value="pastelero">Pastelero 🎂</option>
                    <option value="ambos">Ambos (Pan & Pasteles) 🍞</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="form-label">Teléfono</label>
                <input className="input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Ej: 0991234567" />
              </div>

              {/* Acceso de Login */}
              <div style={{ marginTop: '12px', padding: '16px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px dashed var(--bg-card)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.9rem' }}>
                  <FiLock /> Cuenta de Acceso a Cocina (Opcional)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Proporciona un correo y contraseña para que este trabajador pueda iniciar sesión en el portal de cocina.
                </p>
                <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="admin-form-group">
                    <label className="form-label">Email de acceso</label>
                    <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="operario@panecuador.online" />
                  </div>
                  <div className="admin-form-group">
                    <label className="form-label">
                      {modal.mode === 'create' ? 'Contraseña' : 'Cambiar contraseña'}
                    </label>
                    <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 caracteres" minLength={6} />
                  </div>
                </div>
              </div>

              <div className="admin-modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal({ open: false, mode: 'create', data: null })}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (modal.mode === 'create' ? 'Registrar' : 'Guardar Cambios')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
