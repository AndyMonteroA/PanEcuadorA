// ============================================================
// PanEcuador — Servidor de Aplicaciones
// Node.js + Express + PostgreSQL
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// Importar configuración
const pool = require('./config/db');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productsRoutes = require('./routes/products.routes');
const cartRoutes = require('./routes/cart.routes');
const ordersRoutes = require('./routes/orders.routes');
const subscriptionsRoutes = require('./routes/subscriptions.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const adminRoutes = require('./routes/admin.routes');

// Importar servicios (cron jobs)
const { verificarStockVencido } = require('./services/stockRotation');
const { generarTurnosSemana } = require('./services/shiftScheduler');

// ============================================================
// CONFIGURACIÓN DEL SERVIDOR
// ============================================================

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware global ---

// CORS: Permitir requests desde el frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parsear JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Log de requests (desarrollo) ---
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================
// RUTAS DE LA API
// ============================================================

// Ruta de salud del servidor
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as server_time');
    res.json({
      success: true,
      message: 'PanEcuador API funcionando correctamente 🍞',
      server: {
        status: 'online',
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        dbTime: dbResult.rows[0].server_time
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error de conexión a la base de datos.',
      error: error.message
    });
  }
});

// Ruta de información de categorías (pública)
app.get('/api/categories', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY id_categoria');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Rutas de módulos
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

// ============================================================
// TAREAS PROGRAMADAS (CRON JOBS)
// ============================================================

// Verificar stock vencido cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ [CRON] Verificando stock vencido...');
  await verificarStockVencido();
});

// Generar turnos rotativos cada domingo a las 23:00
cron.schedule('0 23 * * 0', async () => {
  console.log('⏰ [CRON] Generando turnos para la próxima semana...');
  await generarTurnosSemana();
});

// ============================================================
// MANEJO DE ERRORES
// ============================================================

// Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.path}`
  });
});

// Middleware global de errores
app.use(errorHandler);

// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {
  console.log('');
  console.log('🍞 ═══════════════════════════════════════════');
  console.log('🍞  PanEcuador — Servidor de Aplicaciones');
  console.log('🍞 ═══════════════════════════════════════════');
  console.log(`🌐  URL:      http://localhost:${PORT}`);
  console.log(`📡  API:      http://localhost:${PORT}/api`);
  console.log(`🔧  Entorno:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️   DB:       ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log('🍞 ═══════════════════════════════════════════');
  console.log('');
});

module.exports = app;
