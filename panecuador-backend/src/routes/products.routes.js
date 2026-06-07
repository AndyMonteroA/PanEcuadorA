const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

/**
 * GET /api/products
 * Listar productos con filtros, búsqueda y ordenamiento
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      categoria,
      productor,
      search,
      min_precio,
      max_precio,
      disponible,
      ordenar,     // precio_asc, precio_desc, nombre, reciente, complejidad, tiempo
      page = 1,
      limit = 12
    } = req.query;

    let query = `
      SELECT p.*,
             c.nombre AS categoria_nombre,
             pr.nombre_negocio AS productor_nombre,
             pr.ciudad AS productor_ciudad,
             COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
             COUNT(DISTINCT r.id_resena) AS total_resenas,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen_principal
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN productores pr ON p.id_productor = pr.id_productor
      LEFT JOIN reseñas r ON p.id_producto = r.id_producto
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filtro por categoría
    if (categoria) {
      conditions.push(`p.id_categoria = $${paramIndex++}`);
      params.push(categoria);
    }

    // Filtro por productor
    if (productor) {
      conditions.push(`p.id_productor = $${paramIndex++}`);
      params.push(productor);
    }

    // Búsqueda por nombre
    if (search) {
      conditions.push(`(p.nombre ILIKE $${paramIndex} OR p.descripcion ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro de precio
    if (min_precio) {
      conditions.push(`p.precio >= $${paramIndex++}`);
      params.push(min_precio);
    }
    if (max_precio) {
      conditions.push(`p.precio <= $${paramIndex++}`);
      params.push(max_precio);
    }

    // Disponibilidad
    if (disponible !== undefined) {
      conditions.push(`p.disponible = $${paramIndex++}`);
      params.push(disponible === 'true');
    } else {
      conditions.push('p.disponible = TRUE');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY p.id_producto, c.nombre, pr.nombre_negocio, pr.ciudad';

    // Ordenamiento
    switch (ordenar) {
      case 'precio_asc':
        query += ' ORDER BY p.precio ASC';
        break;
      case 'precio_desc':
        query += ' ORDER BY p.precio DESC';
        break;
      case 'nombre':
        query += ' ORDER BY p.nombre ASC';
        break;
      case 'reciente':
        query += ' ORDER BY p.fecha_creacion DESC';
        break;
      case 'complejidad':
        query += ' ORDER BY p.complejidad ASC, p.num_ingredientes ASC';
        break;
      case 'tiempo':
        query += ' ORDER BY p.tiempo_elaboracion_min ASC';
        break;
      case 'calificacion':
        query += ' ORDER BY calificacion_promedio DESC';
        break;
      default:
        query += ' ORDER BY p.fecha_creacion DESC';
    }

    // Paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Total para paginación
    let countQuery = 'SELECT COUNT(DISTINCT p.id_producto) FROM productos p WHERE p.disponible = TRUE';
    if (categoria) {
      countQuery = `SELECT COUNT(DISTINCT p.id_producto) FROM productos p WHERE p.disponible = TRUE AND p.id_categoria = ${categoria}`;
    }
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    // Si el usuario está autenticado, guardar búsqueda
    if (search && req.user) {
      await pool.query(
        'INSERT INTO historial_busqueda (id_usuario, termino) VALUES ($1, $2)',
        [req.user.id, search]
      );
    }

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
 * GET /api/products/featured
 * Productos destacados para el home
 */
router.get('/featured', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             c.nombre AS categoria_nombre,
             pr.nombre_negocio AS productor_nombre,
             COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
             COUNT(DISTINCT r.id_resena) AS total_resenas,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen_principal
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN productores pr ON p.id_productor = pr.id_productor
      LEFT JOIN reseñas r ON p.id_producto = r.id_producto
      WHERE p.disponible = TRUE AND p.stock > 0
      GROUP BY p.id_producto, c.nombre, pr.nombre_negocio
      ORDER BY calificacion_promedio DESC, p.fecha_creacion DESC
      LIMIT 8
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/search-suggestions
 * Sugerencias de búsqueda rápidas para autocompletado
 */
router.get('/search-suggestions', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.json({ success: true, data: { products: [], categories: [] } });
    }

    const searchTerm = `%${q.trim()}%`;

    // Buscar hasta 5 productos coincidentes
    const productsResult = await pool.query(`
      SELECT p.id_producto, p.nombre, p.precio, p.disponible,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen_principal
      FROM productos p
      WHERE p.nombre ILIKE $1 AND p.disponible = TRUE
      LIMIT 5
    `, [searchTerm]);

    // Buscar hasta 3 categorías coincidentes
    const categoriesResult = await pool.query(`
      SELECT id_categoria, nombre FROM categorias
      WHERE nombre ILIKE $1
      LIMIT 3
    `, [searchTerm]);

    res.json({
      success: true,
      data: {
        products: productsResult.rows,
        categories: categoriesResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/recommendations
 * Obtener productos recomendados basados en el historial de búsqueda del usuario
 */
router.get('/recommendations', optionalAuth, async (req, res, next) => {
  try {
    let result;
    if (req.user) {
      // Obtener los últimos 3 términos buscados por el usuario
      const history = await pool.query(`
        SELECT termino FROM historial_busqueda
        WHERE id_usuario = $1
        ORDER BY fecha DESC
        LIMIT 3
      `, [req.user.id]);

      if (history.rows.length > 0) {
        const terms = history.rows.map(h => `%${h.termino}%`);
        
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
          WHERE p.disponible = TRUE AND (
        `;
        
        const clauses = [];
        const params = [];
        terms.forEach((term, idx) => {
          clauses.push(`p.nombre ILIKE $${idx + 1} OR p.descripcion ILIKE $${idx + 1}`);
          params.push(term);
        });
        
        query += clauses.join(' OR ') + `)
          GROUP BY p.id_producto, c.nombre, pr.nombre_negocio
          LIMIT 8`;
          
        result = await pool.query(query, params);
      }
    }

    // Fallback: productos al azar si no hay historial o usuario
    if (!result || result.rows.length === 0) {
      result = await pool.query(`
        SELECT p.*,
               c.nombre AS categoria_nombre,
               pr.nombre_negocio AS productor_nombre,
               (SELECT url_archivo FROM galeria_producto gp
                WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
                ORDER BY gp.orden LIMIT 1) AS imagen_principal
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN productores pr ON p.id_productor = pr.id_productor
        WHERE p.disponible = TRUE AND p.stock > 0
        GROUP BY p.id_producto, c.nombre, pr.nombre_negocio
        ORDER BY RANDOM()
        LIMIT 8
      `);
    }

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Detalle de un producto
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    // Producto con detalles
    const result = await pool.query(`
      SELECT p.*,
             c.nombre AS categoria_nombre,
             pr.nombre_negocio AS productor_nombre,
             pr.ciudad AS productor_ciudad,
             pr.descripcion AS productor_descripcion,
             COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
             COUNT(DISTINCT r.id_resena) AS total_resenas
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN productores pr ON p.id_productor = pr.id_productor
      LEFT JOIN reseñas r ON p.id_producto = r.id_producto
      WHERE p.id_producto = $1
      GROUP BY p.id_producto, c.nombre, pr.nombre_negocio, pr.ciudad, pr.descripcion
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Galería
    const galeria = await pool.query(
      'SELECT * FROM galeria_producto WHERE id_producto = $1 ORDER BY orden',
      [req.params.id]
    );

    // Reseñas recientes
    const resenas = await pool.query(`
      SELECT r.*, u.nombre, u.apellido
      FROM reseñas r
      JOIN usuarios u ON r.id_usuario = u.id_usuario
      WHERE r.id_producto = $1
      ORDER BY r.fecha DESC
      LIMIT 5
    `, [req.params.id]);

    // Es favorito (si autenticado)
    let esFavorito = false;
    if (req.user) {
      const favResult = await pool.query(
        'SELECT 1 FROM favoritos WHERE id_usuario = $1 AND id_producto = $2',
        [req.user.id, req.params.id]
      );
      esFavorito = favResult.rows.length > 0;
    }

    const producto = result.rows[0];

    res.json({
      success: true,
      data: {
        ...producto,
        galeria: galeria.rows,
        resenas: resenas.rows,
        esFavorito
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/category/:id
 * Productos por categoría
 */
router.get('/category/:id', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             pr.nombre_negocio AS productor_nombre,
             COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
             (SELECT url_archivo FROM galeria_producto gp
              WHERE gp.id_producto = p.id_producto AND gp.tipo = 'foto'
              ORDER BY gp.orden LIMIT 1) AS imagen_principal
      FROM productos p
      LEFT JOIN productores pr ON p.id_productor = pr.id_productor
      LEFT JOIN reseñas r ON p.id_producto = r.id_producto
      WHERE p.id_categoria = $1 AND p.disponible = TRUE
      GROUP BY p.id_producto, pr.nombre_negocio
      ORDER BY p.nombre
    `, [req.params.id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
