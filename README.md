# Catálogo de narguile — tienda + panel admin
Catálogo público con carrito y pedido por WhatsApp, más panel `/admin` protegido para gestionar productos, categorías, imágenes y configuración. Todo (productos, precios, categorías, WhatsApp, textos) vive en la base de datos.

## Tecnologías
React + Vite · Node + Express · PostgreSQL · JWT en cookie httpOnly + bcrypt · **Supabase** (Postgres + Storage en un solo servicio gratuito; elegido por simplicidad y costo).

## Instalación
1. Creá un proyecto en Supabase. En *Storage* creá un bucket **público** llamado `images`.
2. `cd server && cp .env.example .env` y completá las variables (ver abajo). `npm install`.
3. `npm run init` (crea tablas) · `npm run admin` (crea/actualiza el admin con ADMIN_EMAIL/ADMIN_PASSWORD) · opcional `npm run demo` (datos de prueba marcados `[PRUEBA]`; se borran con `npm run clean` o desde la API `DELETE /api/admin/test-data`).
4. `cd ../client && npm install`.

## Variables de entorno (`server/.env`)
`DATABASE_URL`, `DATABASE_SSL` (true en Supabase), `JWT_SECRET` (24+ caracteres), `STORAGE_URL`, `STORAGE_KEY` (service_role, solo en backend), `STORAGE_BUCKET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT`. Nunca subas `.env`.

## Ejecución local
Terminal 1: `cd server && npm run dev` · Terminal 2: `cd client && npm run dev` → http://localhost:5173 (admin en `/admin`).

## Deploy
`cd client && npm run build`; luego `cd server && npm start` sirve API + front desde un solo servicio (Render, Railway, Fly). Definí las variables de entorno en la plataforma y `NODE_ENV=production` (cookie `secure`, requiere HTTPS).

## Uso del panel
- **Agregar producto:** Productos → *+ Nuevo producto* → completar, subir imagen → CREAR PRODUCTO.
- **Editar precios / cambiar imagen:** Productos → Editar → cambiar precio o *Cambiar imagen* → GUARDAR (la imagen anterior se borra del storage).
- **Agotado:** switch en la lista de productos.
- **Cambiar WhatsApp:** Configuración → número con código de país, solo dígitos (ej. 598xxxxxxxx).
- **Categorías:** Categorías → crear, editar, ordenar (↑↓), activar/desactivar. Una categoría con productos no se puede eliminar (devuelve aviso); desactivala o mové sus productos.
