/**
 * Script para crear las cuentas de usuario de los trabajadores registrados.
 * Ejecutar: node create-workers-accounts.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'panaderia_db',
  user: process.env.DB_USER || 'admin_pan',
  password: process.env.DB_PASSWORD || 'panecuador2026'
});

async function createWorkersAccounts() {
  try {
    // 1. Obtener trabajadores sin cuenta vinculada
    const workersResult = await pool.query('SELECT * FROM trabajadores WHERE id_usuario IS NULL');
    const workers = workersResult.rows;

    if (workers.length === 0) {
      console.log('ℹ️ Todos los trabajadores ya tienen una cuenta vinculada.');
      return;
    }

    console.log(`📌 Encontrados ${workers.length} trabajadores sin cuenta. Generando credenciales...`);

    const salt = await bcrypt.genSalt(10);

    for (const w of workers) {
      const email = `${w.nombre.toLowerCase()}@panecuador.online`;
      const plainPassword = `${w.nombre}2026!`;
      const hash = await bcrypt.hash(plainPassword, salt);

      // Insertar usuario
      const userResult = await pool.query(`
        INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
        VALUES ($1, $2, $3, $4, $5, 'trabajador')
        ON CONFLICT (email) DO UPDATE SET password_hash = $4 RETURNING id_usuario
      `, [w.nombre, w.apellido, email, hash, w.telefono]);

      const idUsuario = userResult.rows[0].id_usuario;

      // Vincular trabajador
      await pool.query('UPDATE trabajadores SET id_usuario = $1 WHERE id_trabajador = $2', [idUsuario, w.id_trabajador]);

      console.log(`✅ Cuenta creada para ${w.nombre} ${w.apellido}:`);
      console.log(`   Email:      ${email}`);
      console.log(`   Contraseña: ${plainPassword}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createWorkersAccounts();
