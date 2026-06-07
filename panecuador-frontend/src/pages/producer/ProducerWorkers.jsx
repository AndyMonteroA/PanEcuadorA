import { useState, useEffect } from 'react';
import { producerAPI } from '../../services/api';
import { FiClock, FiUser, FiPhone, FiSun, FiMoon, FiSunrise } from 'react-icons/fi';

const SPECIALTY_LABELS = {
  panadero: { label: 'Panadero', emoji: '🥖', color: '#f59e0b' },
  pastelero: { label: 'Pastelero', emoji: '🎂', color: '#ec4899' },
  ambos: { label: 'Panadero & Pastelero', emoji: '🍞', color: '#6366f1' },
};

const SHIFT_CONFIG = {
  Mañana: { icon: FiSunrise, color: '#f59e0b', bg: '#fef3c7', label: 'Turno Mañana' },
  Tarde:  { icon: FiSun,     color: '#3b82f6', bg: '#dbeafe', label: 'Turno Tarde' },
  Noche:  { icon: FiMoon,    color: '#8b5cf6', bg: '#ede9fe', label: 'Turno Noche' },
};

export default function ProducerWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkers();
  }, []);

  async function fetchWorkers() {
    try {
      const res = await producerAPI.getWorkers();
      setWorkers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-screen"><div className="spinner" /><p>Cargando trabajadores...</p></div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const workersOnShift = workers.filter(w => w.turno_hoy);
  const workersOffShift = workers.filter(w => !w.turno_hoy);

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-page-title">👷 Mis Trabajadores</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            📅 {today}
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-card)', padding: '10px 18px',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)'
        }}>
          <FiUser size={16} style={{ color: 'var(--color-primary)' }} />
          <strong>{workers.length}</strong>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>trabajadores en tu equipo</span>
        </div>
      </div>

      {workers.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-emoji">👷</span>
          <h3>Sin trabajadores asignados</h3>
          <p>El administrador aún no ha asignado trabajadores a tu negocio.</p>
        </div>
      ) : (
        <>
          {/* Working today section */}
          {workersOnShift.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#22c55e' }}>●</span> Trabajando hoy ({workersOnShift.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {workersOnShift.map(worker => {
                  const spec = SPECIALTY_LABELS[worker.especialidad] || { label: worker.especialidad, emoji: '👤', color: '#6b7280' };
                  const turno = worker.turno_hoy;
                  const shiftConf = SHIFT_CONFIG[turno?.nombre] || {};
                  const ShiftIcon = shiftConf.icon || FiClock;

                  return (
                    <div key={worker.id_trabajador} className="card" style={{ padding: '20px', border: `2px solid ${shiftConf.color || '#e5e7eb'}` }}>
                      {/* Worker header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <div style={{
                          width: '50px', height: '50px', borderRadius: '50%',
                          background: `${spec.color}20`, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                        }}>
                          {spec.emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                            {worker.nombre} {worker.apellido}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Cédula: {worker.cedula}
                          </div>
                        </div>
                      </div>

                      {/* Specialty */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 12px', borderRadius: '20px',
                        background: `${spec.color}15`, color: spec.color,
                        fontWeight: '600', fontSize: '0.8rem', marginBottom: '12px'
                      }}>
                        {spec.emoji} {spec.label}
                      </div>

                      {/* Shift badge */}
                      {turno && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '10px 14px', borderRadius: '10px',
                          background: shiftConf.bg || '#f3f4f6', marginBottom: '12px'
                        }}>
                          <ShiftIcon size={18} style={{ color: shiftConf.color }} />
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.875rem', color: shiftConf.color }}>
                              {shiftConf.label || turno.nombre}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {turno.hora_inicio?.slice(0, 5)} – {turno.hora_fin?.slice(0, 5)}
                            </div>
                          </div>
                          <div style={{ marginLeft: 'auto', width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                        </div>
                      )}

                      {/* Phone */}
                      {worker.telefono && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <FiPhone size={13} /> {worker.telefono}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Off shift section */}
          {workersOffShift.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#9ca3af' }}>●</span> Sin turno hoy ({workersOffShift.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {workersOffShift.map(worker => {
                  const spec = SPECIALTY_LABELS[worker.especialidad] || { label: worker.especialidad, emoji: '👤', color: '#6b7280' };
                  return (
                    <div key={worker.id_trabajador} className="card" style={{ padding: '18px', opacity: 0.75 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '50%',
                          background: '#f3f4f6', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem'
                        }}>
                          {spec.emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600' }}>{worker.nombre} {worker.apellido}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{spec.label}</div>
                        </div>
                        <div style={{
                          marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af',
                          background: '#f3f4f6', padding: '4px 10px', borderRadius: '20px'
                        }}>
                          Libre hoy
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
