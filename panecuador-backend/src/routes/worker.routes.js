const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, workerOnly } = require('../middleware/auth');

// Proteger todas las rutas del portal de trabajadores
router.use(authMiddleware, workerOnly);

// Helper: obtener datos del trabajador autenticado
async function getWorkerData(userId) {
  const result = await pool.query('SELECT * FROM trabajadores WHERE id_usuario = $1', [userId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================
// DASHBOARD DEL TRABAJADOR
// ============================================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const worker = await getWorkerData(req.user.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'No tienes un registro de trabajador vinculado.' });
    }

    // Datos del negocio (productor) al que pertenece
    const productor = await pool.query('SELECT * FROM productores WHERE id_productor = $1', [worker.id_productor]);

    // Turno de hoy
    const turnoHoy = await pool.query(`
      SELECT at2.fecha, tu.nombre, tu.hora_inicio, tu.hora_fin
      FROM asignacion_turnos at2
      JOIN turnos tu ON at2.id_turno = tu.id_turno
      WHERE at2.id_trabajador = $1 AND at2.fecha = CURRENT_DATE
    `, [worker.id_trabajador]);

    // Turnos de la semana
    const turnosSemana = await pool.query(`
      SELECT at2.fecha, tu.nombre, tu.hora_inicio, tu.hora_fin
      FROM asignacion_turnos at2
      JOIN turnos tu ON at2.id_turno = tu.id_turno
      WHERE at2.id_trabajador = $1 AND at2.fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'
      ORDER BY at2.fecha
    `, [worker.id_trabajador]);

    res.json({
      success: true,
      data: {
        trabajador: worker,
        negocio: productor.rows[0] || null,
        turnoHoy: turnoHoy.rows[0] || null,
        turnosSemana: turnosSemana.rows
      }
    });
  } catch (error) { next(error); }
});

// ============================================================
// COLA DE ELABORACIÓN (BAKING QUEUE)
// ============================================================
router.get('/tasks', async (req, res, next) => {
  try {
    const worker = await getWorkerData(req.user.id);
    if (!worker || !worker.id_productor) {
      return res.status(404).json({ success: false, message: 'No tienes un negocio vinculado.' });
    }

    // 1. Obtener los ítems de pedidos activos (cliente)
    const ordersResult = await pool.query(`
      SELECT dp.id_detalle, dp.id_pedido, dp.cantidad, dp.estado,
             p.nombre AS producto_nombre, p.tiempo_elaboracion_min,
             pe.fecha_pedido, pe.fecha_entrega_programada, pe.franja_horaria, pe.estado AS pedido_estado,
             'pedido' AS tipo
      FROM detalle_pedido dp
      JOIN productos p ON dp.id_producto = p.id_producto
      JOIN pedidos pe ON dp.id_pedido = pe.id_pedido
      WHERE p.id_productor = $1 AND pe.estado IN ('pendiente', 'confirmado', 'preparando')
      ORDER BY pe.fecha_entrega_programada ASC, pe.fecha_pedido ASC
    `, [worker.id_productor]);

    // 2. Obtener las tareas de reposición internas activas
    const replenishmentsResult = await pool.query(`
      SELECT tp.id_tarea AS id_detalle, NULL AS id_pedido, tp.cantidad, tp.estado,
             p.nombre AS producto_nombre, p.tiempo_elaboracion_min,
             tp.fecha_creacion AS fecha_pedido, NULL AS fecha_entrega_programada, NULL AS franja_horaria, NULL AS pedido_estado,
             'reposicion' AS tipo
      FROM tareas_produccion tp
      JOIN productos p ON tp.id_producto = p.id_producto
      WHERE tp.id_productor = $1 AND tp.estado IN ('pendiente', 'preparando')
      ORDER BY tp.fecha_creacion ASC
    `, [worker.id_productor]);

    const combinedTasks = [...ordersResult.rows, ...replenishmentsResult.rows];

    res.json({ success: true, data: combinedTasks });
  } catch (error) { next(error); }
});

// Cambiar estado de preparación de un ítem (pedido o reposición)
router.patch('/tasks/:id_detalle/status', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const worker = await getWorkerData(req.user.id);
    if (!worker || !worker.id_productor) {
      return res.status(404).json({ success: false, message: 'No tienes un negocio vinculado.' });
    }

    const { estado, tipo } = req.body;
    if (!estado || !['pendiente', 'preparando', 'completado'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido.' });
    }

    const detailId = req.params.id_detalle;

    if (tipo === 'reposicion') {
      await client.query('BEGIN');
      
      const check = await client.query(`
        SELECT tp.*, p.nombre
        FROM tareas_produccion tp
        JOIN productos p ON tp.id_producto = p.id_producto
        WHERE tp.id_tarea = $1 AND tp.id_productor = $2
      `, [detailId, worker.id_productor]);

      if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ success: false, message: 'No tienes permiso para actualizar esta tarea.' });
      }

      const task = check.rows[0];

      // Actualizar estado de la tarea
      await client.query(`
        UPDATE tareas_produccion 
        SET estado = $1, 
            fecha_completado = CASE WHEN $1 = 'completado' THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE id_tarea = $2
      `, [estado, detailId]);

      // Si pasa a completado y no lo estaba, incrementar el stock!
      if (estado === 'completado' && task.estado !== 'completado') {
        await client.query(`
          UPDATE productos 
          SET stock = stock + $1, 
              fecha_elaboracion_stock = CURRENT_TIMESTAMP, 
              fecha_vencimiento_stock = CURRENT_TIMESTAMP + (vida_util_dias || ' days')::INTERVAL 
          WHERE id_producto = $2
        `, [task.cantidad, task.id_producto]);
      }

      await client.query('COMMIT');
      return res.json({ success: true, message: 'Tarea de reposición actualizada.', data: { id_detalle: detailId, estado } });
    }

    // Por defecto: tipo === 'pedido'
    const check = await client.query(`
      SELECT dp.*, p.id_productor, dp.id_pedido, pe.id_usuario, p.nombre AS producto_nombre
      FROM detalle_pedido dp
      JOIN productos p ON dp.id_producto = p.id_producto
      JOIN pedidos pe ON dp.id_pedido = pe.id_pedido
      WHERE dp.id_detalle = $1
    `, [detailId]);

    if (check.rows.length === 0 || check.rows[0].id_productor !== worker.id_productor) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para actualizar esta tarea.' });
    }

    const orderId = check.rows[0].id_pedido;

    await client.query('BEGIN');

    // Actualizar estado del detalle
    await client.query(`
      UPDATE detalle_pedido SET estado = $1 WHERE id_detalle = $2
    `, [estado, detailId]);

    // Crear notificación para el cliente
    const taskInfo = check.rows[0];
    if (taskInfo && taskInfo.id_usuario) {
      let userMsg = '';
      if (estado === 'preparando') {
        userMsg = `Tu producto "${taskInfo.producto_nombre}" del Pedido #${orderId} ya está en preparación/horno. 🔥`;
      } else if (estado === 'completado') {
        userMsg = `¡Tu producto "${taskInfo.producto_nombre}" del Pedido #${orderId} ha sido horneado y está listo! 🥖`;
      }

      if (userMsg) {
        await client.query(`
          INSERT INTO notificaciones (id_usuario, tipo, mensaje)
          VALUES ($1, 'pedido', $2)
        `, [taskInfo.id_usuario, userMsg]);
      }
    }

    // Si el estado pasa a "preparando", actualizamos el pedido general a "preparando"
    if (estado === 'preparando') {
      await client.query(`
        UPDATE pedidos SET estado = 'preparando' WHERE id_pedido = $1 AND estado = 'confirmado'
      `, [orderId]);
    }

    // Verificar si todos los ítems de este productor en este pedido ya están "completados"
    const checkAllItems = await client.query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completados
      FROM detalle_pedido dp
      JOIN productos p ON dp.id_producto = p.id_producto
      WHERE dp.id_pedido = $1 AND p.id_productor = $2
    `, [orderId, worker.id_productor]);

    const stats = checkAllItems.rows[0];
    const todosListos = parseInt(stats.total) === parseInt(stats.completados);

    // Crear notificación si todas las tareas del productor están listas
    if (todosListos && estado === 'completado') {
      const prodNameResult = await client.query('SELECT nombre_negocio FROM productores WHERE id_productor = $1', [worker.id_productor]);
      const prodName = prodNameResult.rows[0]?.nombre_negocio || 'El productor';
      
      await client.query(`
        INSERT INTO notificaciones (id_usuario, tipo, mensaje)
        SELECT id_usuario, 'pedido', $2
        FROM usuarios
        WHERE rol = 'admin' OR id_usuario = (SELECT id_usuario FROM productores WHERE id_productor = $1)
      `, [worker.id_productor, `¡Los productos del local "${prodName}" en el Pedido #${orderId} están horneados y listos para empaque!`]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Estado de la tarea actualizado.', data: { id_detalle: detailId, estado } });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
