# Prode Mundial 2026 - Corporate Cup

Aplicación web Full-Stack para gestionar un Prode empresarial del Mundial de Fútbol 2026. Permite a los empleados cargar sus predicciones con contraseña, ver la tabla de posiciones en tiempo real calculada automáticamente y ofrece un panel de administrador para actualizar marcadores oficiales.

## Estructura del Repositorio

El proyecto está organizado en un monorepo:
- `/client`: Aplicación frontend en React 19, Vite, TypeScript y Tailwind CSS v4.
- `/server`: Servidor backend en Node.js, Express y Prisma ORM con PostgreSQL.
- `render.yaml`: Archivo blueprint para desplegar toda la infraestructura en Render de forma automatizada.

---

## Desarrollo Local

### Requisitos Previos
- Node.js (v18+)
- Una base de datos PostgreSQL activa.

### Paso 1: Configurar el Servidor Backend
1. Entrá a la carpeta del servidor:
   ```bash
   cd server
   ```
2. Instalá las dependencias:
   ```bash
   npm install
   ```
3. Creá un archivo `.env` tomando como referencia el `.env` provisto y configurá tu cadena de conexión `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres:contraseña@localhost:5432/prode_mundial?schema=public"
   PORT=3001
   ```
4. Ejecutá la migración inicial de base de datos e insertá los datos iniciales (fixture, usuarios simulados y predicciones iniciales):
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
5. Iniciá el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```

### Paso 2: Configurar el Frontend
1. Entrá a la carpeta del cliente:
   ```bash
   cd ../client
   ```
2. Instalá las dependencias:
   ```bash
   npm install
   ```
3. Iniciá el entorno de desarrollo:
   ```bash
   npm run dev
   ```
4. Abrí tu navegador en `http://localhost:5173`.

---

## Credenciales de Demostración (Locales y Producción)
- **Administrador**: contraseña `admin` (usuario: `admin`).
- **Empleados**: contraseña `1234` (ej. seleccionar a Ramiro Tule, Santiago Pérez, etc. e ingresar la contraseña).
- En el panel de admin podés hacer clic en **"Reiniciar Datos Demo"** para restablecer la base de datos a sus valores iniciales si querés volver a probar el flujo.

---

## Despliegue en Render (onrender.com)

El repositorio incluye un archivo `render.yaml` que configura la base de datos PostgreSQL, el servicio backend y el sitio web estático automáticamente:

1. Subí este repositorio a tu cuenta de GitHub.
2. Ingresá a tu dashboard de **Render** y seleccioná **Blueprints**.
3. Conectá este repositorio. Render leerá el archivo `render.yaml` y creará:
   - Una base de datos PostgreSQL (`prode-db`).
   - El servicio API de Express (`prode-backend`) inyectando automáticamente la URL de la base de datos.
   - El sitio web de React (`prode-frontend`) apuntando automáticamente al backend creado.
4. Para realizar la carga inicial de datos en producción, una vez desplegados los servicios, podés correr la siembra (seeding) ejecutando una consola en el Web Service de Render o de manera automatizada agregando el script `npx prisma db push` antes del build command.
