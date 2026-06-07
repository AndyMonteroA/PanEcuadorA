import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { FiPlus, FiTrash2, FiClock, FiRefreshCw, FiCalendar, FiUser } from 'react-icons/fi';

const SPECIALTIES = { panadero: '🥖 Panadero', pastelero: '🎂 Pastelero', ambos: '🍞 Ambos' };
const SHIFT_ICONS = { Mañana: '🌅', Tarde: '🌤️', Noche: '🌙' };

// Get array of next 7 dates
function getWeekDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

export default function AdminShifts() {
  const [workers, setWorkers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ id_trabajador: '', id_turno: '', fecha: getWeekDates()[0] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const weekDates = getWeekDates();

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [w, s, a] = await Promise.all([
        adminAPI.getWorkers(),
        adminAPI.getShifts(),
        adminAPI.getShiftAssignments({ fecha_inicio: weekDates[0], fecha_fin: weekDates[6] }),
      ]);
      setWorkers(w.data.data);
      setShifts(s.data.data);
      setAssignments(a.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!form.id_trabajador || !form.id_turno || !form.fecha) return;
    setSaving(true);
    try {
      await adminAPI.createShiftAssignment(form);
      setMsg({ type: 'success', text: '✅ Turno asignado correctamente' });
      fetchAll();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || '❌ Error al asignar turno' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta asignación de turno?')) return;
    try {
      await adminAPI.deleteShiftAssignment(id);
      setAssignments(assignments.filter(a => a.id_asignacion !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateShifts = async () => {
    if (!confirm('¿Generar turnos automáticos para los próximos 7 días? Esto asigna turnos rotativos a todos los trabajadores.')) return;
    try {
      await adminAPI.generateShifts();
      setMsg({ type: 'success', text: '✅ Turnos semanales generados' });
      fetchAll();
    } catch (err) {
      setMsg({ type: 'error', text: '❌ Error al generar turnos' });
    } finally {
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (loading) {
    return <div className="admin-page"><div className="loading-screen"><div className="spinner" /><p>Cargando turnos...</p></div></div>;
  }

  // Build a matrix: workers × dates
  const assignMatrix = {};
  assignments.forEach(a => {
    if (!assignMatrix[a.id_trabajador]) assignMatrix[a.id_trabajador] = {};
    if (!assignMatrix[a.id_trabajador][a.fecha]) assignMatrix[a.id_trabajador][a.fecha] = [];
    assignMatrix[a.id_trabajador][a.fecha].push(a);
  });

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-page-title">🕐 Gestión de Turnos</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            Asigna turnos a los trabajadores para los próximos 7 días
          </p>
        </div>
        <button className="btn btn-secondary" onClick={handleGenerateShifts}>
          <FiRefreshCw size={16} /> Generar turnos automáticos
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Assignment form */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPlus /> Asignar Turno
          </h3>
          <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">Trabajador</label>
              <select
                className="input"
                value={form.id_trabajador}
                onChange={e => setForm({ ...form, id_trabajador: e.target.value })}
                required
              >
                <option value="">— Seleccionar trabajador —</option>
                {workers.map(w => (
                  <option key={w.id_trabajador} value={w.id_trabajador}>
                    {w.nombre} {w.apellido} · {SPECIALTIES[w.especialidad] || w.especialidad}
                    {w.productor_nombre ? ` · ${w.productor_nombre}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Turno</label>
              <select
                className="input"
                value={form.id_turno}
                onChange={e => setForm({ ...form, id_turno: e.target.value })}
                required
              >
                <option value="">— Seleccionar turno —</option>
                {shifts.map(s => (
                  <option key={s.id_turno} value={s.id_turno}>
                    {SHIFT_ICONS[s.nombre] || '⏰'} {s.nombre} ({s.hora_inicio?.slice(0,5)} – {s.hora_fin?.slice(0,5)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label"><FiCalendar size={13} /> Fecha</label>
              <select
                className="input"
                value={form.fecha}
                onChange={e => setForm({ ...form, fecha: e.target.value })}
                required
              >
                {weekDates.map(d => (
                  <option key={d} value={d}>{formatDate(d)}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Asignando...' : <><FiPlus /> Asignar turno</>}
            </button>
          </form>

          {/* Shift legend */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--bg-secondary)' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Turnos disponibles</h4>
            {shifts.map(s => (
              <div key={s.id_turno} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px',
                background: 'var(--bg-secondary)', marginBottom: '8px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>{SHIFT_ICONS[s.nombre] || '⏰'}</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{s.nombre}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {s.hora_inicio?.slice(0,5)} – {s.hora_fin?.slice(0,5)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly matrix */}
        <div className="card" style={{ padding: '24px', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '20px' }}>📅 Semana Actual</h3>

          {workers.length === 0 ? (
            <div className="empty-state"><span className="empty-emoji">👷</span><h3>No hay trabajadores registrados</h3></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--bg-secondary)', color: 'var(--text-muted)', fontWeight: '600', minWidth: '160px' }}>
                    <FiUser size={14} /> Trabajador
                  </th>
                  {weekDates.map(d => (
                    <th key={d} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid var(--bg-secondary)', color: 'var(--text-muted)', fontWeight: '600', minWidth: '110px' }}>
                      {formatDate(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.map(w => (
                  <tr key={w.id_trabajador} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                      <div>{w.nombre} {w.apellido}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {SPECIALTIES[w.especialidad] || w.especialidad}
                        {w.productor_nombre && ` · ${w.productor_nombre}`}
                      </div>
                    </td>
                    {weekDates.map(d => {
                      const dayAssignments = assignMatrix[w.id_trabajador]?.[d] || [];
                      return (
                        <td key={d} style={{ padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                          {dayAssignments.length === 0 ? (
                            <span style={{ color: '#d1d5db', fontSize: '1.2rem' }}>—</span>
                          ) : (
                            dayAssignments.map(a => (
                              <div key={a.id_asignacion} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: a.turno_nombre === 'Mañana' ? '#fef3c7' :
                                           a.turno_nombre === 'Tarde' ? '#dbeafe' : '#1e293b',
                                color: a.turno_nombre === 'Noche' ? 'white' : 'inherit',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                marginBottom: '4px',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleDelete(a.id_asignacion)}
                              title="Click para eliminar"
                              >
                                {SHIFT_ICONS[a.turno_nombre]} {a.turno_nombre}
                              </div>
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            💡 Haz click en un turno asignado para eliminarlo
          </p>
        </div>
      </div>
    </div>
  );
}
