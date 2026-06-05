const pool = require('../config/db');

/**
 * Servicio de estimación de entrega
 * Calcula el tiempo estimado basándose en:
 * 1. Tiempo de elaboración de cada producto × cantidad
 * 2. Turno activo actual (trabajadores disponibles)
 * 3. Cola de pedidos pendientes
 */

/**
 * Calcula el tiempo estimado de entrega para un conjunto de items
 * @param {Array} items - Array de {id_producto, cantidad, tiempo_elaboracion_min}
 * @returns {Object} { tiempoElaboracionMin, tiempoEntregaMin, fechaEstimada, turnoActual }
 */
async function calcularEstimacion(items) {
  // 1. Calcular tiempo total de elaboración
  let tiempoElaboracionMin = 0;
  items.forEach(item => {
    tiempoElaboracionMin += item.tiempo_elaboracion_min * item.cantidad;
  });

  // 2. Obtener turno actual
  const ahora = new Date();
  const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}:00`;

  const turnoResult = await pool.query(`
    SELECT t.*, COUNT(at2.id_trabajador) as trabajadores_disponibles
    FROM turnos t
    LEFT JOIN asignacion_turnos at2 ON t.id_turno = at2.id_turno AND at2.fecha = CURRENT_DATE
    WHERE t.hora_inicio <= $1::TIME OR t.hora_fin <= t.hora_inicio
    GROUP BY t.id_turno
    ORDER BY t.hora_inicio
    LIMIT 1
  `, [horaActual]);

  let trabajadoresDisponibles = 1; // Mínimo 1
  let turnoActual = 'Sin turno asignado';

  if (turnoResult.rows.length > 0) {
    trabajadoresDisponibles = Math.max(1, parseInt(turnoResult.rows[0].trabajadores_disponibles));
    turnoActual = turnoResult.rows[0].nombre;
  }

  // 3. Ajustar por trabajadores (trabajo paralelo)
  const tiempoAjustado = Math.ceil(tiempoElaboracionMin / trabajadoresDisponibles);

  // 4. Sumar cola de pedidos pendientes
  const colaResult = await pool.query(`
    SELECT COALESCE(SUM(tiempo_estimado_min), 0) as tiempo_cola
    FROM pedidos
    WHERE estado IN ('pendiente', 'confirmado', 'preparando')
  `);

  const tiempoCola = Math.ceil(parseInt(colaResult.rows[0].tiempo_cola) / Math.max(1, trabajadoresDisponibles));

  // 5. Tiempo total = elaboración + cola + 30 min logística de entrega
  const TIEMPO_LOGISTICA = 30;
  const tiempoEntregaMin = tiempoAjustado + tiempoCola + TIEMPO_LOGISTICA;

  // 6. Calcular fecha estimada
  const fechaEstimada = new Date(ahora.getTime() + tiempoEntregaMin * 60000);

  return {
    tiempoElaboracionMin: tiempoAjustado,
    tiempoColaMin: tiempoCola,
    tiempoLogisticaMin: TIEMPO_LOGISTICA,
    tiempoEntregaMin,
    fechaEstimada,
    turnoActual,
    trabajadoresDisponibles
  };
}

module.exports = { calcularEstimacion };
