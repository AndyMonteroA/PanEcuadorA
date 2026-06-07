const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================
// CONFIGURACIÓN DE MULTER (subida de imágenes)
// ============================================================

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
  }
});

// Aplicar auth + admin a TODAS las rutas
router.use(authMiddleware, adminOnly);

// ============================================================
// DASHBOARD / ESTADÍSTICAS
// ============================================================

router.get('/stats', async (req, res, next) => {
  try {
    // Total de pedidos
    const totalPedidos = await pool.query('SELECT COUNT(*) FROM pedidos');

    // Pedidos de hoy
    const pedidosHoy = await pool.query(
      "SELECT COUNT(*) FROM pedidos WHERE DATE(fecha_pedido) = CURRENT_DATE"
    );

    // Ventas totales
    const ventasTotales = await pool.query(
      "SELECT COALESCE(SUM(total), 0) as total FROM pedidos WHERE estado != 'cancelado'"
    );

    // Ventas de hoy
    const ventasHoy = await pool.query(
      "SELECT COALESCE(SUM(total), 0) as total FROM pedidos WHERE estado != 'cancelado' AND DATE(fecha_pedido) = CURRENT_DATE"
    );

    // Total de usuarios
    const totalUsuarios = await pool.query(
      "SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente'"
    );

    // Usuarios nuevos esta semana
    const nuevosUsuarios = await pool.query(
      "SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente' AND fecha_registro >= CURRENT_DATE - INTERVAL '7 days'"
    );

    // Total de productos
    const totalProductos = await pool.query('SELECT COUNT(*) FROM productos');

    // Productos con stock bajo (< 5)
    const stockBajo = await pool.query(
      'SELECT COUNT(*) FROM productos WHERE stock < 5 AND disponible = TRUE'
    );

    // Pedidos recientes (últimos 10)
    const pedidosRecientes = await pool.query(`
      SELECT p.id_pedido, p.total, p.estado, p.fecha_pedido,
             u.nombre, u.apellido, u.email,
             p.cantidad_total_items
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      ORDER BY p.fecha_pedido DESC
      LIMIT 10
    `);

    // Productos más vendidos
    const topProductos = await pool.query(`
      SELECT pr.id_producto, pr.nombre, pr.precio, pr.stock,
             COALESCE(SUM(dp.cantidad), 0) as total_vendido,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = pr.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen_principal
      FROM productos pr
      LEFT JOIN detalle_pedido dp ON pr.id_producto = dp.id_producto
      GROUP BY pr.id_producto
      ORDER BY total_vendido DESC
      LIMIT 5
    `);

    // Pedidos por estado
    const pedidosPorEstado = await pool.query(`
      SELECT estado, COUNT(*) as cantidad
      FROM pedidos
      GROUP BY estado
      ORDER BY cantidad DESC
    `);

    res.json({
      success: true,
      data: {
        resumen: {
          totalPedidos: parseInt(totalPedidos.rows[0].count),
          pedidosHoy: parseInt(pedidosHoy.rows[0].count),
          ventasTotales: parseFloat(ventasTotales.rows[0].total),
          ventasHoy: parseFloat(ventasHoy.rows[0].total),
          totalUsuarios: parseInt(totalUsuarios.rows[0].count),
          nuevosUsuarios: parseInt(nuevosUsuarios.rows[0].count),
          totalProductos: parseInt(totalProductos.rows[0].count),
          stockBajo: parseInt(stockBajo.rows[0].count)
        },
        pedidosRecientes: pedidosRecientes.rows,
        topProductos: topProductos.rows,
        pedidosPorEstado: pedidosPorEstado.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PRODUCTOS — CRUD
// ============================================================

/**
 * GET /api/admin/products — Listar todos los productos (incluye no disponibles)
 */
router.get('/products', async (req, res, next) => {
  try {
    const { search, categoria, page = 1, limit = 20 } = req.query;
    let query = `
      SELECT p.*,
             c.nombre AS categoria_nombre,
             pr.nombre_negocio AS productor_nombre,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen_principal
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN productores pr ON p.id_productor = pr.id_productor
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(p.nombre ILIKE $${paramIndex} OR p.descripcion ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (categoria) {
      conditions.push(`p.id_categoria = $${paramIndex++}`);
      params.push(categoria);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Count total
    let countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM').split('LEFT JOIN categorias')[0];
    if (conditions.length > 0) {
      countQuery = `SELECT COUNT(*) FROM productos p WHERE ${conditions.join(' AND ')}`;
    } else {
      countQuery = 'SELECT COUNT(*) FROM productos';
    }

    const countResult = await pool.query(countQuery, params.slice(0, conditions.length));
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY p.id_producto DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/products — Crear nuevo producto
 */
router.post('/products', upload.single('imagen'), async (req, res, next) => {
  try {
    const {
      nombre, descripcion, ingredientes, peso_gramos,
      precio, stock, id_categoria, id_productor,
      tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes
    } = req.body;

    if (!nombre || !precio) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y precio son obligatorios.'
      });
    }

    const result = await pool.query(`
      INSERT INTO productos (nombre, descripcion, ingredientes, peso_gramos, precio, stock,
        id_categoria, id_productor, disponible,
        tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, $11, $12)
      RETURNING *
    `, [
      nombre, descripcion || null, ingredientes || null, peso_gramos || null,
      parseFloat(precio), parseInt(stock) || 0,
      id_categoria || null, id_productor || null,
      parseInt(tiempo_elaboracion_min) || 30,
      parseInt(vida_util_dias) || 3,
      parseInt(complejidad) || 3,
      parseInt(num_ingredientes) || 5
    ]);

    const producto = result.rows[0];

    // Si se subió una imagen, guardarla en galería
    if (req.file) {
      await pool.query(
        `INSERT INTO galeria_producto (id_producto, url_archivo, tipo, orden)
         VALUES ($1, $2, 'foto', 0)`,
        [producto.id_producto, `/uploads/products/${req.file.filename}`]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente.',
      data: producto
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/products/:id — Editar producto
 */
router.put('/products/:id', upload.single('imagen'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nombre, descripcion, ingredientes, peso_gramos,
      precio, stock, id_categoria, id_productor, disponible,
      tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes
    } = req.body;

    // Verificar que el producto existe
    const existing = await pool.query('SELECT * FROM productos WHERE id_producto = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    const result = await pool.query(`
      UPDATE productos SET
        nombre = COALESCE($1, nombre),
        descripcion = COALESCE($2, descripcion),
        ingredientes = COALESCE($3, ingredientes),
        peso_gramos = COALESCE($4, peso_gramos),
        precio = COALESCE($5, precio),
        stock = COALESCE($6, stock),
        id_categoria = COALESCE($7, id_categoria),
        id_productor = COALESCE($8, id_productor),
        disponible = COALESCE($9, disponible),
        tiempo_elaboracion_min = COALESCE($10, tiempo_elaboracion_min),
        vida_util_dias = COALESCE($11, vida_util_dias),
        complejidad = COALESCE($12, complejidad),
        num_ingredientes = COALESCE($13, num_ingredientes)
      WHERE id_producto = $14
      RETURNING *
    `, [
      nombre || null, descripcion, ingredientes, peso_gramos ? parseInt(peso_gramos) : null,
      precio ? parseFloat(precio) : null, stock !== undefined ? parseInt(stock) : null,
      id_categoria || null, id_productor || null,
      disponible !== undefined ? (disponible === 'true' || disponible === true) : null,
      tiempo_elaboracion_min ? parseInt(tiempo_elaboracion_min) : null,
      vida_util_dias ? parseInt(vida_util_dias) : null,
      complejidad ? parseInt(complejidad) : null,
      num_ingredientes ? parseInt(num_ingredientes) : null,
      id
    ]);

    // Si se subió nueva imagen, actualizar/crear en galería
    if (req.file) {
      const existingImg = await pool.query(
        "SELECT * FROM galeria_producto WHERE id_producto = $1 AND tipo = 'foto' ORDER BY orden LIMIT 1",
        [id]
      );

      if (existingImg.rows.length > 0) {
        await pool.query(
          'UPDATE galeria_producto SET url_archivo = $1 WHERE id_galeria = $2',
          [`/uploads/products/${req.file.filename}`, existingImg.rows[0].id_galeria]
        );
      } else {
        await pool.query(
          "INSERT INTO galeria_producto (id_producto, url_archivo, tipo, orden) VALUES ($1, $2, 'foto', 0)",
          [id, `/uploads/products/${req.file.filename}`]
        );
      }
    }

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/products/:id — Eliminar producto
 */
router.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM productos WHERE id_producto = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Eliminar galería primero
    await pool.query('DELETE FROM galeria_producto WHERE id_producto = $1', [id]);
    // Eliminar favoritos
    await pool.query('DELETE FROM favoritos WHERE id_producto = $1', [id]);
    // Eliminar del carrito
    await pool.query('DELETE FROM carrito WHERE id_producto = $1', [id]);
    // Eliminar producto
    await pool.query('DELETE FROM productos WHERE id_producto = $1', [id]);

    res.json({ success: true, message: 'Producto eliminado exitosamente.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// CATEGORÍAS — CRUD
// ============================================================

router.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
             COUNT(p.id_producto) as total_productos
      FROM categorias c
      LEFT JOIN productos p ON c.id_categoria = p.id_categoria
      GROUP BY c.id_categoria
      ORDER BY c.id_categoria
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio.' });
    }
    const result = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const result = await pool.query(
      'UPDATE categorias SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion) WHERE id_categoria = $3 RETURNING *',
      [nombre || null, descripcion, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const products = await pool.query(
      'SELECT COUNT(*) FROM productos WHERE id_categoria = $1', [req.params.id]
    );
    if (parseInt(products.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar: tiene productos asociados.'
      });
    }
    await pool.query('DELETE FROM categorias WHERE id_categoria = $1', [req.params.id]);
    res.json({ success: true, message: 'Categoría eliminada.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PEDIDOS — Gestión
// ============================================================

router.get('/orders', async (req, res, next) => {
  try {
    const { estado, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT p.*, u.nombre, u.apellido, u.email,
             d.calle, d.ciudad, d.provincia
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      JOIN direcciones d ON p.id_direccion = d.id_direccion
    `;

    const params = [];
    let paramIndex = 1;

    if (estado) {
      query += ` WHERE p.estado = $${paramIndex++}`;
      params.push(estado);
    }

    // Count
    let countQuery = estado
      ? `SELECT COUNT(*) FROM pedidos WHERE estado = $1`
      : 'SELECT COUNT(*) FROM pedidos';
    const countResult = await pool.query(countQuery, estado ? [estado] : []);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY p.fecha_pedido DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/orders/:id — Detalle de un pedido
 */
router.get('/orders/:id', async (req, res, next) => {
  try {
    const pedido = await pool.query(`
      SELECT p.*, u.nombre, u.apellido, u.email, u.telefono as user_telefono,
             d.calle, d.ciudad, d.provincia, d.referencia
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      JOIN direcciones d ON p.id_direccion = d.id_direccion
      WHERE p.id_pedido = $1
    `, [req.params.id]);

    if (pedido.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
    }

    const detalles = await pool.query(`
      SELECT dp.*, pr.nombre as producto_nombre,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = dp.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen_producto
      FROM detalle_pedido dp
      JOIN productos pr ON dp.id_producto = pr.id_producto
      WHERE dp.id_pedido = $1
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...pedido.rows[0],
        items: detalles.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/orders/:id/status — Cambiar estado del pedido
 */
router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const { estado } = req.body;
    const validStates = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado'];

    if (!validStates.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser: ${validStates.join(', ')}`
      });
    }

    const result = await pool.query(
      'UPDATE pedidos SET estado = $1 WHERE id_pedido = $2 RETURNING *',
      [estado, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
    }

    // Crear notificación para el cliente
    const pedido = result.rows[0];
    const mensajes = {
      confirmado: '¡Tu pedido #' + pedido.id_pedido + ' ha sido confirmado!',
      preparando: 'Tu pedido #' + pedido.id_pedido + ' está siendo preparado 🧑‍🍳',
      en_camino: '¡Tu pedido #' + pedido.id_pedido + ' va en camino! 🚚',
      entregado: '¡Tu pedido #' + pedido.id_pedido + ' ha sido entregado! Disfrútalo 🍞',
      cancelado: 'Tu pedido #' + pedido.id_pedido + ' ha sido cancelado.'
    };

    if (mensajes[estado]) {
      await pool.query(
        "INSERT INTO notificaciones (id_usuario, tipo, mensaje) VALUES ($1, 'pedido', $2)",
        [pedido.id_usuario, mensajes[estado]]
      );
    }

    res.json({
      success: true,
      message: `Estado actualizado a "${estado}".`,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// USUARIOS — Consulta
// ============================================================

router.get('/users', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono, u.rol, u.activo, u.fecha_registro,
             COUNT(DISTINCT p.id_pedido) as total_pedidos,
             COALESCE(SUM(p.total), 0) as total_gastado
      FROM usuarios u
      LEFT JOIN pedidos p ON u.id_usuario = p.id_usuario AND p.estado != 'cancelado'
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE (u.nombre ILIKE $${paramIndex} OR u.apellido ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' GROUP BY u.id_usuario ORDER BY u.fecha_registro DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query('SELECT COUNT(*) FROM usuarios');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PRODUCTORES — Consulta
// ============================================================

router.get('/producers', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT pr.*,
             COUNT(p.id_producto) as total_productos
      FROM productores pr
      LEFT JOIN productos p ON pr.id_productor = p.id_productor
      GROUP BY pr.id_productor
      ORDER BY pr.nombre_negocio
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
