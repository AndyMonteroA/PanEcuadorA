-- ============================================================
-- BASE DE DATOS: PanEcuador
-- Plataforma digital de panadería y pastelería ecuatoriana
-- Motor: PostgreSQL 14+
-- ============================================================

-- Crear la base de datos (ejecutar como superusuario)
-- CREATE DATABASE panaderia_db;
-- \c panaderia_db

-- ============================================================
-- MÓDULO 1: USUARIOS Y CUENTA
-- ============================================================

CREATE TABLE usuarios (
    id_usuario    SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    apellido      VARCHAR(100) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono      VARCHAR(20),
    foto_perfil_url TEXT,
    activo        BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE direcciones (
    id_direccion  SERIAL PRIMARY KEY,
    id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    alias         VARCHAR(50),                -- Ej: Casa, Trabajo
    calle         VARCHAR(255) NOT NULL,
    ciudad        VARCHAR(100) NOT NULL,
    provincia     VARCHAR(100) NOT NULL,
    referencia    TEXT,
    es_principal  BOOLEAN DEFAULT FALSE
);

CREATE TABLE metodos_pago (
    id_metodo         SERIAL PRIMARY KEY,
    id_usuario        INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo              VARCHAR(30) NOT NULL
                      CHECK (tipo IN ('tarjeta_credito', 'tarjeta_debito', 'transferencia')),
    ultimos_4_digitos CHAR(4),
    marca             VARCHAR(30),             -- Visa, Mastercard, etc.
    token_cifrado     TEXT NOT NULL,           -- Nunca guardar el número completo
    es_principal      BOOLEAN DEFAULT FALSE,
    activo            BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- MÓDULO 2: SEGURIDAD Y ALERTAS → tabla notificaciones (final)
-- ============================================================

-- ============================================================
-- MÓDULO 3 y 4: CATÁLOGO, PEDIDOS E HISTORIAL
-- ============================================================

CREATE TABLE categorias (
    id_categoria  SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    descripcion   TEXT,
    imagen_url    TEXT
);

CREATE TABLE productores (
    id_productor    SERIAL PRIMARY KEY,
    nombre_negocio  VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    ciudad          VARCHAR(100),
    provincia       VARCHAR(100),
    telefono        VARCHAR(20),
    email           VARCHAR(255),
    foto_local_url  TEXT,
    activo          BOOLEAN DEFAULT TRUE,
    fecha_registro  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE productos (
    id_producto            SERIAL PRIMARY KEY,
    id_categoria           INT REFERENCES categorias(id_categoria),
    id_productor           INT REFERENCES productores(id_productor),
    nombre                 VARCHAR(200) NOT NULL,
    descripcion            TEXT,
    ingredientes           TEXT,
    peso_gramos            INT,
    precio                 DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    stock                  INT DEFAULT 0 CHECK (stock >= 0),
    disponible             BOOLEAN DEFAULT TRUE,
    -- Campos nuevos según consideraciones del profesor
    tiempo_elaboracion_min INT NOT NULL DEFAULT 30,         -- Minutos para elaborar 1 unidad
    vida_util_dias         INT NOT NULL DEFAULT 3,          -- Días de vida útil (stock fresco, máx 3)
    complejidad            INT DEFAULT 3 CHECK (complejidad BETWEEN 1 AND 5), -- 1=simple, 5=complejo
    num_ingredientes       INT DEFAULT 5,                   -- Cantidad de ingredientes
    fecha_elaboracion_stock TIMESTAMP,                      -- Cuándo se elaboró el stock actual
    fecha_vencimiento_stock TIMESTAMP,                      -- Cuándo vence el stock actual
    fecha_creacion         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fotos y videos cortos del producto
CREATE TABLE galeria_producto (
    id_galeria   SERIAL PRIMARY KEY,
    id_producto  INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    url_archivo  TEXT NOT NULL,
    tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('foto', 'video')),
    orden        INT DEFAULT 0
);

CREATE TABLE cupones (
    id_cupon        SERIAL PRIMARY KEY,
    codigo          VARCHAR(50) UNIQUE NOT NULL,
    tipo_descuento  VARCHAR(20) NOT NULL
                    CHECK (tipo_descuento IN ('porcentaje', 'monto_fijo')),
    valor           DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    fecha_vencimiento DATE,
    usos_maximos    INT,
    usos_actuales   INT DEFAULT 0,
    activo          BOOLEAN DEFAULT TRUE
);

-- Carrito de compras persistente
CREATE TABLE carrito (
    id_carrito    SERIAL PRIMARY KEY,
    id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_producto   INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad      INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_usuario, id_producto)
);

CREATE TABLE pedidos (
    id_pedido                SERIAL PRIMARY KEY,
    id_usuario               INT NOT NULL REFERENCES usuarios(id_usuario),
    id_direccion             INT NOT NULL REFERENCES direcciones(id_direccion),
    id_metodo_pago           INT NOT NULL REFERENCES metodos_pago(id_metodo),
    id_cupon                 INT REFERENCES cupones(id_cupon),
    estado                   VARCHAR(30) NOT NULL DEFAULT 'pendiente'
                             CHECK (estado IN ('pendiente','confirmado','preparando',
                                               'en_camino','entregado','cancelado')),
    subtotal                 DECIMAL(10,2) NOT NULL,
    descuento                DECIMAL(10,2) DEFAULT 0,
    total                    DECIMAL(10,2) NOT NULL,
    -- Campos nuevos según consideraciones del profesor
    cantidad_total_items     INT NOT NULL CHECK (cantidad_total_items <= 100),  -- Máx 100 productos por orden
    tiempo_estimado_min      INT,                   -- Tiempo total estimado de elaboración en minutos
    fecha_pedido             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega_programada DATE,
    franja_horaria           VARCHAR(50),            -- Ej: '08:00 - 12:00'
    notas_cliente            TEXT                    -- Notas especiales del cliente
);

CREATE TABLE detalle_pedido (
    id_detalle      SERIAL PRIMARY KEY,
    id_pedido       INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    id_producto     INT NOT NULL REFERENCES productos(id_producto),
    cantidad        INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL
);

CREATE TABLE historial_busqueda (
    id_busqueda  SERIAL PRIMARY KEY,
    id_usuario   INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    termino      VARCHAR(255) NOT NULL,
    fecha        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MÓDULO 5: PERSONALIZACIÓN Y RECOMENDACIÓN
-- ============================================================

CREATE TABLE favoritos (
    id_favorito    SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_producto    INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_usuario, id_producto)
);

-- ============================================================
-- MÓDULO 6: POST VENTA
-- ============================================================

CREATE TABLE reseñas (
    id_resena    SERIAL PRIMARY KEY,
    id_usuario   INT NOT NULL REFERENCES usuarios(id_usuario),
    id_producto  INT NOT NULL REFERENCES productos(id_producto),
    id_pedido    INT NOT NULL REFERENCES pedidos(id_pedido),
    calificacion INT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario   TEXT,
    fecha        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devoluciones (
    id_devolucion    SERIAL PRIMARY KEY,
    id_pedido        INT NOT NULL REFERENCES pedidos(id_pedido),
    id_usuario       INT NOT NULL REFERENCES usuarios(id_usuario),
    motivo           TEXT NOT NULL,
    estado           VARCHAR(30) DEFAULT 'solicitada'
                     CHECK (estado IN ('solicitada','en_proceso','resuelta','rechazada')),
    fecha_solicitud  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP
);

-- ============================================================
-- MÓDULO 7: CONTENIDO DIGITAL → cubierto por galeria_producto
-- ============================================================

-- ============================================================
-- MÓDULO 8: ECOSISTEMA (MEMBRESÍAS PANPASS)
-- ============================================================

CREATE TABLE membresias (
    id_membresia         SERIAL PRIMARY KEY,
    nombre               VARCHAR(100) NOT NULL,   -- Ej: PanPass Básico, PanPass Plus
    precio_mensual       DECIMAL(10,2) NOT NULL,
    incluye_caja         BOOLEAN DEFAULT FALSE,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descripcion          TEXT,
    activo               BOOLEAN DEFAULT TRUE
);

CREATE TABLE suscripciones_usuario (
    id_suscripcion  SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuarios(id_usuario),
    id_membresia    INT NOT NULL REFERENCES membresias(id_membresia),
    id_metodo_pago  INT NOT NULL REFERENCES metodos_pago(id_metodo),
    fecha_inicio    DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_renovacion DATE NOT NULL,
    estado          VARCHAR(20) DEFAULT 'activa'
                    CHECK (estado IN ('activa','pausada','cancelada'))
);

-- Cajas mensuales curadas para suscriptores PanPass
CREATE TABLE cajas_panpass (
    id_caja        SERIAL PRIMARY KEY,
    id_suscripcion INT NOT NULL REFERENCES suscripciones_usuario(id_suscripcion),
    mes_anio       DATE NOT NULL,             -- Primer día del mes: '2025-06-01'
    estado         VARCHAR(20) DEFAULT 'preparando'
                   CHECK (estado IN ('preparando','enviada','entregada')),
    fecha_entrega  DATE
);

CREATE TABLE detalle_caja (
    id_detalle_caja SERIAL PRIMARY KEY,
    id_caja         INT NOT NULL REFERENCES cajas_panpass(id_caja) ON DELETE CASCADE,
    id_producto     INT NOT NULL REFERENCES productos(id_producto),
    cantidad        INT NOT NULL DEFAULT 1
);

-- ============================================================
-- MÓDULO 9: TURNOS ROTATIVOS (24 HORAS)
-- ============================================================

CREATE TABLE turnos (
    id_turno    SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL,          -- 'Mañana', 'Tarde', 'Noche'
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL
);

CREATE TABLE trabajadores (
    id_trabajador  SERIAL PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    apellido       VARCHAR(100) NOT NULL,
    cedula         VARCHAR(15) UNIQUE NOT NULL,
    especialidad   VARCHAR(50) NOT NULL
                   CHECK (especialidad IN ('panadero', 'pastelero', 'ambos')),
    telefono       VARCHAR(20),
    activo         BOOLEAN DEFAULT TRUE,
    fecha_ingreso  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asignacion_turnos (
    id_asignacion  SERIAL PRIMARY KEY,
    id_trabajador  INT NOT NULL REFERENCES trabajadores(id_trabajador) ON DELETE CASCADE,
    id_turno       INT NOT NULL REFERENCES turnos(id_turno),
    fecha          DATE NOT NULL,
    UNIQUE (id_trabajador, fecha)              -- Un trabajador, un turno por día
);

-- ============================================================
-- MÓDULO 2: NOTIFICACIONES Y ALERTAS
-- ============================================================

CREATE TABLE notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL
                    CHECK (tipo IN ('pedido','seguridad','producto','promo','suscripcion')),
    mensaje         TEXT NOT NULL,
    leida           BOOLEAN DEFAULT FALSE,
    fecha           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notificar cuando un producto agotado vuelva a estar disponible
CREATE TABLE alertas_producto (
    id_alerta       SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_producto     INT NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notificado      BOOLEAN DEFAULT FALSE,
    UNIQUE (id_usuario, id_producto)
);
