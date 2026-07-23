const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/cart
 * Obtener carrito del usuario
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.id_carrito, c.cantidad, c.fecha_agregado,
             p.id_producto, p.nombre, p.precio, p.stock, p.disponible,
             p.tiempo_elaboracion_min, p.peso_gramos,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen,
             pr.nombre_negocio AS productor_nombre
      FROM carrito c
      JOIN productos p ON c.id_producto = p.id_producto
      LEFT JOIN productores pr ON p.id_productor = pr.id_productor
      WHERE c.id_usuario = $1
      ORDER BY c.fecha_agregado DESC
    `, [req.user.id]);

    // Calcular totales
    let subtotal = 0;
    let totalItems = 0;
    let tiempoElaboracionTotal = 0;

    const items = result.rows.map(item => {
      const itemSubtotal = parseFloat(item.precio) * item.cantidad;
      subtotal += itemSubtotal;
      totalItems += item.cantidad;
      tiempoElaboracionTotal += item.tiempo_elaboracion_min * item.cantidad;

      return {
        ...item,
        subtotal: itemSubtotal.toFixed(2)
      };
    });

    res.json({
      success: true,
      data: {
        items,
        resumen: {
          subtotal: subtotal.toFixed(2),
          totalItems,
          tiempoElaboracionEstimado: tiempoElaboracionTotal,
          // Validación: máximo 100 productos por orden
          superaLimite: totalItems > 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/cart
 * Agregar producto al carrito
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { id_producto, cantidad = 1 } = req.body;

    // Verificar que el producto existe y está disponible
    const producto = await pool.query(
      'SELECT * FROM productos WHERE id_producto = $1 AND disponible = TRUE',
      [id_producto]
    );

    if (producto.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado o no disponible.'
      });
    }

    // Verificar stock
    if (producto.rows[0].stock < cantidad) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponible: ${producto.rows[0].stock}`
      });
    }

    // Verificar total del carrito no supere 100
    const carritoActual = await pool.query(
      'SELECT COALESCE(SUM(cantidad), 0) as total FROM carrito WHERE id_usuario = $1',
      [req.user.id]
    );

    if (parseInt(carritoActual.rows[0].total) + cantidad > 100) {
      return res.status(400).json({
        success: false,
        message: 'El carrito no puede superar 100 productos en total.'
      });
    }

    // Insertar o actualizar cantidad (UPSERT)
    const result = await pool.query(`
      INSERT INTO carrito (id_usuario, id_producto, cantidad)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_usuario, id_producto)
      DO UPDATE SET cantidad = carrito.cantidad + $3, fecha_agregado = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.id, id_producto, cantidad]);

    res.status(201).json({
      success: true,
      message: 'Producto agregado al carrito.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/cart/:id
 * Actualizar cantidad de un item
 */
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { cantidad } = req.body;

    if (!cantidad || cantidad < 1 || !Number.isInteger(cantidad)) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un número entero mayor a 0.'
      });
    }

    // Verificar stock del producto
    const itemResult = await pool.query(
      `SELECT c.id_producto, p.stock, p.nombre FROM carrito c
       JOIN productos p ON c.id_producto = p.id_producto
       WHERE c.id_carrito = $1 AND c.id_usuario = $2`,
      [req.params.id, req.user.id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item no encontrado.' });
    }

    const producto = itemResult.rows[0];
    if (cantidad > producto.stock) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente de "${producto.nombre}". Disponible: ${producto.stock}`
      });
    }

    // Verificar total del carrito
    const carritoActual = await pool.query(
      `SELECT COALESCE(SUM(cantidad), 0) - 
              COALESCE((SELECT cantidad FROM carrito WHERE id_carrito = $1), 0) as total_sin_item
       FROM carrito WHERE id_usuario = $2`,
      [req.params.id, req.user.id]
    );

    if (parseInt(carritoActual.rows[0].total_sin_item) + cantidad > 100) {
      return res.status(400).json({
        success: false,
        message: 'El carrito no puede superar 100 productos en total.'
      });
    }

    const result = await pool.query(
      `UPDATE carrito SET cantidad = $1
       WHERE id_carrito = $2 AND id_usuario = $3
       RETURNING *`,
      [cantidad, req.params.id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Cantidad actualizada.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart/:id
 * Eliminar item del carrito
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM carrito WHERE id_carrito = $1 AND id_usuario = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item no encontrado.' });
    }

    res.json({ success: true, message: 'Producto eliminado del carrito.' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/cart
 * Vaciar carrito
 */
router.delete('/', authMiddleware, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM carrito WHERE id_usuario = $1', [req.user.id]);
    res.json({ success: true, message: 'Carrito vaciado.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
