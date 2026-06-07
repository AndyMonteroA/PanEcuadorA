-- ============================================================
-- MIGRACIÓN 06: Asignar trabajadores a productores + completar productos
-- Ejecutar en el servidor: psql -U panecuador_user -d panaderia_db -f 06_complete_data.sql
-- ============================================================

-- 1. Asignar trabajadores a productores
-- Don Pancho (id=1): Carlos Mendoza + Ana Pacheco (panaderos)
-- Dulces Tradiciones (id=2): María Flores + Luis Cevallos (pasteleros)
-- La Casa del Pan (id=3): José Guamán + Rosa Toapanta (ambos)

UPDATE trabajadores SET id_productor = 1 WHERE cedula = '1712345678'; -- Carlos → Don Pancho
UPDATE trabajadores SET id_productor = 1 WHERE cedula = '1812345681'; -- Ana → Don Pancho
UPDATE trabajadores SET id_productor = 2 WHERE cedula = '0912345679'; -- María → Dulces Tradiciones
UPDATE trabajadores SET id_productor = 2 WHERE cedula = '0712345682'; -- Luis → Dulces Tradiciones
UPDATE trabajadores SET id_productor = 3 WHERE cedula = '0112345680'; -- José → La Casa del Pan
UPDATE trabajadores SET id_productor = 3 WHERE cedula = '1312345683'; -- Rosa → La Casa del Pan

-- 2. Completar productos: 5 por cada categoría (30 total)
-- Ya existen: Cat 1 (5 panes), Cat 2 (4 pasteles), Cat 3 (1 bocadito)
-- Faltan: Cat 2 (1), Cat 3 (4), Cat 4 (5), Cat 5 (5), Cat 6 (5)

-- === Categoría 2: Pasteles y tortas (falta 1) ===
INSERT INTO productos (id_categoria, id_productor, nombre, descripcion, ingredientes, peso_gramos, precio, stock, disponible, tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes) VALUES
(2, 1, 'Pastel de Plátano Maduro',
 'Pastel suave elaborado con plátano maduro de la costa ecuatoriana, canela y clavo de olor.',
 'Plátano maduro, harina, huevos, mantequilla, azúcar, canela, clavo de olor, vainilla, royal',
 450, 6.50, 12, TRUE, 70, 3, 3, 9);

-- === Categoría 3: Bocaditos (faltan 4) ===
INSERT INTO productos (id_categoria, id_productor, nombre, descripcion, ingredientes, peso_gramos, precio, stock, disponible, tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes) VALUES
(3, 2, 'Suspiros de Merengue (12 unid.)',
 'Merengues crocantes por fuera y suaves por dentro, con un toque de vainilla y limón.',
 'Claras de huevo, azúcar, limón, vainilla, cremor tártaro',
 150, 3.50, 25, TRUE, 45, 3, 2, 5),

(3, 1, 'Empanadas de Morocho (6 unid.)',
 'Empanadas de morocho rellenas de carne molida especiada, típicas de la sierra ecuatoriana.',
 'Morocho, carne molida, cebolla, comino, achiote, arroz, huevo, sal',
 300, 5.00, 18, TRUE, 55, 3, 4, 8),

(3, 3, 'Quimbolitos (6 unid.)',
 'Tamales dulces de maíz envueltos en hojas de achira, con pasas y queso. Receta ancestral ecuatoriana.',
 'Harina de maíz, mantequilla, huevos, azúcar, queso, pasas, anís, royal, hojas de achira',
 360, 4.75, 22, TRUE, 60, 3, 4, 9),

(3, 2, 'Pristiños (8 unid.)',
 'Masa frita en forma de lazo bañada en miel de panela. Tradición navideña ecuatoriana.',
 'Harina de trigo, manteca, huevos, anís, panela, limón, canela',
 200, 3.25, 30, TRUE, 40, 3, 3, 7);

-- === Categoría 4: Postres (5 nuevos) ===
INSERT INTO productos (id_categoria, id_productor, nombre, descripcion, ingredientes, peso_gramos, precio, stock, disponible, tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes) VALUES
(4, 2, 'Dulce de Higos con Queso',
 'Higos confitados en panela servidos con queso fresco artesanal. Postre emblemático de la sierra.',
 'Higos, panela, canela, clavo de olor, queso fresco',
 250, 4.50, 15, TRUE, 180, 3, 2, 5),

(4, 2, 'Espumilla de Guayaba',
 'Merengue batido con pulpa de guayaba natural, servido en copa. Frescura tropical ecuatoriana.',
 'Claras de huevo, azúcar, pulpa de guayaba, limón',
 200, 2.50, 20, TRUE, 25, 2, 1, 4),

(4, 3, 'Arroz con Leche Ecuatoriano',
 'Arroz cocinado en leche con canela, pasas y leche condensada. Postre cremoso de tradición colonial.',
 'Arroz, leche entera, leche condensada, canela, pasas, azúcar, vainilla',
 300, 3.75, 18, TRUE, 45, 3, 2, 7),

(4, 1, 'Mousse de Maracuyá',
 'Mousse ligero y cremoso elaborado con maracuyá ecuatoriana fresca. Acidez tropical perfecta.',
 'Maracuyá, crema de leche, leche condensada, gelatina, azúcar',
 200, 5.25, 10, TRUE, 40, 2, 3, 5),

(4, 3, 'Torta de Tres Leches de Coco',
 'Variación costeña de la tres leches con leche de coco rallado y coco tostado.',
 'Harina, huevos, leche condensada, leche evaporada, leche de coco, coco rallado, azúcar, vainilla',
 400, 10.00, 8, TRUE, 85, 3, 4, 8);

-- === Categoría 5: Sin Gluten (5 nuevos) ===
INSERT INTO productos (id_categoria, id_productor, nombre, descripcion, ingredientes, peso_gramos, precio, stock, disponible, tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes) VALUES
(5, 1, 'Pan de Yuca',
 'Pan tradicional elaborado con almidón de yuca y queso fresco. Naturalmente libre de gluten.',
 'Almidón de yuca, queso fresco, mantequilla, huevo, sal',
 70, 0.65, 40, TRUE, 20, 3, 1, 5),

(5, 3, 'Brownies de Cacao Fino (4 unid.)',
 'Brownies densos y húmedos elaborados con cacao fino de aroma ecuatoriano y harina de almendra.',
 'Cacao ecuatoriano, harina de almendra, mantequilla, azúcar, huevos, chocolate oscuro',
 240, 6.50, 15, TRUE, 35, 3, 3, 6),

(5, 2, 'Galletas de Avena y Banana (8 unid.)',
 'Galletas saludables sin gluten hechas con avena certificada y banana ecuatoriana.',
 'Avena sin gluten, banana, miel, aceite de coco, chispas de chocolate, canela',
 200, 4.00, 25, TRUE, 25, 3, 2, 6),

(5, 1, 'Torta de Zanahoria Sin Gluten',
 'Torta húmeda de zanahoria con frosting de queso crema, elaborada con harina de almendra.',
 'Zanahoria, harina de almendra, huevos, aceite, azúcar, queso crema, canela, nueces',
 500, 11.00, 6, TRUE, 75, 3, 4, 8),

(5, 3, 'Muffins de Arándano (4 unid.)',
 'Muffins esponjosos sin gluten con arándanos frescos y un toque de limón.',
 'Harina de arroz, arándanos, huevos, mantequilla, azúcar, limón, royal',
 280, 5.50, 12, TRUE, 30, 3, 3, 7);

-- === Categoría 6: Temporada (5 nuevos) ===
INSERT INTO productos (id_categoria, id_productor, nombre, descripcion, ingredientes, peso_gramos, precio, stock, disponible, tiempo_elaboracion_min, vida_util_dias, complejidad, num_ingredientes) VALUES
(6, 1, 'Guaguas de Pan (par)',
 'Panes en forma de muñecos decorados con glaseado de colores. Tradición del Día de los Difuntos.',
 'Harina de trigo, mantequilla, huevos, azúcar, levadura, anís, glaseado de colores',
 300, 3.50, 30, TRUE, 50, 3, 3, 7),

(6, 2, 'Colada Morada (1 litro)',
 'Bebida ritual elaborada con mora, mortiño, naranjilla, piña y harina de maíz morado con especias.',
 'Harina de maíz morado, mora, mortiño, naranjilla, piña, canela, clavo, ishpingo, panela',
 1000, 5.00, 20, TRUE, 120, 2, 4, 10),

(6, 3, 'Buñuelos con Miel de Panela (8 unid.)',
 'Buñuelos fritos y crujientes bañados en miel caliente de panela con canela. Clásico navideño.',
 'Harina de trigo, huevos, mantequilla, panela, canela, aceite, levadura, sal',
 250, 4.25, 22, TRUE, 45, 3, 3, 8),

(6, 1, 'Rosca de Reyes',
 'Pan dulce redondo decorado con frutas confitadas y azúcar. Tradición de enero ecuatoriana.',
 'Harina, mantequilla, huevos, azúcar, leche, levadura, frutas confitadas, esencia de azahar',
 500, 8.00, 10, TRUE, 90, 3, 4, 8),

(6, 2, 'Humitas Dulces (6 unid.)',
 'Tamales de choclo tierno envueltos en hoja de maíz con queso y pasas. Producto de temporada.',
 'Choclo tierno, mantequilla, queso fresco, huevos, azúcar, pasas, canela, hojas de choclo',
 480, 6.00, 18, TRUE, 70, 3, 3, 8);

-- 3. Crear cuentas de usuario para productores (rol = 'productor')
-- Contraseña: Productor2026! (hash bcrypt)
-- $2a$10$3udJKr9AOhliD1N2i4s/su/sw4zy.IeZcE2x82wZk28giOnaweVs.

INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol) VALUES
('Don Pancho', 'Admin', 'donpancho@panecuador.ec', '$2a$10$3udJKr9AOhliD1N2i4s/su/sw4zy.IeZcE2x82wZk28giOnaweVs.', '0991234567', 'productor'),
('Dulces', 'Tradiciones', 'dulces@panecuador.ec', '$2a$10$3udJKr9AOhliD1N2i4s/su/sw4zy.IeZcE2x82wZk28giOnaweVs.', '0997654321', 'productor'),
('Casa del', 'Pan', 'casadelpan@panecuador.ec', '$2a$10$3udJKr9AOhliD1N2i4s/su/sw4zy.IeZcE2x82wZk28giOnaweVs.', '0993456789', 'productor');

-- 4. Vincular usuarios productores con la tabla productores
-- Necesitamos agregar id_usuario a productores
ALTER TABLE productores ADD COLUMN IF NOT EXISTS id_usuario INT REFERENCES usuarios(id_usuario);

-- Vincular (asumiendo los IDs se crearon en orden)
UPDATE productores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'donpancho@panecuador.ec') WHERE nombre_negocio = 'Panadería Don Pancho';
UPDATE productores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'dulces@panecuador.ec') WHERE nombre_negocio = 'Dulces Tradiciones';
UPDATE productores SET id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'casadelpan@panecuador.ec') WHERE nombre_negocio = 'La Casa del Pan';
