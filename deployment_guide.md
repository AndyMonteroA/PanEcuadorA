# 🚀 Guía de Despliegue de PanEcuador en VPS (Ubuntu)

Esta guía detalla paso a paso cómo configurar tu servidor VPS recién adquirido en Hostinger e implementar la base de datos PostgreSQL, el backend Node.js y el frontend React.

---

## Paso 1: Conectarse al Servidor por SSH

Desde la terminal de tu computadora (PowerShell en Windows o Terminal en macOS/Linux), ejecuta:

```bash
ssh root@IP_DE_TU_SERVIDOR
```
*(Reemplaza `IP_DE_TU_SERVIDOR` por la dirección IP que te dio Hostinger. Te pedirá la contraseña de root que configuraste al comprarlo)*.

---

## Paso 2: Actualizar el Sistema

Una vez dentro del servidor, ejecuta los siguientes comandos para actualizar la lista de paquetes:

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Paso 3: Instalar Dependencias del Sistema

Instalaremos **Node.js (LTS)**, **Git**, **Nginx** (servidor web) y **PostgreSQL**.

### 1. Instalar Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Verifica la instalación con `node -v` (debería mostrar v20.x.x) y `npm -v`.

### 2. Instalar PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
```

### 3. Instalar Nginx y Git
```bash
sudo apt install nginx git -y
```

---

## Paso 4: Configurar la Base de Datos PostgreSQL

1. Entra a la consola de PostgreSQL:
   ```bash
   sudo -i -u postgres psql
   ```
2. Crea la base de datos y el usuario administrador:
   ```sql
   CREATE DATABASE panaderia_db;
   
   -- Cambia 'tu_contrasena_segura' por una de tu preferencia
   CREATE USER admin_pan with encrypted password 'tu_contrasena_segura';
   
   GRANT ALL PRIVILEGES ON DATABASE panaderia_db TO admin_pan;
   
   -- Salir de psql
   \q
   ```
3. Salir del usuario postgres en la terminal del sistema:
   ```bash
   exit
   ```

---

## Paso 5: Subir el Código al Servidor

La forma más fácil es subir tu código a un repositorio de **GitHub** (público o privado) y clonarlo en el servidor.

1. Navega a la carpeta `/var/www/`:
   ```bash
   cd /var/www
   ```
2. Clona tu repositorio:
   ```bash
   git clone URL_DE_TU_REPOSITORIO panecuador
   ```
3. Entra a la carpeta del proyecto:
   ```bash
   cd panecuador
   ```

---

## Paso 6: Cargar la Base de Datos (SQL)

Ejecutaremos los scripts SQL que ya están creados en tu proyecto para estructurar y poblar la base de datos:

```bash
# Ejecutar esquema
psql -h localhost -U admin_pan -d panaderia_db -f database/01_schema.sql

# Insertar datos de prueba
psql -h localhost -U admin_pan -d panaderia_db -f database/02_seed.sql

# Crear índices de rendimiento
psql -h localhost -U admin_pan -d panaderia_db -f database/03_indexes.sql
```
*(Te pedirá la contraseña que le pusiste al usuario `admin_pan`)*.

---

## Paso 7: Configurar y Levantar el Backend

1. Ve a la carpeta del backend:
   ```bash
   cd /var/www/panecuador/panecuador-backend
   ```
2. Instala las dependencias:
   ```bash
   npm install --production
   ```
3. Crea y edita el archivo de variables de entorno `.env`:
   ```bash
   nano .env
   ```
   Escribe lo siguiente (ajusta los valores):
   ```env
   PORT=5000
   NODE_ENV=production
   DB_USER=admin_pan
   DB_PASSWORD=tu_contrasena_segura
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=panaderia_db
   JWT_SECRET=tu_secreto_super_seguro_jwt
   ```
   *(Presiona `Ctrl + O` luego `Enter` para guardar, y `Ctrl + X` para salir)*.

4. Instala **PM2** de forma global para que el backend corra en segundo plano siempre:
   ```bash
   sudo npm install -g pm2
   ```
5. Inicia el backend con PM2:
   ```bash
   pm2 start src/app.js --name "panecuador-backend"
   ```
6. Configura PM2 para que se inicie automáticamente si el servidor se reinicia:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## Paso 8: Configurar y Compilar el Frontend

1. Ve a la carpeta del frontend:
   ```bash
   cd /var/www/panecuador/panecuador-frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Compila el frontend para producción (esto generará una carpeta `dist` con archivos HTML/JS/CSS optimizados):
   ```bash
   npm run build
   ```

---

## Paso 9: Configurar Nginx para Servir el Frontend y Backend

Nginx se encargará de mostrar la web cuando alguien entre a la IP de tu servidor y redirigirá las peticiones de `/api` hacia el backend de Node.js.

1. Borra la configuración por defecto de Nginx:
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```
2. Crea un archivo de configuración nuevo:
   ```bash
   sudo nano /etc/nginx/sites-available/panecuador
   ```
3. Pega la siguiente configuración:
   ```nginx
   server {
       listen 80;
       server_name IP_DE_TU_SERVIDOR; # Cambia esto por tu IP o tu dominio

       # Frontend (React App)
       location / {
           root /var/www/panecuador/panecuador-frontend/dist;
           index index.html index.htm;
           try_files $uri $uri/ /index.html;
       }

       # Backend API Proxy
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   *(Presiona `Ctrl + O`, `Enter` y `Ctrl + X` para salir)*.

4. Habilita la configuración:
   ```bash
   sudo ln -s /etc/nginx/sites-available/panecuador /etc/nginx/sites-enabled/
   ```
5. Verifica que no haya errores de sintaxis y reinicia Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## ¡Listo! 🎉
Ahora puedes abrir el navegador y entrar a `http://IP_DE_TU_SERVIDOR`. Tu aplicación React cargará el catálogo, y las peticiones de login, carrito y compras irán directamente al backend y a la base de datos PostgreSQL en el mismo servidor.
