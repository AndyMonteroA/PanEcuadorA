const pool = require('../config/db');

/**
 * Servicio de turnos rotativos 24 horas
 * Gestiona la asignación rotativa de trabajadores en 3 turnos:
 * - Mañana: 06:00 - 14:00
 * - Tarde:  14:00 - 22:00
 * - Noche:  22:00 - 06:00
 */

/**
 * Genera la asignación de turnos para la siguiente semana
 * Rotación: cada trabajador cambia de turno cada semana
 */
async function generarTurnosSemana() {
  try {
    console.log('📅 Generando turnos rotativos para la próxima semana...');

    // Obtener trabajadores activos
    const trabajadores = await pool.query(
      'SELECT * FROM trabajadores WHERE activo = TRUE ORDER BY id_trabajador'
    );

    // Obtener turnos
    const turnos = await pool.query('SELECT * FROM turnos ORDER BY id_turno');

    if (trabajadores.rows.length === 0 || turnos.rows.length === 0) {
      console.log('⚠️  No hay trabajadores o turnos configurados.');
      return;
    }

    const numTurnos = turnos.rows.length;
    const hoy = new Date();

    // Obtener el último turno asignado a cada trabajador para determinar rotación
    const ultimosTurnos = await pool.query(`
      SELECT DISTINCT ON (id_trabajador) id_trabajador, id_turno
      FROM asignacion_turnos
      ORDER BY id_trabajador, fecha DESC
    `);

    const ultimoTurnoMap = {};
    ultimosTurnos.rows.forEach(ut => {
      ultimoTurnoMap[ut.id_trabajador] = ut.id_turno;
    });

    // Generar para los próximos 7 días
    for (let dia = 1; dia <= 7; dia++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + dia);
      const fechaStr = fecha.toISOString().split('T')[0];

      for (let i = 0; i < trabajadores.rows.length; i++) {
        const trabajador = trabajadores.rows[i];

        // Calcular turno rotativo
        const ultimoTurno = ultimoTurnoMap[trabajador.id_trabajador] || turnos.rows[i % numTurnos].id_turno;
        // Rotar al siguiente turno
        const turnoIndex = (turnos.rows.findIndex(t => t.id_turno === ultimoTurno) + 1) % numTurnos;
        const turnoAsignado = turnos.rows[turnoIndex].id_turno;

        // Insertar si no existe
        await pool.query(`
          INSERT INTO asignacion_turnos (id_trabajador, id_turno, fecha)
          VALUES ($1, $2, $3)
          ON CONFLICT (id_trabajador, fecha) DO NOTHING
        `, [trabajador.id_trabajador, turnoAsignado, fechaStr]);

        // Actualizar mapa para siguiente iteración
        ultimoTurnoMap[trabajador.id_trabajador] = turnoAsignado;
      }
    }

    console.log('✅ Turnos generados para los próximos 7 días.');
  } catch (error) {
    console.error('❌ Error al generar turnos:', error);
    throw error;
  }
}

/**
 * Obtener trabajadores del turno actual
 */
async function obtenerTurnoActual() {
  try {
    const result = await pool.query(`
      SELECT t.nombre AS turno, t.hora_inicio, t.hora_fin,
             tr.nombre AS trabajador_nombre, tr.apellido AS trabajador_apellido,
             tr.especialidad
      FROM asignacion_turnos at2
      JOIN turnos t ON at2.id_turno = t.id_turno
      JOIN trabajadores tr ON at2.id_trabajador = tr.id_trabajador
      WHERE at2.fecha = CURRENT_DATE
      AND (
        (t.hora_inicio < t.hora_fin AND CURRENT_TIME BETWEEN t.hora_inicio AND t.hora_fin)
        OR
        (t.hora_inicio > t.hora_fin AND (CURRENT_TIME >= t.hora_inicio OR CURRENT_TIME < t.hora_fin))
      )
    `);

    return {
      turno: result.rows.length > 0 ? result.rows[0].turno : 'Sin turno',
      trabajadores: result.rows,
      totalTrabajadores: result.rows.length
    };
  } catch (error) {
    console.error('❌ Error al obtener turno actual:', error);
    throw error;
  }
}

module.exports = { generarTurnosSemana, obtenerTurnoActual };
