-- ============================================================
-- DATOS INICIALES (SEED) — PanEcuador
-- ============================================================

-- ============================================================
-- CATEGORÍAS
-- ============================================================

INSERT INTO categorias (nombre, descripcion, imagen_url) VALUES
  ('Panes artesanales',  'Pan de yema, pan de agua, pan de sal y variedades artesanales ecuatorianas', '/images/categorias/panes.jpg'),
  ('Pasteles y tortas',  'Tortas de cumpleaños, pasteles de ocasión y tortas frías',                  '/images/categorias/pasteles.jpg'),
  ('Bocaditos',          'Alfajores, empanadas dulces, suspiros y bocaditos de sal',                  '/images/categorias/bocaditos.jpg'),
  ('Postres',            'Tres leches, mil hojas, brazo gitano y otros postres tradicionales',        '/images/categorias/postres.jpg'),
  ('Sin gluten',         'Productos elaborados sin trigo para intolerantes al gluten',                '/images/categorias/singluten.jpg'),
  ('Temporada',          'Colada morada, guaguas de pan, buñuelos y productos festivos',              '/images/categorias/temporada.jpg');

-- ============================================================
-- PRODUCTORES
-- ============================================================

INSERT INTO productores (nombre_negocio, descripcion, ciudad, provincia, telefono, email) VALUES
  ('Panadería Don Pancho',     'Panadería artesanal con más de 30 años de tradición quiteña',           'Quito',     'Pichincha',  '0991234567', 'donpancho@panecuador.ec'),
  ('Dulces Tradiciones',       'Pastelería especializada en recetas tradicionales ecuatorianas',         'Guayaquil', 'Guayas',     '0997654321', 'dulces@panecuador.ec'),
  ('La Casa del Pan',          'Panadería familiar dedicada a preservar el sabor auténtico del pan',    'Cuenca',    'Azuay',      '0993456789', 'casadelpan@panecuador.ec');

-- ============================================================
-- PRODUCTOS — 5 de Panadería + 5 de Pastelería
-- ============================================================

-- === PANADERÍA (categoría 1: Panes artesanales) ===

INSERT INTO productos (id_categoria, id_productor, nombre, descripcion, ingredientes, peso_gramos, precio, stock, disponible, tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes) VALUES

-- 1. Pan de yema (simple, pocos ingredientes)
(1, 1, 'Pan de Yema Quiteño',
 'Pan tradicional quiteño hecho con yemas de huevo, suave y esponjoso. Perfecto para el desayuno con café.',
 'Harina de trigo, yemas de huevo, mantequilla, azúcar, levadura, sal',
 80, 0.35, 50, TRUE,
 25, 3, 2, 6),

-- 2. Pan de agua
(1, 1, 'Pan de Agua Guayaquileño',
 'Pan crujiente por fuera y suave por dentro, típico de la costa ecuatoriana.',
 'Harina de trigo, agua, manteca vegetal, levadura, sal',
 100, 0.25, 60, TRUE,
 20, 3, 1, 5),

-- 3. Enrollado de queso
(1, 3, 'Enrollado de Queso',
 'Pan enrollado relleno de queso fresco artesanal, horneado hasta quedar dorado y crujiente.',
 'Harina de trigo, queso fresco, mantequilla, huevo, levadura, sal, azúcar',
 120, 0.75, 40, TRUE,
 35, 3, 3, 7),

-- 4. Pan de maíz
(1, 3, 'Pan de Maíz Serrano',
 'Pan elaborado con harina de maíz andino, receta tradicional de la sierra ecuatoriana.',
 'Harina de maíz, manteca de cerdo, queso, huevos, royal, sal',
 90, 0.45, 45, TRUE,
 30, 3, 2, 6),

-- 5. Empanada de viento
(1, 1, 'Empanada de Viento',
 'Empanada frita rellena de queso, crujiente y espolvoreada con azúcar. Ícono de la gastronomía ecuatoriana.',
 'Harina de trigo, queso fresco, cebolla, manteca, huevo, azúcar, sal',
 100, 0.85, 35, TRUE,
 40, 3, 3, 7),

-- === PASTELERÍA (categoría 2: Pasteles y tortas) ===

-- 6. Torta tres leches
(2, 2, 'Torta Tres Leches',
 'Bizcocho húmedo bañado en tres leches (condensada, evaporada y crema), decorado con merengue italiano.',
 'Harina, huevos, azúcar, leche condensada, leche evaporada, crema de leche, vainilla, merengue',
 500, 12.50, 10, TRUE,
 90, 3, 4, 8),

-- 7. Mil hojas
(2, 2, 'Mil Hojas de Manjar',
 'Capas crujientes de hojaldre intercaladas con manjar de leche y crema pastelera, espolvoreada con azúcar glass.',
 'Harina, mantequilla, huevos, manjar de leche, crema pastelera, azúcar glass',
 400, 8.99, 12, TRUE,
 120, 3, 5, 6),

-- 8. Brazo gitano
(2, 2, 'Brazo Gitano de Fresa',
 'Bizcocho enrollado relleno de crema y fresas frescas ecuatorianas.',
 'Harina, huevos, azúcar, crema chantilly, fresas, vainilla',
 350, 7.50, 15, TRUE,
 60, 3, 3, 6),

-- 9. Torta de chocolate
(2, 3, 'Torta de Chocolate Ecuatoriano',
 'Torta húmeda elaborada con cacao fino de aroma ecuatoriano, ganache de chocolate oscuro.',
 'Cacao ecuatoriano, harina, mantequilla, azúcar, huevos, crema de leche, chocolate oscuro, vainilla, royal',
 600, 15.00, 8, TRUE,
 100, 3, 5, 9),

-- 10. Alfajores de manjar
(3, 2, 'Alfajores de Manjar (6 unid.)',
 'Galletas de maicena rellenas de manjar de leche y bañadas en azúcar glass. Caja de 6 unidades.',
 'Maicena, harina, mantequilla, azúcar glass, manjar de leche, limón, royal',
 180, 4.50, 20, TRUE,
 50, 3, 3, 7);

-- ============================================================
-- MEMBRESÍAS PANPASS
-- ============================================================

INSERT INTO membresias (nombre, precio_mensual, incluye_caja, descuento_porcentaje, descripcion) VALUES
  ('PanPass Básico', 4.99, FALSE, 10.00,
   'Entregas gratis en todos tus pedidos y 10 porciento de descuento en productos seleccionados.'),
  ('PanPass Plus', 9.99, TRUE, 15.00,
   'Todo lo del plan Básico más una caja mensual curada con productos artesanales sorpresa y 15 porciento de descuento.');

-- ============================================================
-- TURNOS ROTATIVOS (3 turnos de 8 horas = 24h)
-- ============================================================

INSERT INTO turnos (nombre, hora_inicio, hora_fin) VALUES
  ('Mañana', '06:00:00', '14:00:00'),
  ('Tarde',  '14:00:00', '22:00:00'),
  ('Noche',  '22:00:00', '06:00:00');

-- ============================================================
-- TRABAJADORES DE EJEMPLO
-- ============================================================

INSERT INTO trabajadores (nombre, apellido, cedula, especialidad, telefono) VALUES
  ('Carlos',   'Mendoza',  '1712345678', 'panadero',   '0991112233'),
  ('María',    'Flores',   '0912345679', 'pastelero',  '0992223344'),
  ('José',     'Guamán',   '0112345680', 'ambos',      '0993334455'),
  ('Ana',      'Pacheco',  '1812345681', 'panadero',   '0994445566'),
  ('Luis',     'Cevallos', '0712345682', 'pastelero',  '0995556677'),
  ('Rosa',     'Toapanta', '1312345683', 'ambos',      '0996667788');

-- ============================================================
-- CUPONES DE EJEMPLO
-- ============================================================

INSERT INTO cupones (codigo, tipo_descuento, valor, fecha_vencimiento, usos_maximos) VALUES
  ('BIENVENIDO10', 'porcentaje',  10.00, '2026-12-31', 1000),
  ('PANFRESCO',    'monto_fijo',  2.00,  '2026-12-31', 500),
  ('PANPASS15',    'porcentaje',  15.00, '2026-12-31', NULL);
