const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { renovarStock } = require('../services/stockRotation');
const { generarTurnosSemana, obtenerTurnoActual } = require('../services/shiftScheduler');

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

    const prod = existing.rows[0];

    const final_nombre = nombre !== undefined ? nombre : prod.nombre;
    const final_precio = precio !== undefined ? parseFloat(precio) : parseFloat(prod.precio);
    const final_stock = stock !== undefined ? parseInt(stock) : parseInt(prod.stock);
    const final_disponible = disponible !== undefined ? (disponible === 'true' || disponible === true) : prod.disponible;
    const final_tiempo = tiempo_elaboracion_min !== undefined ? parseInt(tiempo_elaboracion_min) : prod.tiempo_elaboracion_min;
    const final_vida_util = vida_util_dias !== undefined ? parseInt(vida_util_dias) : prod.vida_util_dias;
    const final_complejidad = complejidad !== undefined ? parseInt(complejidad) : prod.complejidad;
    const final_num_ingredientes = num_ingredientes !== undefined ? parseInt(num_ingredientes) : prod.num_ingredientes;

    // Campos nullables: si vienen vacíos en el body, se setean a NULL en BD. Si son undefined, mantienen el valor previo.
    const final_descripcion = descripcion !== undefined ? (descripcion === '' ? null : descripcion) : prod.descripcion;
    const final_ingredientes = ingredientes !== undefined ? (ingredientes === '' ? null : ingredientes) : prod.ingredientes;
    const final_peso = peso_gramos !== undefined ? (peso_gramos === '' ? null : parseInt(peso_gramos)) : prod.peso_gramos;
    const final_id_categoria = id_categoria !== undefined ? (id_categoria === '' ? null : parseInt(id_categoria)) : prod.id_categoria;
    const final_id_productor = id_productor !== undefined ? (id_productor === '' ? null : parseInt(id_productor)) : prod.id_productor;

    const result = await pool.query(`
      UPDATE productos SET
        nombre = $1,
        descripcion = $2,
        ingredientes = $3,
        peso_gramos = $4,
        precio = $5,
        stock = $6,
        id_categoria = $7,
        id_productor = $8,
        disponible = $9,
        tiempo_elaboracion_min = $10,
        vida_util_dias = $11,
        complejidad = $12,
        num_ingredientes = $13
      WHERE id_producto = $14
      RETURNING *
    `, [
      final_nombre,
      final_descripcion,
      final_ingredientes,
      final_peso,
      final_precio,
      final_stock,
      final_id_categoria,
      final_id_productor,
      final_disponible,
      final_tiempo,
      final_vida_util,
      final_complejidad,
      final_num_ingredientes,
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
// PRODUCTORES — CRUD
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

router.post('/producers', async (req, res, next) => {
  try {
    const { nombre_negocio, descripcion, ciudad, provincia, telefono, email } = req.body;
    if (!nombre_negocio) {
      return res.status(400).json({ success: false, message: 'El nombre del negocio es obligatorio.' });
    }
    const result = await pool.query(
      `INSERT INTO productores (nombre_negocio, descripcion, ciudad, provincia, telefono, email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre_negocio, descripcion || null, ciudad || null, provincia || null, telefono || null, email || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/producers/:id', async (req, res, next) => {
  try {
    const { nombre_negocio, descripcion, ciudad, provincia, telefono, email, activo } = req.body;
    const result = await pool.query(
      `UPDATE productores SET
        nombre_negocio = COALESCE($1, nombre_negocio),
        descripcion = COALESCE($2, descripcion),
        ciudad = COALESCE($3, ciudad),
        provincia = COALESCE($4, provincia),
        telefono = COALESCE($5, telefono),
        email = COALESCE($6, email),
        activo = COALESCE($7, activo)
       WHERE id_productor = $8 RETURNING *`,
      [nombre_negocio || null, descripcion, ciudad, provincia, telefono, email,
       activo !== undefined ? (activo === 'true' || activo === true) : null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Productor no encontrado.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/producers/:id', async (req, res, next) => {
  try {
    const products = await pool.query('SELECT COUNT(*) FROM productos WHERE id_productor = $1', [req.params.id]);
    if (parseInt(products.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: 'No se puede eliminar: tiene productos asociados.' });
    }
    await pool.query('DELETE FROM productores WHERE id_productor = $1', [req.params.id]);
    res.json({ success: true, message: 'Productor eliminado.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// TRABAJADORES — CRUD
// ============================================================

router.get('/workers', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
             pr.nombre_negocio AS productor_nombre,
             (SELECT json_build_object('nombre', tu.nombre, 'hora_inicio', tu.hora_inicio, 'hora_fin', tu.hora_fin)
              FROM asignacion_turnos at2
              JOIN turnos tu ON at2.id_turno = tu.id_turno
              WHERE at2.id_trabajador = t.id_trabajador AND at2.fecha = CURRENT_DATE
              LIMIT 1) AS turno_hoy
      FROM trabajadores t
      LEFT JOIN productores pr ON t.id_productor = pr.id_productor
      ORDER BY t.nombre
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/workers', async (req, res, next) => {
  try {
    const { nombre, apellido, cedula, especialidad, telefono, id_productor } = req.body;
    if (!nombre || !apellido || !cedula || !especialidad) {
      return res.status(400).json({ success: false, message: 'Nombre, apellido, cédula y especialidad son obligatorios.' });
    }
    const result = await pool.query(
      `INSERT INTO trabajadores (nombre, apellido, cedula, especialidad, telefono, id_productor)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, apellido, cedula, especialidad, telefono || null, id_productor || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Ya existe un trabajador con esa cédula.' });
    }
    next(error);
  }
});

router.put('/workers/:id', async (req, res, next) => {
  try {
    const { nombre, apellido, cedula, especialidad, telefono, activo, id_productor } = req.body;
    const result = await pool.query(
      `UPDATE trabajadores SET
        nombre = COALESCE($1, nombre),
        apellido = COALESCE($2, apellido),
        cedula = COALESCE($3, cedula),
        especialidad = COALESCE($4, especialidad),
        telefono = COALESCE($5, telefono),
        activo = COALESCE($6, activo),
        id_productor = COALESCE($7, id_productor)
       WHERE id_trabajador = $8 RETURNING *`,
      [nombre || null, apellido || null, cedula || null, especialidad || null, telefono,
       activo !== undefined ? (activo === 'true' || activo === true) : null,
       id_productor || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trabajador no encontrado.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/workers/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM asignacion_turnos WHERE id_trabajador = $1', [req.params.id]);
    await pool.query('DELETE FROM trabajadores WHERE id_trabajador = $1', [req.params.id]);
    res.json({ success: true, message: 'Trabajador eliminado.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// TURNOS — Gestión
// ============================================================

router.get('/shifts', async (req, res, next) => {
  try {
    const turnos = await pool.query('SELECT * FROM turnos ORDER BY hora_inicio');
    res.json({ success: true, data: turnos.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/shift-assignments', async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const start = fecha_inicio || new Date().toISOString().split('T')[0];
    const end = fecha_fin || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT at2.*, t.nombre, t.apellido, t.especialidad,
             tu.nombre as turno_nombre, tu.hora_inicio, tu.hora_fin
      FROM asignacion_turnos at2
      JOIN trabajadores t ON at2.id_trabajador = t.id_trabajador
      JOIN turnos tu ON at2.id_turno = tu.id_turno
      WHERE at2.fecha BETWEEN $1 AND $2
      ORDER BY at2.fecha, tu.hora_inicio
    `, [start, end]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/shift-assignments', async (req, res, next) => {
  try {
    const { id_trabajador, id_turno, fecha } = req.body;
    const result = await pool.query(
      'INSERT INTO asignacion_turnos (id_trabajador, id_turno, fecha) VALUES ($1, $2, $3) RETURNING *',
      [id_trabajador, id_turno, fecha]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Este trabajador ya tiene turno asignado en esa fecha.' });
    }
    next(error);
  }
});

router.delete('/shift-assignments/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM asignacion_turnos WHERE id_asignacion = $1', [req.params.id]);
    res.json({ success: true, message: 'Asignación eliminada.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// CUPONES — CRUD
// ============================================================

router.get('/coupons', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM cupones ORDER BY id_cupon DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/coupons', async (req, res, next) => {
  try {
    const { codigo, tipo_descuento, valor, fecha_vencimiento, usos_maximos } = req.body;
    if (!codigo || !tipo_descuento || !valor) {
      return res.status(400).json({ success: false, message: 'Código, tipo y valor son obligatorios.' });
    }
    const result = await pool.query(
      `INSERT INTO cupones (codigo, tipo_descuento, valor, fecha_vencimiento, usos_maximos)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo.toUpperCase(), tipo_descuento, parseFloat(valor), fecha_vencimiento || null, usos_maximos || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Ya existe un cupón con ese código.' });
    }
    next(error);
  }
});

router.put('/coupons/:id', async (req, res, next) => {
  try {
    const { codigo, tipo_descuento, valor, fecha_vencimiento, usos_maximos, activo } = req.body;
    const result = await pool.query(
      `UPDATE cupones SET
        codigo = COALESCE($1, codigo),
        tipo_descuento = COALESCE($2, tipo_descuento),
        valor = COALESCE($3, valor),
        fecha_vencimiento = COALESCE($4, fecha_vencimiento),
        usos_maximos = COALESCE($5, usos_maximos),
        activo = COALESCE($6, activo)
       WHERE id_cupon = $7 RETURNING *`,
      [codigo || null, tipo_descuento || null, valor ? parseFloat(valor) : null,
       fecha_vencimiento, usos_maximos ? parseInt(usos_maximos) : null,
       activo !== undefined ? (activo === 'true' || activo === true) : null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cupón no encontrado.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/coupons/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cupones WHERE id_cupon = $1', [req.params.id]);
    res.json({ success: true, message: 'Cupón eliminado.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// STOCK — Renovar frescura
// ============================================================

router.post('/products/:id/renew-stock', async (req, res, next) => {
  try {
    const { stock } = req.body;
    if (!stock || stock <= 0) {
      return res.status(400).json({ success: false, message: 'Cantidad de stock debe ser mayor a 0.' });
    }
    const producto = await renovarStock(req.params.id, parseInt(stock));
    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }
    res.json({
      success: true,
      message: `Stock renovado: ${producto.nombre} → ${stock} unidades. Vence: ${new Date(producto.fecha_vencimiento_stock).toLocaleDateString('es-EC')}`,
      data: producto
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DEVOLUCIONES — CRUD
// ============================================================

router.get('/returns', async (req, res, next) => {
  try {
    const { estado } = req.query;
    let query = `
      SELECT d.*, p.id_pedido, p.total, p.estado AS estado_pedido,
             u.nombre, u.apellido, u.email,
             p.fecha_pedido
      FROM devoluciones d
      JOIN pedidos p ON d.id_pedido = p.id_pedido
      JOIN usuarios u ON d.id_usuario = u.id_usuario
    `;
    const params = [];
    if (estado) {
      query += ' WHERE d.estado = $1';
      params.push(estado);
    }
    query += ' ORDER BY d.fecha_solicitud DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.put('/returns/:id/status', async (req, res, next) => {
  try {
    const { estado } = req.body;
    const valid = ['solicitada', 'en_proceso', 'resuelta', 'rechazada'];
    if (!valid.includes(estado)) {
      return res.status(400).json({ success: false, message: `Estado inválido. Debe ser: ${valid.join(', ')}` });
    }
    const result = await pool.query(
      `UPDATE devoluciones SET estado = $1, fecha_resolucion = ${estado === 'resuelta' || estado === 'rechazada' ? 'CURRENT_TIMESTAMP' : 'fecha_resolucion'}
       WHERE id_devolucion = $2 RETURNING *`,
      [estado, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Devolución no encontrada.' });
    }
    // Notificar al usuario
    const dev = result.rows[0];
    const mensajes = {
      en_proceso: `Tu solicitud de devolución #${dev.id_devolucion} está siendo revisada.`,
      resuelta: `¡Tu devolución #${dev.id_devolucion} ha sido aprobada! Se procesará el reembolso.`,
      rechazada: `Tu solicitud de devolución #${dev.id_devolucion} ha sido rechazada.`
    };
    if (mensajes[estado]) {
      await pool.query(
        "INSERT INTO notificaciones (id_usuario, tipo, mensaje) VALUES ($1, 'pedido', $2)",
        [dev.id_usuario, mensajes[estado]]
      );
    }
    res.json({ success: true, message: `Devolución actualizada a "${estado}".`, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// DASHBOARD — Endpoints adicionales
// ============================================================

// Turno actual en operación
router.get('/current-shift', async (req, res, next) => {
  try {
    const turno = await obtenerTurnoActual();
    res.json({ success: true, data: turno });
  } catch (error) {
    next(error);
  }
});

// Productos próximos a vencer (< 1 día)
router.get('/expiring-products', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id_producto, nombre, stock, vida_util_dias,
             fecha_elaboracion_stock, fecha_vencimiento_stock,
             EXTRACT(EPOCH FROM (fecha_vencimiento_stock - CURRENT_TIMESTAMP)) / 3600 AS horas_restantes
      FROM productos
      WHERE fecha_vencimiento_stock IS NOT NULL
        AND fecha_vencimiento_stock > CURRENT_TIMESTAMP
        AND EXTRACT(EPOCH FROM (fecha_vencimiento_stock - CURRENT_TIMESTAMP)) / 3600 < 24
        AND disponible = TRUE
        AND stock > 0
      ORDER BY fecha_vencimiento_stock ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Generar turnos de la semana
router.post('/generate-shifts', async (req, res, next) => {
  try {
    await generarTurnosSemana();
    res.json({ success: true, message: 'Turnos generados para los próximos 7 días.' });
  } catch (error) {
    next(error);
  }
});

// Conteo de devoluciones pendientes
router.get('/returns-count', async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM devoluciones WHERE estado IN ('solicitada', 'en_proceso')"
    );
    res.json({ success: true, data: parseInt(result.rows[0].count) });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// CONFIGURACIÓN DEL SITIO
// ============================================================

// GET /api/admin/site-config — obtener toda la configuración
router.get('/site-config', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT clave, valor, descripcion, tipo FROM configuracion_sitio ORDER BY clave');
    // Convertir array a objeto clave:valor para fácil consumo
    const config = {};
    result.rows.forEach(row => { config[row.clave] = { valor: row.valor, descripcion: row.descripcion, tipo: row.tipo }; });
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/site-config — actualizar configuración
router.put('/site-config', async (req, res, next) => {
  try {
    const updates = req.body; // { clave: valor, ... }
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ success: false, message: 'Sin datos para actualizar.' });

    for (const clave of keys) {
      await pool.query(
        `INSERT INTO configuracion_sitio (clave, valor) VALUES ($1, $2)
         ON CONFLICT (clave) DO UPDATE SET valor = $2`,
        [clave, updates[clave]]
      );
    }
    res.json({ success: true, message: 'Configuración actualizada correctamente.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

