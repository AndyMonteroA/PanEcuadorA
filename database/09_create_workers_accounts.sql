-- ============================================================
-- MIGRACIÓN 09: Crear cuentas de usuario para los trabajadores
-- ============================================================

-- 1. Insertar las cuentas en 'usuarios' si no existen (evitando duplicados en email)
-- Carlos Mendoza (carlos@panecuador.online / Carlos2026!)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('Carlos', 'Mendoza', 'carlos@panecuador.online', '$2a$10$BtJAVhcnxNkCQQ/oGe.GVOzxucr7tnVo6l/KU1Te4/x/rbEQfxYfG', '0991112233', 'trabajador')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- María Flores (maria@panecuador.online / Maria2026!)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('María', 'Flores', 'maria@panecuador.online', '$2a$10$Geeo4n7sS15hPRTPAzJkAeRDZl7In/GOyZdzBb9u7C0XGGXo2rnfq', '0992223344', 'trabajador')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- José Guamán (jose@panecuador.online / Jose2026!)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('José', 'Guamán', 'jose@panecuador.online', '$2a$10$9zs7CQCrbwDAiy18pC23EuDKKMOgvRH5doyiGeOKCkb42kyQ65X5G', '0993334455', 'trabajador')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Ana Pacheco (ana@panecuador.online / Ana2026!)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('Ana', 'Pacheco', 'ana@panecuador.online', '$2a$10$P68jBXIINW0hsFHajMoAW.47C5b92fydPRrj0Fe1LPWnZ7ZlGoZDG', '0994445566', 'trabajador')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Luis Cevallos (luis@panecuador.online / Luis2026!)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('Luis', 'Cevallos', 'luis@panecuador.online', '$2a$10$EpbwkQCRI/3umqqLL6d5Tem1Mm1eL/JJ29z9Llbnps2.Y2lqQwJJ6', '0995556677', 'trabajador')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Rosa Toapanta (rosa@panecuador.online / Rosa2026!)
INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol)
VALUES ('Rosa', 'Toapanta', 'rosa@panecuador.online', '$2a$10$.CYiX02HKdgxPYeoI9tRCec3uZzd9ZFO1FTRLak4zO02sUcr.Gu.i', '0996667788', 'trabajador')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. Vincular cada trabajador con su respectivo usuario recién creado
UPDATE trabajadores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'carlos@panecuador.online') WHERE cedula = '1712345678';
UPDATE trabajadores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'maria@panecuador.online') WHERE cedula = '0912345679';
UPDATE trabajadores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'jose@panecuador.online') WHERE cedula = '0112345680';
UPDATE trabajadores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'ana@panecuador.online') WHERE cedula = '1812345681';
UPDATE trabajadores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'luis@panecuador.online') WHERE cedula = '0712345682';
UPDATE trabajadores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'rosa@panecuador.online') WHERE cedula = '1312345683';
