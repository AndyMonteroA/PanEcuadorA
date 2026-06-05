# 🍞 PanEcuador

**Plataforma digital para la comercialización de productos de panadería y pastelería ecuatorianos con suscripciones y entregas programadas.**

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19 + Vite |
| **Backend** | Node.js + Express |
| **Base de Datos** | PostgreSQL 14+ |
| **Autenticación** | JWT (JSON Web Tokens) |

## Requisitos

- **Node.js** 18+ (instalado: v24)
- **PostgreSQL** 14+
- **npm** 9+

## Instalación

### 1. Base de Datos

```bash
# Crear la base de datos
psql -U postgres -c "CREATE DATABASE panaderia_db;"

# Ejecutar el esquema
psql -U postgres -d panaderia_db -f database/01_schema.sql

# Cargar datos iniciales
psql -U postgres -d panaderia_db -f database/02_seed.sql

# Crear índices
psql -U postgres -d panaderia_db -f database/03_indexes.sql
```

### 2. Backend

```bash
cd panecuador-backend

# Configurar variables de entorno
# Editar el archivo .env con tu contraseña de PostgreSQL

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El backend se ejecuta en `http://localhost:5000`

### 3. Frontend

```bash
cd panecuador-frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend se ejecuta en `http://localhost:5173`

## Estructura del Proyecto

```
P Inteligencia Negocios/
├── database/                    # Scripts SQL (PostgreSQL)
│   ├── 01_schema.sql           # Esquema completo
│   ├── 02_seed.sql             # Datos iniciales
│   └── 03_indexes.sql          # Índices de rendimiento
├── panecuador-backend/          # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/db.js        # Conexión PostgreSQL
│   │   ├── middleware/         # Auth JWT, Error Handler
│   │   ├── routes/             # Endpoints REST
│   │   ├── services/           # Lógica de negocio
│   │   └── app.js             # Servidor principal
│   └── .env                   # Variables de entorno
├── panecuador-frontend/         # Interfaz (React + Vite)
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── context/           # Estado global (Auth, Cart)
│   │   ├── pages/             # Páginas
│   │   ├── services/          # Llamadas API
│   │   └── App.jsx           # Componente raíz
│   └── index.html
└── README.md
```

## Módulos Implementados

1. ✅ **Gestión de Usuario** — Registro, login, perfil, direcciones, métodos de pago
2. ✅ **Seguridad y Alertas** — JWT, notificaciones, alertas de producto
3. ✅ **Catálogo y Búsqueda** — Productos, categorías, filtros, búsqueda full-text
4. ✅ **Carrito y Pedidos** — Carrito persistente, pedidos con estimación de entrega, historial
5. ✅ **Personalización** — Favoritos, historial de búsqueda
6. ✅ **Post Venta** — Reseñas, devoluciones
7. ✅ **Contenido Digital** — Galería de fotos/videos por producto
8. ✅ **Ecosistema PanPass** — Membresías, suscripciones, cajas mensuales

## Consideraciones del Profesor

- ✅ Pedidos con anticipación + estimación de tiempo de entrega
- ✅ Stock fresco de máximo **3 días**
- ✅ 5 productos de panadería + 5 de pastelería
- ✅ Tiempo estimado de elaboración por producto
- ✅ Turnos rotativos 24 horas (3 turnos de 8h)
- ✅ Complejidad: menor tiempo = menos ingredientes
- ✅ Máximo **100 productos** por orden

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Mi perfil |
| GET | `/api/products` | Listar productos |
| GET | `/api/products/featured` | Destacados |
| GET | `/api/products/:id` | Detalle |
| GET | `/api/categories` | Categorías |
| GET/POST | `/api/cart` | Carrito |
| POST | `/api/orders` | Crear pedido |
| GET | `/api/orders` | Historial |
| GET | `/api/subscriptions/plans` | Planes PanPass |
| POST | `/api/subscriptions` | Suscribirse |
| GET | `/api/notifications` | Notificaciones |
| POST | `/api/reviews` | Reseñas |
| POST | `/api/reviews/favorites/:id` | Toggle favorito |

## Hosting (Futuro)

- **Proveedor:** Hostinger VPS
- **Especificaciones:** 2 núcleos, 4 GB RAM
- **OS:** Ubuntu Server
