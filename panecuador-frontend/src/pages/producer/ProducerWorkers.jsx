import { useState, useEffect } from 'react';
import { producerAPI } from '../../services/api';
import { FiClock } from 'react-icons/fi';

export default function ProducerWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    producerAPI.getWorkers()
      .then(res => setWorkers(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const especialidadBadge = (esp) => {
    const colors = { panadero: 'badge-confirmado', pastelero: 'badge-preparando', ambos: 'badge-entregado' };
    return <span className={`admin-badge ${colors[esp] || ''}`}>{esp}</span>;
  };

  return (
    <div>
      <div className="admin-section-header">
        <h2>Mis Trabajadores</h2>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-header"><h3>{workers.length} trabajadores asignados</h3></div>
        {loading ? <div className="admin-loading">Cargando...</div> : (
          <table className="admin-table">
            <thead>
              <tr><th>Nombre</th><th>Cédula</th><th>Especialidad</th><th>Teléfono</th><th>Turno Hoy</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id_trabajador}>
                  <td style={{fontWeight:600,color:'#fff'}}>{w.nombre} {w.apellido}</td>
                  <td>{w.cedula}</td>
                  <td>{especialidadBadge(w.especialidad)}</td>
                  <td>{w.telefono || '—'}</td>
                  <td>
                    {w.turno_hoy ? (
                      <span style={{fontSize:'0.78rem'}}><FiClock size={12} /> {w.turno_hoy.nombre} ({w.turno_hoy.hora_inicio?.slice(0,5)} - {w.turno_hoy.hora_fin?.slice(0,5)})</span>
                    ) : <span style={{color:'#52525b',fontSize:'0.78rem'}}>Sin turno</span>}
                  </td>
                  <td><span className={`admin-badge ${w.activo ? 'badge-available' : 'badge-unavailable'}`}>{w.activo ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">
                  <div className="admin-empty-icon">👷</div>
                  <p>No tienes trabajadores asignados</p>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
