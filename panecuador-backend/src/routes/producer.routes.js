const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, producerOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { renovarStock } = require('../services/stockRotation');

// Proteger todas las rutas
router.use(authMiddleware, producerOnly);

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/productos')),
  filename: (req, file, cb) => cb(null, `prod_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
}});

// Helper: obtener id_productor del usuario autenticado
async function getProducerId(userId) {
  const result = await pool.query('SELECT id_productor FROM productores WHERE id_usuario = $1', [userId]);
  return result.rows.length > 0 ? result.rows[0].id_productor : null;
}

// ============================================================
// DASHBOARD del Productor
// ============================================================

router.get('/dashboard', async (req, res, next) => {
  try {
    const producerId = await getProducerId(req.user.id);
    if (!producerId) return res.status(404).json({ success: false, message: 'No tienes un negocio vinculado.' });

    // Datos del negocio
    const negocio = await pool.query('SELECT * FROM productores WHERE id_productor = $1', [producerId]);

    // Productos del productor
    const productos = await pool.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN disponible THEN 1 ELSE 0 END) as disponibles FROM productos WHERE id_productor = $1',
      [producerId]
    );

    // Pedidos que contienen productos de este productor
    const pedidos = await pool.query(`
      SELECT COUNT(DISTINCT p.id_pedido) as total_pedidos,
             COUNT(DISTINCT CASE WHEN p.estado IN ('pendiente','confirmado','preparando') THEN p.id_pedido END) as pedidos_activos,
             COALESCE(SUM(dp.subtotal), 0) as ingresos_totales
      FROM detalle_pedido dp
      JOIN productos pr ON dp.id_producto = pr.id_producto
      JOIN pedidos p ON dp.id_pedido = p.id_pedido
      WHERE pr.id_productor = $1
    `, [producerId]);

    // Trabajadores del productor
    const trabajadores = await pool.query(
      'SELECT COUNT(*) as total FROM trabajadores WHERE id_productor = $1 AND activo = TRUE',
      [producerId]
    );

    // Productos próximos a vencer
    const porVencer = await pool.query(`
      SELECT nombre, stock, EXTRACT(EPOCH FROM (fecha_vencimiento_stock - CURRENT_TIMESTAMP)) / 3600 AS horas_restantes
      FROM productos
      WHERE id_productor = $1 AND fecha_vencimiento_stock IS NOT NULL
        AND fecha_vencimiento_stock > CURRENT_TIMESTAMP
        AND EXTRACT(EPOCH FROM (fecha_vencimiento_stock - CURRENT_TIMESTAMP)) / 3600 < 24
        AND disponible = TRUE AND stock > 0
      ORDER BY fecha_vencimiento_stock ASC
    `, [producerId]);

    res.json({ success: true, data: {
      negocio: negocio.rows[0],
      totalProductos: parseInt(productos.rows[0].total),
      productosDisponibles: parseInt(productos.rows[0].disponibles),
      totalPedidos: parseInt(pedidos.rows[0].total_pedidos),
      pedidosActivos: parseInt(pedidos.rows[0].pedidos_activos),
      ingresos: parseFloat(pedidos.rows[0].ingresos_totales),
      totalTrabajadores: parseInt(trabajadores.rows[0].total),
      productosPorVencer: porVencer.rows
    }});
  } catch (error) { next(error); }
});

// ============================================================
// MIS PRODUCTOS
// ============================================================

router.get('/products', async (req, res, next) => {
  try {
    const producerId = await getProducerId(req.user.id);
    if (!producerId) return res.status(404).json({ success: false, message: 'No tienes un negocio vinculado.' });

    const result = await pool.query(`
      SELECT p.*,
             c.nombre AS categoria_nombre,
             (SELECT url_archivo FROM galeria_producto WHERE id_producto = p.id_producto ORDER BY orden LIMIT 1) AS imagen_principal
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.id_productor = $1
      ORDER BY p.nombre
    `, [producerId]);

    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});

router.post('/products', upload.single('imagen'), async (req, res, next) => {
  try {
    const producerId = await getProducerId(req.user.id);
    if (!producerId) return res.status(404).json({ success: false, message: 'No tienes un negocio vinculado.' });

    const { nombre, descripcion, ingredientes, peso_gramos, precio, stock, id_categoria,
            tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes } = req.body;

    const result = await pool.query(
      `INSERT INTO productos (id_categoria, id_productor, nombre, descripcion, ingredientes, peso_gramos, precio, stock, disponible, tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes, fecha_elaboracion_stock, fecha_vencimiento_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($10 || ' days')::INTERVAL)
       RETURNING *`,
      [id_categoria || null, producerId, nombre, descripcion || null, ingredientes || null,
       peso_gramos || null, parseFloat(precio), parseInt(stock) || 0,
       parseInt(tiempo_elaboracion_min) || 30, parseInt(vida_util_dias) || 3,
       parseInt(complejidad) || 3, parseInt(num_ingredientes) || 5]
    );

    // Subir imagen si hay
    if (req.file) {
      await pool.query(
        'INSERT INTO galeria_producto (id_producto, url_archivo, tipo, orden) VALUES ($1, $2, $3, 0)',
        [result.rows[0].id_producto, `/uploads/productos/${req.file.filename}`, 'foto']
      );
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});

router.put('/products/:id', upload.single('imagen'), async (req, res, next) => {
  try {
    const producerId = await getProducerId(req.user.id);
    const { nombre, descripcion, ingredientes, peso_gramos, precio, stock, id_categoria, disponible,
            tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes } = req.body;

    // Verificar que el producto pertenece al productor
    const check = await pool.query('SELECT id_producto FROM productos WHERE id_producto = $1 AND id_productor = $2', [req.params.id, producerId]);
    if (check.rows.length === 0) return res.status(403).json({ success: false, message: 'No tienes permiso para editar este producto.' });

    const result = await pool.query(
      `UPDATE productos SET
        nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion),
        ingredientes = COALESCE($3, ingredientes), peso_gramos = COALESCE($4, peso_gramos),
        precio = COALESCE($5, precio), stock = COALESCE($6, stock),
        id_categoria = COALESCE($7, id_categoria), disponible = COALESCE($8, disponible),
        tiempo_elaboracion_min = COALESCE($9, tiempo_elaboracion_min),
        vida_util_dias = COALESCE($10, vida_util_dias),
        complejidad = COALESCE($11, complejidad), num_ingredientes = COALESCE($12, num_ingredientes)
       WHERE id_producto = $13 RETURNING *`,
      [nombre, descripcion, ingredientes, peso_gramos ? parseInt(peso_gramos) : null,
       precio ? parseFloat(precio) : null, stock !== undefined ? parseInt(stock) : null,
       id_categoria || null, disponible !== undefined ? (disponible === 'true' || disponible === true) : null,
       tiempo_elaboracion_min ? parseInt(tiempo_elaboracion_min) : null,
       vida_util_dias ? parseInt(vida_util_dias) : null,
       complejidad ? parseInt(complejidad) : null, num_ingredientes ? parseInt(num_ingredientes) : null,
       req.params.id]
    );

    if (req.file) {
      await pool.query('DELETE FROM galeria_producto WHERE id_producto = $1', [req.params.id]);
      await pool.query(
        'INSERT INTO galeria_producto (id_producto, url_archivo, tipo, orden) VALUES ($1, $2, $3, 0)',
        [req.params.id, `/uploads/productos/${req.file.filename}`, 'foto']
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});

// Renovar stock (frescura)
router.post('/products/:id/renew-stock', async (req, res, next) => {
  try {
    const producerId = await getProducerId(req.user.id);
    const check = await pool.query('SELECT id_producto FROM productos WHERE id_producto = $1 AND id_productor = $2', [req.params.id, producerId]);
    if (check.rows.length === 0) return res.status(403).json({ success: false, message: 'No tienes permiso.' });

    const { stock } = req.body;
    const producto = await renovarStock(req.params.id, parseInt(stock));
    res.json({ success: true, message: `Stock renovado: ${producto.nombre} → ${stock} unidades`, data: producto });
  } catch (error) { next(error); }
});

// ============================================================
// MIS PEDIDOS (pedidos que contienen mis productos)
// ============================================================

router.get('/orders', async (req, res, next) => {
  try {
    const producerId = await getProducerId(req.user.id);
    if (!producerId) return res.status(404).json({ success: false, message: 'No tienes un negocio vinculado.' });

    const result = await pool.query(`
      SELECT DISTINCT p.*,
             u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.email AS cliente_email,
             (SELECT json_agg(json_build_object(
                'producto', pr.nombre, 'cantidad', dp2.cantidad,
                'precio', dp2.precio_unitario, 'subtotal', dp2.subtotal
              ))
              FROM detalle_pedido dp2
              JOIN productos pr ON dp2.id_producto = pr.id_producto
              WHERE dp2.id_pedido = p.id_pedido AND pr.id_productor = $1
             ) AS mis_items
      FROM pedidos p
      JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
      JOIN productos prod ON dp.id_producto = prod.id_producto
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE prod.id_productor = $1
      ORDER BY p.fecha_pedido DESC
    `, [producerId]);

    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});

// ============================================================
// MIS TRABAJADORES
// ============================================================

router.get('/workers', async (req, res, next) => {
  try {
    const producerId = await getProducerId(req.user.id);
    if (!producerId) return res.status(404).json({ success: false, message: 'No tienes un negocio vinculado.' });

    const result = await pool.query(`
      SELECT t.*,
             (SELECT json_build_object('nombre', tu.nombre, 'hora_inicio', tu.hora_inicio, 'hora_fin', tu.hora_fin)
              FROM asignacion_turnos at2
              JOIN turnos tu ON at2.id_turno = tu.id_turno
              WHERE at2.id_trabajador = t.id_trabajador AND at2.fecha = CURRENT_DATE
              LIMIT 1) AS turno_hoy
      FROM trabajadores t
      WHERE t.id_productor = $1
      ORDER BY t.nombre
    `, [producerId]);

    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
});

module.exports = router;
