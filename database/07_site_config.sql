-- ============================================================
-- MIGRACIÓN 07: Configuración del Sitio + Permisos Favoritos
-- PanEcuador — Panel de Administración
-- Ejecutar: sudo -u postgres psql -d panaderia_db -f 07_site_config.sql
-- ============================================================

-- 1. Tabla de configuración del sitio (key-value store)
CREATE TABLE IF NOT EXISTS configuracion_sitio (
  clave        VARCHAR(100) PRIMARY KEY,
  valor        TEXT,
  descripcion  TEXT,
  tipo         VARCHAR(30) DEFAULT 'texto'  -- texto, color, imagen, boolean
);

-- 2. Valores por defecto del sitio
INSERT INTO configuracion_sitio (clave, valor, descripcion, tipo) VALUES
  ('sitio_nombre',         'PanEcuador',                       'Nombre principal del sitio',             'texto'),
  ('sitio_subtitulo',      'Panadería artesanal ecuatoriana',  'Subtítulo en el hero del home',          'texto'),
  ('sitio_logo_url',       '',                                  'URL del logo del sitio',                 'imagen'),
  ('color_primario',       '#E86A2E',                           'Color primario (botones, links)',         'color'),
  ('color_secundario',     '#2D6A4F',                           'Color secundario',                       'color'),
  ('color_acento',         '#F5A623',                           'Color de acento (estrellas, badges)',     'color'),
  ('banner_activo',        'false',                             'Mostrar banner de anuncio en top',       'boolean'),
  ('banner_texto',         '🎉 ¡Envío gratis en pedidos mayores a $25!', 'Texto del banner superior', 'texto'),
  ('banner_color',         '#2D6A4F',                           'Color de fondo del banner',              'color'),
  ('hero_titulo',          'Pan artesanal ecuatoriano',         'Título principal del hero',              'texto'),
  ('hero_subtitulo',       'Recetas tradicionales con ingredientes de origen. Entrega a domicilio.', 'Subtítulo del hero', 'texto'),
  ('hero_cta_texto',       'Ver Catálogo',                      'Texto del botón principal del hero',     'texto'),
  ('contacto_email',       'hola@panecuador.online',            'Email de contacto público',              'texto'),
  ('contacto_telefono',    '+593 99 000 0000',                  'Teléfono de contacto público',           'texto'),
  ('redes_instagram',      '',                                  'URL de Instagram',                       'texto'),
  ('redes_facebook',       '',                                  'URL de Facebook',                        'texto'),
  ('footer_texto',         '© 2026 PanEcuador. Hecho con ❤️ en Ecuador.', 'Texto del footer', 'texto')
ON CONFLICT (clave) DO NOTHING;

-- 3. Dar permisos completos a admin_pan (incluye favoritos y nueva tabla)
GRANT ALL PRIVILEGES ON TABLE configuracion_sitio TO admin_pan;
