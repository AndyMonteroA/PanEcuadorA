import { useState, useEffect } from 'react';
import { workerAPI } from '../../services/api';
import { FiClock, FiCalendar, FiUser, FiHome, FiTrendingUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const SPECIALTIES = { panadero: '🥖 Panadero', pastelero: '🎂 Pastelero', ambos: '🍞 Ambos' };

export default function WorkerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasksCount, setTasksCount] = useState({ total: 0, pending: 0, preparing: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await workerAPI.getDashboard();
      setData(res.data.data);
      
      const tasksRes = await workerAPI.getTasks();
      const list = tasksRes.data.data;
      setTasksCount({
        total: list.length,
        pending: list.filter(t => t.estado === 'pendiente').length,
        preparing: list.filter(t => t.estado === 'preparando').length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-screen"><div className="spinner" /><p>Cargando panel...</p></div>
      </div>
    );
  }

  const worker = data?.trabajador;
  const negocio = data?.negocio;
  const shift = data?.turnoHoy;
  const schedule = data?.turnosSemana || [];

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-page-title">👋 ¡Hola, {worker?.nombre}!</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            Bienvenido a tu estación de trabajo en <strong>{negocio?.nombre_negocio || 'PanEcuador'}</strong>.
          </p>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="stat-card card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Mi Especialidad</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.8rem' }}>{worker?.especialidad === 'panadero' ? '🥖' : worker?.especialidad === 'pastelero' ? '🎂' : '🍞'}</span>
            <strong style={{ fontSize: '1.2rem' }}>{SPECIALTIES[worker?.especialidad] || worker?.especialidad}</strong>
          </div>
        </div>

        <div className="stat-card card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Turno de Hoy</span>
          {shift ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.8rem' }}>🟢</span>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block' }}>{shift.nombre}</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {shift.hora_inicio?.slice(0, 5)} - {shift.hora_fin?.slice(0, 5)}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <span style={{ fontSize: '1.8rem' }}>💤</span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Libre hoy</strong>
            </div>
          )}
        </div>

        <div className="stat-card card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Productos por Elaborar</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.8rem' }}>🥣</span>
            <strong style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>{tasksCount.pending + tasksCount.preparing}</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pendientes</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
        {/* Left: Quick Tasks Access */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiTrendingUp /> Cola de Producción Activa
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
            Tienes {tasksCount.pending} tareas nuevas y {tasksCount.preparing} en preparación. Accede a la cola de cocina para gestionarlas.
          </p>
          <Link to="/trabajador/tareas" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Ir a la cola de cocina →
          </Link>
        </div>

        {/* Right: Weekly Calendar */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCalendar /> Turnos de la Semana
          </h3>
          {schedule.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tienes turnos programados para los siguientes días.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schedule.map((sch, i) => {
                const isToday = sch.fecha.split('T')[0] === new Date().toISOString().split('T')[0];
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', borderRadius: '8px',
                    background: isToday ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
                    border: isToday ? '1px solid var(--color-primary-light)' : '1px solid transparent'
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {sch.nombre === 'Mañana' ? '🌅' : sch.nombre === 'Tarde' ? '🌤️' : '🌙'}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.875rem', display: 'block' }}>
                        {new Date(sch.fecha + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {sch.nombre} · {sch.hora_inicio?.slice(0, 5)} - {sch.hora_fin?.slice(0, 5)}
                      </span>
                    </div>
                    {isToday && <span className="admin-badge badge-confirmado" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Hoy</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
