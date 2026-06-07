import { useState, useEffect } from 'react';
import { workerAPI } from '../../services/api';
import { FiClock, FiCheckCircle, FiPlay, FiSmile, FiAlertCircle } from 'react-icons/fi';

export default function WorkerTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const res = await workerAPI.getTasks();
      setTasks(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (idDetalle, newStatus, tipo) => {
    setUpdating(prev => ({ ...prev, [idDetalle]: true }));
    try {
      await workerAPI.updateTaskStatus(idDetalle, newStatus, tipo);
      setTasks(prevTasks =>
        prevTasks.map(t => (t.id_detalle === idDetalle && t.tipo === tipo ? { ...t, estado: newStatus } : t))
      );
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado de la tarea.');
    } finally {
      setUpdating(prev => ({ ...prev, [idDetalle]: false }));
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-screen"><div className="spinner" /><p>Cargando cola de cocina...</p></div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.estado === 'pendiente');
  const preparingTasks = tasks.filter(t => t.estado === 'preparando');
  const completedTasks = tasks.filter(t => t.estado === 'completado');

  const getUrgencyBadge = (dateStr) => {
    if (!dateStr) return null;
    const delivery = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return <span className="admin-badge badge-unavailable" style={{ fontSize: '0.7rem' }}>Urgente (Hoy)</span>;
    if (diffDays === 1) return <span className="admin-badge badge-preparando" style={{ fontSize: '0.7rem' }}>Para Mañana</span>;
    return <span className="admin-badge badge-confirmado" style={{ fontSize: '0.7rem' }}>Próximamente</span>;
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-page-title">🥣 Cola de Cocina (Baking Queue)</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            Visualiza y marca el estado de preparación de los panes y pasteles ordenados por los clientes.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Column 1: PENDIENTE */}
        <div className="card" style={{ padding: '20px', minHeight: '500px', background: 'rgba(30, 41, 59, 0.2)' }}>
          <h3 style={{ borderBottom: '2px solid #64748b', paddingBottom: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🥣 Por Preparar</span>
            <span style={{ background: '#64748b', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
              {pendingTasks.length}
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingTasks.map(task => (
              <div key={`${task.id_detalle}-${task.tipo}`} className="card" style={{ padding: '14px', background: 'var(--bg-secondary)', borderLeft: task.tipo === 'reposicion' ? '4px solid #3b82f6' : '4px solid #64748b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{task.producto_nombre}</strong>
                  {task.tipo === 'reposicion' ? (
                    <span className="admin-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: '0.7rem' }}>Reposición</span>
                  ) : (
                    getUrgencyBadge(task.fecha_entrega_programada)
                  )}
                </div>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  <span>Cantidad: <strong style={{ color: 'var(--text-primary)' }}>{task.cantidad} unidades</strong></span>
                  <span>Tiempo estimado: <strong>{task.tiempo_elaboracion_min * task.cantidad} min</strong></span>
                  {task.tipo === 'reposicion' ? (
                    <span>Destino: <strong style={{ color: '#3b82f6' }}>Stock General</strong></span>
                  ) : (
                    <>
                      <span>Pedido: <strong>#{task.id_pedido}</strong></span>
                      {task.franja_horaria && <span>Entregar: <strong>{task.franja_horaria}</strong></span>}
                    </>
                  )}
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => handleStatusChange(task.id_detalle, 'preparando', task.tipo)}
                  disabled={updating[task.id_detalle]}
                >
                  <FiPlay size={12} />
                  {updating[task.id_detalle] ? 'Procesando...' : 'Iniciar Preparación'}
                </button>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <FiSmile size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>¡Sin tareas pendientes!</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: PREPARANDO */}
        <div className="card" style={{ padding: '20px', minHeight: '500px', background: 'rgba(245, 158, 11, 0.04)' }}>
          <h3 style={{ borderBottom: '2px solid #f59e0b', paddingBottom: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔥 En El Horno / Preparación</span>
            <span style={{ background: '#f59e0b', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
              {preparingTasks.length}
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {preparingTasks.map(task => (
              <div key={`${task.id_detalle}-${task.tipo}`} className="card" style={{ padding: '14px', background: 'var(--bg-secondary)', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{task.producto_nombre}</strong>
                  {task.tipo === 'reposicion' ? (
                    <span className="admin-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: '0.7rem' }}>Reposición</span>
                  ) : (
                    getUrgencyBadge(task.fecha_entrega_programada)
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  <span>Cantidad: <strong style={{ color: 'var(--text-primary)' }}>{task.cantidad} unidades</strong></span>
                  <span>Tiempo estimado: <strong>{task.tiempo_elaboracion_min * task.cantidad} min</strong></span>
                  {task.tipo === 'reposicion' ? (
                    <span>Destino: <strong style={{ color: '#3b82f6' }}>Stock General</strong></span>
                  ) : (
                    <>
                      <span>Pedido: <strong>#{task.id_pedido}</strong></span>
                      {task.franja_horaria && <span>Entregar: <strong>{task.franja_horaria}</strong></span>}
                    </>
                  )}
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => handleStatusChange(task.id_detalle, 'completado', task.tipo)}
                  disabled={updating[task.id_detalle]}
                >
                  <FiCheckCircle size={12} />
                  {updating[task.id_detalle] ? 'Procesando...' : 'Completar / Listo'}
                </button>
              </div>
            ))}
            {preparingTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <FiAlertCircle size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>Ningún producto en cocción.</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: COMPLETADO */}
        <div className="card" style={{ padding: '20px', minHeight: '500px', background: 'rgba(34, 197, 94, 0.04)' }}>
          <h3 style={{ borderBottom: '2px solid #22c55e', paddingBottom: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ Listos Hoy</span>
            <span style={{ background: '#22c55e', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
              {completedTasks.length}
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {completedTasks.map(task => (
              <div key={`${task.id_detalle}-${task.tipo}`} className="card" style={{ padding: '14px', background: 'var(--bg-secondary)', borderLeft: '4px solid #22c55e', opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.95rem', color: '#94a3b8', textDecoration: 'line-through' }}>{task.producto_nombre}</strong>
                  <span className="admin-badge badge-available" style={{ fontSize: '0.7rem' }}>{task.tipo === 'reposicion' ? 'Repuesto ✓' : 'Terminado'}</span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Cantidad: <strong>{task.cantidad} unidades</strong></span>
                  {task.tipo === 'reposicion' ? (
                    <span>Destino: <strong>Stock General</strong></span>
                  ) : (
                    <>
                      <span>Pedido: <strong>#{task.id_pedido}</strong></span>
                      {task.franja_horaria && <span>Entregar: <strong>{task.franja_horaria}</strong></span>}
                    </>
                  )}
                </div>
              </div>
            ))}
            {completedTasks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.85rem' }}>No hay tareas completadas hoy.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
