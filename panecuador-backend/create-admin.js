/**
 * Script para crear el usuario administrador en la base de datos.
 * Ejecutar una sola vez: node create-admin.js
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

async function createAdmin() {
  try {
    // 1. Agregar columna rol si no existe
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'cliente'
          CHECK (rol IN ('cliente', 'admin'));
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);
    console.log('✅ Columna "rol" verificada/creada');

    // 2. Hash de la contraseña del admin
    const password = 'Admin2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // 3. Insertar o actualizar admin
    const result = await pool.query(`
      INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $4,
        rol = 'admin'
      RETURNING id_usuario, email, rol
    `, ['Administrador', 'PanEcuador', 'admin@panecuador.online', hash, '0999999999', 'admin']);

    console.log('✅ Usuario administrador creado/actualizado:');
    console.log(`   Email:      admin@panecuador.online`);
    console.log(`   Contraseña: Admin2026!`);
    console.log(`   ID:         ${result.rows[0].id_usuario}`);
    console.log(`   Rol:        ${result.rows[0].rol}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
