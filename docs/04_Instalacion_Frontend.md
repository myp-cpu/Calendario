# Instalación del Frontend (React)

## Requisitos Previos

- **Node.js 18 o superior**
- **npm** o **yarn** (viene con Node.js)
- **Git**: Para clonar el repositorio (opcional)

## Instalación Local

### 1. Navegar al Proyecto

```bash
cd Calendar/frontend
```

### 2. Instalar Dependencias

```bash
npm install
```

O si usas yarn:
```bash
yarn install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta `frontend/`:

```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Para producción**, usa la URL de tu backend en Render:
```bash
REACT_APP_BACKEND_URL=https://tu-backend.onrender.com
```

**Importante**: 
- El nombre de la variable **DEBE** empezar con `REACT_APP_`
- No uses espacios alrededor del `=`
- No uses comillas (a menos que la URL las requiera)

### 4. Ejecutar en Desarrollo

```bash
npm start
```

O con yarn:
```bash
yarn start
```

El frontend estará disponible en: `http://localhost:3000`

**Nota**: El navegador se abrirá automáticamente. Si no, abre manualmente `http://localhost:3000`.

### 5. Generar Build de Producción

```bash
npm run build
```

O con yarn:
```bash
yarn build
```

Esto creará una carpeta `build/` con los archivos optimizados para producción.

## Instalación en Producción (Netlify)

### 1. Preparar el Repositorio

Asegúrate de que el código esté en un repositorio Git (GitHub, GitLab, etc.).

### 2. Configurar Archivo _redirects

El archivo `frontend/public/_redirects` ya está creado con el contenido:

```
/*    /index.html   200
```

Este archivo es **necesario** para que React Router funcione correctamente en Netlify.

### 3. Crear Sitio en Netlify

1. Ve a https://app.netlify.com
2. Haz clic en "Add new site" → "Import an existing project"
3. Conecta tu repositorio
4. Configura el build:
   - **Base directory**: `frontend` (si el frontend está en una subcarpeta)
   - **Build command**: `npm run build` o `yarn build`
   - **Publish directory**: `frontend/build`

### 4. Configurar Variables de Entorno en Netlify

En el dashboard de Netlify, ve a "Site settings" → "Environment variables" y agrega:

```bash
REACT_APP_BACKEND_URL=https://tu-backend.onrender.com
```

**Importante**: 
- Reemplaza `https://tu-backend.onrender.com` con la URL real de tu backend
- Netlify requiere un nuevo deploy después de agregar variables de entorno

### 5. Desplegar

Netlify desplegará automáticamente cuando detecte cambios en el repositorio. El sitio estará disponible en:

```
https://tu-sitio.netlify.app
```

O puedes configurar un dominio personalizado.

## Verificación de la Instalación

### Verificar que el Frontend Está Corriendo

Abre tu navegador en `http://localhost:3000`. Deberías ver:

1. La página de login
2. El logo de Redland School
3. Un formulario para ingresar email

### Verificar Conexión con Backend

1. Abre la consola del navegador (F12)
2. Intenta iniciar sesión
3. Verifica que no haya errores de conexión
4. Deberías ver logs como: `[Config] Using BACKEND_URL from .env: http://localhost:8001`

## Estructura de Archivos del Frontend

```
frontend/
├── public/
│   ├── index.html           # HTML principal
│   ├── _redirects           # ⭐ Configuración para Netlify (SPA routing)
│   └── img/                 # Imágenes estáticas
│       ├── colegio/
│       ├── formas/
│       └── logo/
├── src/
│   ├── index.js             # Punto de entrada React
│   ├── App.js               # Componente raíz y rutas
│   ├── AuthContext.js       # Contexto de autenticación
│   ├── LoginPage.js         # Página de login
│   ├── config.js            # ⭐ Configuración (BACKEND_URL)
│   ├── RegistroEscolarApp.js # Componente principal
│   ├── UserManagementPanel.js # Panel de usuarios
│   ├── PrintReportPanel.js  # Panel de reportes
│   ├── services/            # Servicios de API
│   │   ├── authService.js
│   │   └── activitiesService.js
│   ├── components/          # Componentes reutilizables
│   │   ├── ProtectedRoute.jsx
│   │   └── ui/             # 46 componentes shadcn/ui
│   └── ...
├── .env                     # ⭐ Variables de entorno (NO subir a Git)
├── package.json            # Dependencias y scripts
├── tailwind.config.js      # Configuración Tailwind
├── craco.config.js         # Configuración CRACO
└── build/                  # Build de producción (generado)
```

## Scripts Disponibles

### Desarrollo

```bash
npm start
```

Inicia el servidor de desarrollo en `http://localhost:3000` con hot-reload.

### Producción

```bash
npm run build
```

Genera una build optimizada en la carpeta `build/`.

### Tests

```bash
npm test
```

Ejecuta los tests (si están configurados).

## Configuración de BACKEND_URL

El frontend usa la variable de entorno `REACT_APP_BACKEND_URL` para conectarse al backend.

### Resolución de BACKEND_URL

El archivo `src/config.js` resuelve la URL del backend:

1. **Prioridad 1**: Variable de entorno `REACT_APP_BACKEND_URL` desde `.env`
2. **Si no existe**: Muestra error en consola

### Verificar Configuración

Abre la consola del navegador (F12) y busca:

```
[Config] Using BACKEND_URL from .env: http://localhost:8001
```

Si ves un error, verifica que:
- El archivo `.env` existe en `frontend/`
- La variable se llama exactamente `REACT_APP_BACKEND_URL`
- Has reiniciado el servidor de desarrollo después de crear/modificar `.env`

## Solución de Problemas

### Error: "Failed to fetch" o "ERR_CONNECTION_REFUSED"

**Causa**: El frontend no puede conectarse al backend.

**Solución**:
1. Verifica que el backend esté corriendo en el puerto correcto
2. Verifica que `REACT_APP_BACKEND_URL` en `.env` sea correcta
3. Reinicia el servidor de desarrollo: `npm start`
4. Verifica que no haya errores de CORS en la consola

### Error: "REACT_APP_BACKEND_URL not set in .env file"

**Causa**: El archivo `.env` no existe o la variable está mal escrita.

**Solución**:
1. Crea el archivo `frontend/.env`
2. Agrega: `REACT_APP_BACKEND_URL=http://localhost:8001`
3. Reinicia el servidor de desarrollo

### Error: "Module not found"

**Causa**: Dependencias no instaladas o incompletas.

**Solución**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3000 is already in use"

**Solución**: 
- Cambia el puerto: `PORT=3001 npm start`
- O detén el proceso que está usando el puerto 3000

### Error: Build falla en Netlify

**Causa**: Varias posibles.

**Solución**:
1. Verifica los logs de build en Netlify
2. Asegúrate de que `_redirects` esté en `frontend/public/`
3. Verifica que `REACT_APP_BACKEND_URL` esté configurada en Netlify
4. Verifica que el "Base directory" sea `frontend` (si aplica)

## Archivo _redirects para Netlify

El archivo `frontend/public/_redirects` es **crítico** para que React Router funcione en Netlify.

**Contenido**:
```
/*    /index.html   200
```

**Propósito**: Redirige todas las rutas a `index.html` para que React Router maneje el routing del lado del cliente.

**Si falta este archivo**: Las rutas como `/login` o `/admin` darán error 404 en Netlify.

## Variables de Entorno en Producción

### Netlify

1. Ve a "Site settings" → "Environment variables"
2. Agrega `REACT_APP_BACKEND_URL` con la URL de tu backend
3. Haz un nuevo deploy

### Otros Proveedores

Configura `REACT_APP_BACKEND_URL` según el método del proveedor:
- **Vercel**: Dashboard → Settings → Environment Variables
- **GitHub Pages**: No soporta variables de entorno (usa valores hardcodeados o configuración en tiempo de build)

## Próximos Pasos

Una vez que el frontend esté corriendo:

1. Verifica que puedas acceder a `http://localhost:3000`
2. Verifica que puedas iniciar sesión (el backend debe estar corriendo)
3. Consulta `05_Guia_Usuarios_Roles.md` para entender los roles
4. Consulta `07_Registrar_Actividades.md` y `08_Registrar_Evaluaciones.md` para usar el sistema

---

**¿Necesitas ayuda?** Consulta `02_Estructura_Aplicacion.md` para detalles técnicos o los logs de la consola del navegador para errores específicos.
