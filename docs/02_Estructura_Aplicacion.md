# Estructura Técnica de la Aplicación - Registro Escolar Web

## 1. Arquitectura General

La aplicación sigue una arquitectura de tres capas:

```
┌─────────────────┐
│   Frontend      │  React 19.0.0 + Tailwind CSS
│   (Puerto 3000) │  Create React App con CRACO
└────────┬────────┘
         │ HTTP/REST API
         │ JWT Authentication
         │ CORS Enabled
         ▼
┌─────────────────┐
│   Backend       │  FastAPI 0.110.1
│   (Puerto 8001) │  Uvicorn ASGI Server
└────────┬────────┘
         │ MongoDB Driver (PyMongo)
         │ Motor (Async)
         ▼
┌─────────────────┐
│   MongoDB       │  Base de datos NoSQL
│   (Puerto 27017)│  Colecciones: users, registro_activities, registro_evaluations
└─────────────────┘
```

### Flujo de Comunicación

1. **Frontend → Backend**: Peticiones HTTP/REST con autenticación JWT en headers
2. **Backend → MongoDB**: Operaciones CRUD mediante PyMongo/Motor
3. **Autenticación**: JWT tokens con expiración de 1 año (365 días)
4. **CORS**: Configurado para permitir todos los orígenes en desarrollo

---

## 2. Mapa Completo de Directorios y Archivos

```
Calendar/
│
├── backend/                          # Backend FastAPI
│   ├── __pycache__/                  # Cache de Python
│   ├── server.py                      # ⭐ ARCHIVO PRINCIPAL - Todas las rutas y lógica
│   ├── requirements.txt              # Dependencias Python
│   ├── utils/                        # Utilidades (vacío actualmente)
│   │   └── __init__.py
│   └── venv/                         # Entorno virtual Python
│
├── frontend/                         # Frontend React
│   ├── build/                        # Build de producción (generado)
│   ├── node_modules/                 # Dependencias npm
│   ├── public/                       # Archivos estáticos públicos
│   │   ├── index.html                # HTML principal
│   │   └── img/                      # Imágenes estáticas
│   │       ├── colegio/
│   │       │   └── colegio_login.png
│   │       ├── formas/
│   │       │   ├── onda_2.png
│   │       │   ├── pie_correo.png
│   │       │   └── pie_correo1.png
│   │       └── logo/
│   │           └── imalogotipo-blanco_sinfondo_2.png
│   │
│   ├── src/                           # ⭐ CÓDIGO FUENTE PRINCIPAL
│   │   ├── App.js                    # Componente raíz y rutas
│   │   ├── App.css                   # Estilos globales
│   │   ├── index.js                  # Punto de entrada React
│   │   ├── index.css                 # Estilos base
│   │   │
│   │   ├── AuthContext.js            # ⭐ Contexto de autenticación
│   │   ├── LoginPage.js              # Página de login
│   │   ├── config.js                 # Configuración (BACKEND_URL)
│   │   │
│   │   ├── components/               # Componentes reutilizables
│   │   │   ├── ProtectedRoute.jsx    # HOC para rutas protegidas
│   │   │   └── ui/                   # Componentes UI (shadcn/ui)
│   │   │       ├── button.jsx
│   │   │       ├── input.jsx
│   │   │       ├── dialog.jsx
│   │   │       ├── calendar.jsx
│   │   │       ├── select.jsx
│   │   │       └── ... (46 componentes totales)
│   │   │
│   │   ├── pages/                    # Páginas principales
│   │   │   └── AdminPage.js          # Página de administración
│   │   │
│   │   ├── services/                 # ⭐ Servicios de API
│   │   │   ├── authService.js        # Autenticación
│   │   │   └── activitiesService.js  # Actividades y evaluaciones
│   │   │
│   │   ├── hooks/                    # Custom hooks
│   │   │   └── use-toast.js          # Hook para notificaciones
│   │   │
│   │   ├── lib/                      # Utilidades
│   │   │   └── utils.js              # Funciones helper (cn, etc.)
│   │   │
│   │   ├── RegistroEscolarApp.js     # ⭐ Componente principal de la app
│   │   ├── UserManagementPanel.js    # Panel de gestión de usuarios
│   │   ├── PrintReportPanel.js       # Panel de generación de reportes
│   │   └── logo/                     # Logo del colegio
│   │
│   ├── plugins/                      # Plugins personalizados
│   │   ├── health-check/             # Health check endpoints
│   │   └── visual-edits/             # Edición visual (opcional)
│   │
│   ├── .env                          # ⭐ Variables de entorno (REACT_APP_BACKEND_URL)
│   ├── package.json                  # Dependencias y scripts
│   ├── package-lock.json             # Lock de dependencias
│   ├── jsconfig.json                 # Configuración de paths (@/*)
│   ├── tailwind.config.js            # Configuración de Tailwind CSS
│   ├── craco.config.js               # Configuración CRACO (override CRA)
│   ├── postcss.config.js             # Configuración PostCSS
│   └── components.json               # Configuración shadcn/ui
│
├── docs/                              # Documentación
│   ├── 01_Introduccion_Proyecto.md
│   ├── 02_Estructura_Aplicacion.md   # Este archivo
│   ├── 03_Instalacion_Backend.md
│   ├── 04_Instalacion_Frontend.md
│   └── 05_Guia_Usuarios_Roles.md
│
└── tests/                             # Tests (estructura básica)
    └── __init__.py
```

---

## 3. Explicación Detallada por Módulo

### 3.1. Frontend - Estructura y Componentes

#### 3.1.1. Punto de Entrada (`src/index.js`)

```javascript
// Renderiza el componente App dentro de React.StrictMode
// Carga estilos globales desde index.css
```

**Función**: Inicializa React y renderiza la aplicación.

#### 3.1.2. Componente Raíz (`src/App.js`)

**Responsabilidades**:
- Configuración de rutas con React Router v7
- Envolver la app con `AuthProvider` para contexto global
- Definir rutas protegidas y públicas

**Rutas definidas**:
- `/login` → `LoginPage` (pública)
- `/admin` → `AdminPage` (protegida, solo `editor`)
- `/` → `RegistroEscolarApp` (protegida, cualquier rol autenticado)
- `*` → Redirige a `/`

**Archivos críticos**: `App.js`, `AuthContext.js`

#### 3.1.3. Contexto de Autenticación (`src/AuthContext.js`)

**Funcionalidad**:
- Maneja estado global de autenticación
- Almacena token JWT en `localStorage` (key: `registro_token`)
- Almacena datos de usuario en `localStorage` (key: `registro_user`)
- Verifica token al montar el componente
- Previene múltiples llamadas de login concurrentes

**Estado expuesto**:
```javascript
{
  user: Object | null,           // Datos del usuario actual
  token: string | null,          // JWT token
  loading: boolean,              // Estado de carga
  login: Function,                // Función de login
  logout: Function,               // Función de logout
  isAuthenticated: boolean,       // Si está autenticado
  role: string | null,            // Rol del usuario (editor/viewer)
  isEditor: boolean,              // true si es editor
  isViewer: boolean               // true si es viewer
}
```

**Flujo de verificación de token**:
1. Al montar, verifica si existe token en `localStorage`
2. Si existe, llama a `/api/auth/me` para validar
3. Si es válido, actualiza estado de usuario
4. Si es inválido, limpia `localStorage` y redirige a login

#### 3.1.4. Página de Login (`src/LoginPage.js`)

**Características**:
- Validación de email: solo acepta `@redland.cl`
- Prevención de doble submit (usando `useRef` y `useState`)
- Diseño visual con fondo azul y foto del colegio
- Redirección automática si ya está autenticado
- Manejo de errores con mensajes claros

**Flujo**:
1. Usuario ingresa email
2. Validación de formato `@redland.cl`
3. Llamada a `login()` del contexto
4. Si éxito, redirige según rol:
   - `editor` → `/admin`
   - `viewer` → `/`
5. Si error, muestra mensaje

#### 3.1.5. Componente Principal (`src/RegistroEscolarApp.js`)

**Responsabilidades**:
- Gestión de estado de actividades y evaluaciones
- Visualización de calendario semanal
- Formularios de creación/edición
- Filtros por sección, curso y tipo
- Modo oscuro/claro con persistencia en `localStorage`
- Integración con paneles modales (usuarios, reportes)

**Estado principal**:
```javascript
{
  activities: Object,              // Agrupadas por fecha y sección
  evaluations: Object,             // Agrupadas por fecha y sección
  currentWeek: number,             // Semana actual (0-52)
  activityForm: Object,            // Formulario de actividad
  evaluationForm: Object,          // Formulario de evaluación
  filterSection: string,          // Filtro: ALL | Junior | Middle | Senior
  filterCourse: string,           // Filtro de curso
  filterType: string,              // ALL | ACTIVITIES | EVALUATIONS
  darkMode: boolean                // Modo oscuro
}
```

**Funciones críticas**:
- `loadActivities()`: Carga actividades desde API
- `loadEvaluations()`: Carga evaluaciones desde API
- `handleCreateActivity()`: Crea nueva actividad
- `handleUpdateActivity()`: Actualiza actividad existente
- `handleDeleteActivity()`: Elimina actividad
- Funciones equivalentes para evaluaciones

**Cálculo de semanas**:
- Año escolar: 23 de febrero 2026 - 5 de enero 2027
- Semana 0 = Lunes 23 de febrero 2026
- Navegación por semanas con botones anterior/siguiente

#### 3.1.6. Panel de Gestión de Usuarios (`src/UserManagementPanel.js`)

**Funcionalidades**:
- Listado de usuarios con roles
- Carga masiva desde CSV
- Eliminación masiva desde CSV
- Edición individual de roles
- Exportación a CSV
- Eliminación individual

**Endpoints utilizados**:
- `GET /api/users` - Listar usuarios
- `POST /api/users/upload-csv` - Cargar CSV
- `POST /api/users/delete-csv` - Eliminar por CSV
- `PATCH /api/users/{email}/role` - Cambiar rol
- `DELETE /api/users/{email}` - Eliminar usuario
- `GET /api/users/export-csv` - Exportar CSV

**Formato CSV esperado**:
```csv
email,role
usuario1@redland.cl,editor
usuario2@redland.cl,viewer
```

#### 3.1.7. Panel de Reportes (`src/PrintReportPanel.js`)

**Funcionalidades**:
- Generación de reportes en PDF (usando jsPDF)
- Filtros: tipo (actividades/evaluaciones/ambos), sección, nivel, rango de fechas
- Exportación a PDF
- Envío por email con PDF adjunto
- Generación de HTML para impresión

**Tipos de reporte**:
- Actividades solamente
- Evaluaciones solamente
- Ambos (actividades + evaluaciones)

**Filtros de nivel**:
- Middle: 5°, 6°, 7°, 8° Básico
- Senior: I, II, III, IV Medio
- Junior: Sin niveles

**Generación de PDF**:
1. Usa jsPDF para crear documento A4
2. Incluye logo del colegio
3. Formato institucional con colores corporativos
4. Tablas con actividades/evaluaciones filtradas
5. Resalta actividades marcadas como "importantes"

**Envío por email**:
1. Genera PDF en el frontend
2. Envía PDF al backend como `FormData`
3. Backend adjunta PDF y envía email con SMTP
4. Email incluye HTML con logo y pie de correo

#### 3.1.8. Servicios de API

##### `src/services/authService.js`

**Funciones**:
- `login({ email })`: Autenticación por email
- `fetchCurrentUser(token)`: Obtiene datos del usuario actual
- `parseJsonOnce(response)`: Parsea JSON evitando doble parseo
- `handleResponse(response)`: Maneja respuestas HTTP y errores

**Manejo de errores**:
- Detecta errores de red (`TypeError` con 'fetch')
- Muestra mensajes descriptivos
- Re-lanza errores de API con detalles

##### `src/services/activitiesService.js`

**Funciones para Actividades**:
- `fetchActivities(token, dateFrom, dateTo, seccion)`: Obtiene actividades filtradas
- `createActivity(token, activity)`: Crea nueva actividad
- `updateActivity(token, activityId, activity)`: Actualiza actividad
- `deleteActivity(token, activityId)`: Elimina actividad

**Funciones para Evaluaciones**:
- `fetchEvaluations(token, dateFrom, dateTo, seccion)`: Obtiene evaluaciones filtradas
- `createEvaluation(token, evaluation)`: Crea nueva evaluación
- `updateEvaluation(token, evaluationId, evaluation)`: Actualiza evaluación
- `deleteEvaluation(token, evaluationId)`: Elimina evaluación

**Formato de datos**:
- Actividades y evaluaciones se agrupan por fecha y sección
- Estructura: `{ "YYYY-MM-DD": { "Junior": [...], "Middle": [...], "Senior": [...] } }`

#### 3.1.9. Componentes UI (shadcn/ui)

**Ubicación**: `src/components/ui/`

**Componentes principales**:
- `button.jsx`: Botones con variantes
- `input.jsx`: Campos de texto
- `dialog.jsx`: Modales
- `calendar.jsx`: Selector de fechas
- `select.jsx`: Selectores dropdown
- `table.jsx`: Tablas
- `toast.jsx`: Notificaciones
- `card.jsx`: Tarjetas
- Y 38 componentes adicionales

**Tecnología**: Basados en Radix UI + Tailwind CSS

#### 3.1.10. Configuración

##### `src/config.js`

**Función**: Resuelve la URL del backend desde variables de entorno.

```javascript
// Lee REACT_APP_BACKEND_URL del archivo .env
// Normaliza la URL (elimina trailing slash)
// Muestra logs de depuración
```

**Variable crítica**: `BACKEND_URL` - Usada en todos los servicios

##### `jsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**Función**: Permite imports con alias `@/` en lugar de rutas relativas.

##### `tailwind.config.js`

**Configuración**:
- Modo oscuro basado en clase
- Colores personalizados (HSL variables)
- Animaciones para accordion
- Plugin `tailwindcss-animate`

##### `craco.config.js`

**Funcionalidades**:
- Override de configuración de Create React App
- Alias `@/` para imports
- Plugins opcionales:
  - Visual edits (si `REACT_APP_ENABLE_VISUAL_EDITS=true`)
  - Health check (si `ENABLE_HEALTH_CHECK=true`)
- Control de hot reload

---

### 3.2. Backend - Estructura y Endpoints

#### 3.2.1. Archivo Principal (`backend/server.py`)

**Líneas totales**: ~1561 líneas

**Estructura**:

1. **Imports y Configuración** (líneas 1-55)
   - FastAPI, CORS, MongoDB, JWT, Email, etc.
   - Carga de variables de entorno
   - Inicialización de app FastAPI
   - Configuración de CORS

2. **Conexión a MongoDB** (líneas 37-47)
   - URI desde `MONGO_URI` o default `mongodb://localhost:27017/`
   - Base de datos: `registro_escolar_db` (configurable)
   - Colecciones:
     - `users`
     - `registro_activities`
     - `registro_evaluations`

3. **Autenticación** (líneas 49-104)
   - Secret key desde `SECRET_KEY`
   - Algoritmo: HS256
   - Expiración: 365 días (1 año)
   - Funciones helper:
     - `create_access_token(data)`: Genera JWT
     - `serialize_user(user)`: Serializa usuario para respuesta
     - `get_current_user(token)`: Valida token y retorna usuario
     - `get_current_admin_user(current_user)`: Valida rol editor
     - `validate_redland_email(email)`: Valida dominio (solo en producción)

4. **Modelos Pydantic** (líneas 106-754)
   - `EmailLoginPayload`: Email para login
   - `ActivityCreate`: Creación de actividad
   - `ActivityUpdate`: Actualización de actividad
   - `EvaluationCreate`: Creación de evaluación
   - `EvaluationUpdate`: Actualización de evaluación
   - `BulkDeleteRequest`: Eliminación masiva

5. **Endpoints de Autenticación** (líneas 113-160)
   - `POST /api/auth/login`: Login por email
   - `GET /api/auth/me`: Obtener usuario actual

6. **Endpoints de Usuarios** (líneas 165-711)
   - `POST /api/users/upload-csv`: Cargar usuarios desde CSV
   - `GET /api/users`: Listar usuarios (solo editor)
   - `DELETE /api/users/{email}`: Eliminar usuario
   - `POST /api/users/delete-csv`: Eliminar usuarios desde CSV
   - `PATCH /api/users/{email}/role`: Cambiar rol
   - `POST /api/users/bulk-delete`: Eliminación masiva
   - `GET /api/users/export-csv`: Exportar usuarios a CSV
   - `POST /api/users/add-admin`: Agregar admin manualmente
   - `POST /api/users/load-initial-users`: Cargar usuarios iniciales desde CSV

7. **Endpoints de Actividades** (líneas 797-1010)
   - `POST /api/activities`: Crear actividad
   - `GET /api/activities`: Listar actividades (filtros: date_from, date_to, seccion)
   - `PUT /api/activities/{activity_id}`: Actualizar actividad
   - `DELETE /api/activities/{activity_id}`: Eliminar actividad

8. **Endpoints de Evaluaciones** (líneas 1010-1193)
   - `POST /api/evaluations`: Crear evaluación
   - `GET /api/evaluations`: Listar evaluaciones (filtros: date_from, date_to, seccion)
   - `PUT /api/evaluations/{evaluation_id}`: Actualizar evaluación
   - `DELETE /api/evaluations/{evaluation_id}`: Eliminar evaluación

9. **Endpoints de Email** (líneas 1194-1410)
   - `POST /api/send-report-email`: Enviar reporte por email
   - `GET /api/test-email`: Probar configuración SMTP

10. **Endpoints de Utilidad** (líneas 1522-1561)
    - `GET /api/`: Health check
    - `GET /api/users/check-status`: Verificar estado de usuarios

#### 3.2.2. Modelos de Datos

##### Usuario (Colección `users`)

```python
{
  "_id": ObjectId,
  "email": str,                    # Email único (lowercase)
  "role": str,                     # "editor" | "viewer"
  "is_active": bool,               # Estado activo/inactivo
  "created_at": str,               # ISO datetime
  "updated_at": str                # ISO datetime (opcional)
}
```

##### Actividad (Colección `registro_activities`)

```python
{
  "_id": ObjectId,
  "seccion": str,                  # "Junior" | "Middle" | "Senior"
  "actividad": str,                # Descripción de la actividad
  "fecha": str,                    # YYYY-MM-DD
  "fechaFin": str | None,          # YYYY-MM-DD (opcional)
  "hora": str,                     # HH:MM
  "lugar": str | None,             # Lugar (opcional)
  "responsable": str | None,       # Responsable (opcional)
  "importante": bool,              # Marca de importancia
  "cursos": List[str] | None,      # Array de cursos (nuevo formato)
  "curso": str | None,             # Curso único (legacy, backward compatibility)
  "created_by": str,               # Email del creador
  "created_at": str,               # ISO datetime
  "updated_at": str | None,        # ISO datetime (opcional)
  "updated_by": str | None         # Email del actualizador (opcional)
}
```

**Nota**: Soporta tanto `cursos` (array) como `curso` (string) para compatibilidad hacia atrás.

##### Evaluación (Colección `registro_evaluations`)

```python
{
  "_id": ObjectId,
  "seccion": str,                  # "Middle" | "Senior" (NO "Junior")
  "asignatura": str,               # Nombre de la asignatura (o valor manual si es "Otra")
  "tema": str | None,              # Tema (opcional)
  "cursos": List[str],            # ⭐ Array de cursos (máximo 3 elementos)
                                   # Ej: ["6° A", "6° B"] o ["7° A", "8° B", "I EM A"]
  "fecha": str,                   # YYYY-MM-DD
  "hora": str | None,             # HH:MM (opcional)
  "created_by": str,              # Email del creador
  "created_at": str,              # ISO datetime
  "updated_at": str | None,       # ISO datetime (opcional)
  "updated_by": str | None        # Email del actualizador (opcional)
}
```

**Características importantes**:
- **`cursos` es siempre un array**: Nunca se almacena como string único
- **Máximo 3 cursos**: Validación en frontend y backend
- **Junior no tiene evaluaciones**: El sistema no permite crear evaluaciones para Junior
- **Asignatura "Otra"**: Si la asignatura es "Otra", el valor real se almacena en `asignatura` (no hay campo separado `asignaturaManual` en MongoDB)

#### 3.2.3. Funciones Helper

##### Serialización

- `serialize_user(user)`: Convierte documento MongoDB a formato JSON
- `serialize_activity(activity)`: Convierte actividad MongoDB a formato frontend
- `serialize_evaluation(evaluation)`: Convierte evaluación MongoDB a formato frontend

**Características**:
- Convierte `ObjectId` a string
- Maneja campos opcionales
- Soporta formatos legacy para backward compatibility

##### Validación

- `validate_redland_email(email)`: 
  - En producción: solo acepta `@redland.cl`
  - En desarrollo: acepta cualquier dominio

#### 3.2.4. Manejo de CSV

**Endpoints que procesan CSV**:
- `POST /api/users/upload-csv`: Carga usuarios
- `POST /api/users/delete-csv`: Elimina usuarios

**Procesamiento**:
1. Lee archivo con múltiples encodings (UTF-8, UTF-8-sig, Latin-1, CP1252)
2. Normaliza nombres de columnas (strip, lowercase)
3. Valida formato (debe tener `email` y `role`)
4. Valida cada fila:
   - Email no vacío y formato válido
   - Rol válido (`editor` o `viewer`)
   - Dominio `@redland.cl` (solo en producción)
5. Retorna lista de usuarios procesados y errores

**Formato CSV esperado**:
```csv
email,role
usuario1@redland.cl,editor
usuario2@redland.cl,viewer
```

#### 3.2.5. Envío de Emails

**Endpoint**: `POST /api/send-report-email`

**Parámetros** (FormData):
- `pdf`: Archivo PDF (generado por frontend)
- `to`: Email destinatario
- `subject`: Asunto del email
- `reportType`: Tipo de reporte
- `section`: Sección
- `nivel`: Nivel
- `dateFrom`: Fecha inicio
- `dateTo`: Fecha fin

**Proceso**:
1. Lee configuración SMTP desde variables de entorno
2. Crea mensaje MIME multipart
3. Adjunta logo del colegio como imagen inline
4. Adjunta pie de correo como imagen inline
5. Adjunta PDF como attachment
6. Envía email con SMTP

**Variables de entorno requeridas**:
- `SMTP_SERVER`: Servidor SMTP (default: smtp.gmail.com)
- `SMTP_PORT`: Puerto SMTP (default: 587)
- `SMTP_USER`: Usuario SMTP
- `SMTP_PASSWORD`: Contraseña SMTP
- `SMTP_FROM`: Email remitente

**HTML del email**:
- Header con logo del colegio
- Título "Reporte Institucional"
- Cuerpo con mensaje profesional
- Pie de correo con imagen

---

## 4. Flujos de Trabajo Detallados

### 4.1. Flujo de Login

```
1. Usuario accede a /login
   ↓
2. LoginPage valida formato email (@redland.cl)
   ↓
3. LoginPage llama a AuthContext.login({ email })
   ↓
4. AuthContext llama a authService.login({ email })
   ↓
5. authService hace POST a /api/auth/login
   ↓
6. Backend valida:
   - Email existe en MongoDB
   - Usuario está activo
   - Dominio válido (solo en producción)
   ↓
7. Backend genera JWT token (expiración 1 año)
   ↓
8. Backend retorna { access_token, token_type, user }
   ↓
9. AuthContext guarda token y user en localStorage
   ↓
10. AuthContext actualiza estado global
    ↓
11. LoginPage redirige según rol:
    - editor → /admin
    - viewer → /
```

**Archivos involucrados**:
- `frontend/src/LoginPage.js`
- `frontend/src/AuthContext.js`
- `frontend/src/services/authService.js`
- `backend/server.py` (líneas 113-151)

### 4.2. Flujo de Carga de Usuarios CSV

```
1. Editor accede a UserManagementPanel
   ↓
2. Editor selecciona archivo CSV
   ↓
3. Frontend crea FormData con archivo
   ↓
4. POST a /api/users/upload-csv con:
   - Headers: Authorization: Bearer {token}
   - Body: FormData con archivo CSV
   ↓
5. Backend valida token (get_current_admin_user)
   ↓
6. Backend lee CSV con múltiples encodings
   ↓
7. Backend valida formato (email, role)
   ↓
8. Backend procesa cada fila:
   - Si usuario existe → actualiza rol
   - Si no existe → crea nuevo usuario
   ↓
9. Backend retorna:
   {
     success: true,
     users_added: [...],
     errors: [...] (si hay)
   }
   ↓
10. Frontend muestra mensaje de éxito/errores
    ↓
11. Frontend recarga lista de usuarios
```

**Archivos involucrados**:
- `frontend/src/UserManagementPanel.js` (líneas 44-100)
- `backend/server.py` (líneas 165-296)

### 4.3. Flujo de Registro de Actividades

```
1. Editor crea actividad en RegistroEscolarApp
   ↓
2. Frontend valida formulario
   ↓
3. Frontend llama a activitiesService.createActivity()
   ↓
4. POST a /api/activities con:
   - Headers: Authorization: Bearer {token}
   - Body: {
       seccion, actividad, fecha, fechaFin,
       hora, lugar, responsable, importante, cursos
     }
   ↓
5. Backend valida token y rol (editor)
   ↓
6. Si seccion == "ALL":
   - Crea 3 actividades (Junior, Middle, Senior)
   - Retorna { success: true, created: 3 }
   Si no:
   - Crea 1 actividad
   - Retorna { success: true, activity: {...} }
   ↓
7. Frontend actualiza estado local
   ↓
8. Frontend recarga actividades desde API
   ↓
9. Frontend actualiza vista del calendario
```

**Archivos involucrados**:
- `frontend/src/RegistroEscolarApp.js`
- `frontend/src/services/activitiesService.js`
- `backend/server.py` (líneas 797-865)

### 4.4. Flujo de Registro de Evaluaciones

```
1. Editor crea evaluación en RegistroEscolarApp
   ↓
2. Frontend valida formulario:
   - Sección NO puede ser "Junior"
   - Debe seleccionar al menos 1 curso
   - Máximo 3 cursos permitidos
   - Si asignatura es "Otra", debe ingresar valor manual
   ↓
3. Frontend prepara datos:
   - Si asignatura === "Otra": usa asignaturaManual
   - cursos: array de cursos seleccionados (máximo 3)
   ↓
4. Frontend llama a activitiesService.createEvaluation()
   ↓
5. POST a /api/evaluations con:
   - Headers: Authorization: Bearer {token}
   - Body: {
       seccion: "Middle" | "Senior",
       asignatura: "Matemática" | asignaturaManual (si es "Otra"),
       tema: "Álgebra básica" | null,
       cursos: ["6° A", "6° B"],  // Array de máximo 3
       fecha: "2026-03-15",
       hora: "09:30" | null
     }
   ↓
6. Backend valida:
   - Token y rol (editor)
   - cursos es array
   - cursos tiene entre 1 y 3 elementos
   - Todos los elementos de cursos son strings
   - seccion es "Middle" o "Senior" (no "Junior")
   ↓
7. Backend crea evaluación en MongoDB con cursos como array
   ↓
8. Backend retorna { success: true, evaluation: {...} }
   ↓
9. Frontend actualiza estado local
   ↓
10. Frontend recarga evaluaciones desde API
    ↓
11. Frontend formatea cursos para mostrar:
    - Si ["6° A", "6° B"] → muestra "6° AB"
    - Si ["6° A", "8° B"] → muestra "6° A, 8° B"
    ↓
12. Frontend actualiza vista del calendario
```

**Archivos involucrados**:
- `frontend/src/RegistroEscolarApp.js` (líneas 624-661, 829-884)
- `frontend/src/services/activitiesService.js` (líneas 162-182)
- `backend/server.py` (líneas 1038-1090)

### 4.5. Flujo de Generación y Envío de Reportes

```
1. Usuario accede a PrintReportPanel
   ↓
2. Usuario selecciona:
   - Tipo: actividades/evaluaciones/ambos
   - Sección: Junior/Middle/Senior/todas
   - Nivel: (si aplica)
   - Rango de fechas
   ↓
3. Frontend filtra datos según criterios
   ↓
4. Frontend genera PDF con jsPDF:
   - Logo del colegio
   - Encabezado institucional
   - Tablas con datos filtrados
   - Formato A4
   ↓
5. Si usuario ingresa email:
   - Frontend crea FormData con PDF
   - POST a /api/send-report-email
   ↓
6. Backend recibe PDF y datos
   ↓
7. Backend crea email MIME multipart:
   - HTML con logo y pie de correo
   - PDF como attachment
   ↓
8. Backend envía email vía SMTP
   ↓
9. Backend retorna { success: true, message: "..." }
   ↓
10. Frontend muestra confirmación
```

**Archivos involucrados**:
- `frontend/src/PrintReportPanel.js`
- `backend/server.py` (líneas 1194-1385)

---

## 5. Tecnologías y Librerías

### 5.1. Frontend

#### Core
- **React 19.0.0**: Framework principal
- **React DOM 19.0.0**: Renderizado
- **React Router DOM 7.5.1**: Enrutamiento

#### Build Tools
- **Create React App 5.0.1**: Scaffolding base
- **CRACO 7.1.0**: Override de configuración CRA
- **Webpack**: Bundler (via CRA)

#### UI Framework
- **Tailwind CSS 3.4.17**: Framework CSS utility-first
- **Tailwind Animate 1.0.7**: Animaciones
- **Radix UI**: Componentes accesibles base
  - @radix-ui/react-dialog
  - @radix-ui/react-select
  - @radix-ui/react-calendar
  - Y 20+ componentes más

#### Formularios
- **React Hook Form 7.56.2**: Manejo de formularios
- **@hookform/resolvers 5.0.1**: Resolvers para validación
- **Zod 3.24.4**: Validación de esquemas

#### Utilidades
- **date-fns 4.1.0**: Manipulación de fechas
- **clsx 2.1.1**: Concatenación de clases
- **tailwind-merge 3.2.0**: Merge de clases Tailwind
- **axios 1.8.4**: Cliente HTTP (no usado actualmente, se usa fetch nativo)

#### PDF y Reportes
- **jsPDF 3.0.4**: Generación de PDFs

#### Notificaciones
- **sonner 2.0.3**: Sistema de toasts

#### Otros
- **lucide-react 0.507.0**: Iconos
- **next-themes 0.4.6**: Manejo de temas (dark mode)
- **react-day-picker 8.10.1**: Selector de fechas
- **react-resizable-panels 3.0.1**: Paneles redimensionables

### 5.2. Backend

#### Framework
- **FastAPI 0.110.1**: Framework web asíncrono
- **Uvicorn 0.25.0**: Servidor ASGI

#### Base de Datos
- **PyMongo 4.5.0**: Driver MongoDB síncrono
- **Motor 3.3.1**: Driver MongoDB asíncrono

#### Autenticación y Seguridad
- **python-jose 3.3.0+**: JWT tokens
- **PyJWT 2.10.1+**: JWT encoding/decoding
- **bcrypt 4.1.3**: Hashing de contraseñas (no usado actualmente)
- **passlib 1.7.4+**: Utilidades de contraseñas
- **cryptography 42.0.8+**: Criptografía

#### Validación
- **Pydantic 2.6.4+**: Validación de datos
- **email-validator 2.2.0+**: Validación de emails

#### Utilidades
- **python-dotenv 1.0.1+**: Variables de entorno
- **pandas 2.2.0+**: Procesamiento de CSV
- **numpy 1.26.0+**: Operaciones numéricas
- **requests 2.31.0+**: Cliente HTTP
- **tzdata 2024.2+**: Zonas horarias

#### Email
- **smtplib**: Biblioteca estándar de Python
- **email.mime**: Biblioteca estándar para MIME

#### Multipart
- **python-multipart 0.0.9+**: Manejo de FormData

---

## 6. Variables de Entorno

### 6.1. Frontend (`.env`)

```bash
# URL del backend (REQUERIDA)
REACT_APP_BACKEND_URL=http://127.0.0.1:8001

# Opcionales (para plugins)
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
DISABLE_HOT_RELOAD=false
```

**Nota**: Todas las variables de entorno del frontend deben comenzar con `REACT_APP_` para ser accesibles en el código.

### 6.2. Backend (`.env`)

```bash
# Base de datos
MONGO_URI=mongodb://localhost:27017/
DB_NAME=registro_escolar_db

# Autenticación
SECRET_KEY=tu-clave-secreta-cambiar-en-produccion
ALGORITHM=HS256

# Email (SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_contraseña_app
SMTP_FROM="Registro Escolar <tu_email@gmail.com>"

# CORS
CORS_ORIGINS=*

# Ambiente
ENV=development  # development | production
```

**Variables críticas**:
- `MONGO_URI`: Conexión a MongoDB (requerida en producción)
- `SECRET_KEY`: Clave para firmar JWT (cambiar en producción)
- `SMTP_*`: Configuración de email (opcional, pero requerida para envío)

---

## 7. Comunicación Frontend-Backend

### 7.1. Protocolo

- **Protocolo**: HTTP/HTTPS
- **Formato**: JSON (request/response)
- **Autenticación**: JWT Bearer Token en header `Authorization`

### 7.2. Headers Estándar

**Request**:
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Response**:
```http
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

### 7.3. Estructura de Respuestas

**Éxito**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:
```json
{
  "detail": "Mensaje de error"
}
```

### 7.4. Endpoints Principales

#### Autenticación
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual

#### Usuarios (solo editor)
- `GET /api/users` - Listar
- `POST /api/users/upload-csv` - Cargar CSV
- `DELETE /api/users/{email}` - Eliminar
- `PATCH /api/users/{email}/role` - Cambiar rol

#### Actividades
- `GET /api/activities?date_from=&date_to=&seccion=` - Listar
- `POST /api/activities` - Crear
- `PUT /api/activities/{id}` - Actualizar
- `DELETE /api/activities/{id}` - Eliminar

#### Evaluaciones
- `GET /api/evaluations?date_from=&date_to=&seccion=` - Listar
- `POST /api/evaluations` - Crear
- `PUT /api/evaluations/{id}` - Actualizar
- `DELETE /api/evaluations/{id}` - Eliminar

#### Email
- `POST /api/send-report-email` - Enviar reporte

### 7.5. Manejo de Errores

**Frontend**:
- `authService.js` y `activitiesService.js` usan `handleResponse()` para parsear errores
- Errores de red se capturan y muestran mensajes descriptivos
- Errores de API se extraen de `response.detail`

**Backend**:
- Usa `HTTPException` de FastAPI para errores HTTP
- Códigos de estado:
  - `200`: Éxito
  - `400`: Bad Request (validación)
  - `401`: Unauthorized (token inválido)
  - `403`: Forbidden (sin permisos)
  - `404`: Not Found
  - `500`: Internal Server Error

### 7.6. CORS

**Configuración actual**:
```python
allow_origins=["*"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

**Nota**: En producción, `allow_origins` debería especificar dominios exactos en lugar de `["*"]`.

---

## 8. Archivos Críticos

### Frontend

1. **`src/App.js`**: Configuración de rutas
2. **`src/AuthContext.js`**: Estado global de autenticación
3. **`src/config.js`**: URL del backend
4. **`src/services/authService.js`**: Llamadas de autenticación
5. **`src/services/activitiesService.js`**: Llamadas de actividades/evaluaciones
6. **`src/RegistroEscolarApp.js`**: Componente principal
7. **`.env`**: Variable `REACT_APP_BACKEND_URL`

### Backend

1. **`server.py`**: Todo el código del backend (1561 líneas)
2. **`.env`**: Variables de entorno (MongoDB, JWT, SMTP)

---

## 9. Consideraciones de Seguridad

### Implementadas

- ✅ Autenticación JWT
- ✅ Validación de roles (editor/viewer)
- ✅ Validación de dominio de email (en producción)
- ✅ Tokens con expiración
- ✅ Protección de rutas en frontend
- ✅ Validación de datos con Pydantic

### Mejoras Recomendadas

- ⚠️ Cambiar `SECRET_KEY` en producción
- ⚠️ Especificar orígenes CORS en producción
- ⚠️ Implementar rate limiting
- ⚠️ Agregar HTTPS en producción
- ⚠️ Implementar logging de seguridad
- ⚠️ Validar tamaño de archivos CSV

---

## 10. Notas de Desarrollo

### Convenciones

- **Frontend**: CamelCase para variables, PascalCase para componentes
- **Backend**: snake_case para variables y funciones
- **Imports**: Usar alias `@/` en frontend
- **Rutas**: Prefijo `/api/` en backend

### Compatibilidad

- **Backward compatibility**: El sistema soporta tanto `curso` (string) como `cursos` (array) en actividades
- **Legacy support**: Soporta campo `hour` además de `hora` en evaluaciones

### Performance

- **Frontend**: Usa `useMemo` y `useCallback` para optimizar renders
- **Backend**: Operaciones asíncronas con FastAPI
- **MongoDB**: Índices recomendados en `email` (users) y `fecha` (activities/evaluations)

---

## 11. Funcionalidades Especiales

### 11.1. Cursos Múltiples en Evaluaciones

#### Restricción de Máximo 3 Cursos

El sistema limita a **máximo 3 cursos** por evaluación para evitar problemas de visualización en los reportes PDF.

**Validación en Frontend**:
- Los checkboxes se deshabilitan automáticamente cuando hay 3 cursos seleccionados
- Mensaje de alerta: "Solo puedes seleccionar hasta 3 cursos por evaluación"
- Contador muestra: "3 curso(s) seleccionado(s) (máximo alcanzado)"

**Validación en Backend**:
```python
if len(evaluation.cursos) > 3:
    raise HTTPException(status_code=400, detail="Maximum 3 courses allowed per evaluation")
```

#### Formateo de Cursos

**En el Calendario** (función `formatCursosForDisplay`):
- **Caso 1**: Mismo nivel con A y B → `["6° A", "6° B"]` se muestra como `"6° AB"`
- **Caso 2**: Cursos distintos → `["6° A", "8° B"]` se muestra como `"6° A, 8° B"`
- **Caso 3**: Un solo curso → `["6° A"]` se muestra como `"6° A"`

**En Reportes PDF/HTML** (función `formatCursosMultiline`):
- Agrupa cursos por nivel
- Cada nivel en una línea separada con `<br>`
- Ejemplo: `["5° A", "5° B", "6° A", "6° B"]` → `"5° AB<br>6° AB"`
- Evita desbordamiento horizontal en las tablas

**Lógica de Agrupación AB**:
```javascript
// Si tiene "6° A" y "6° B" del mismo nivel
if (hasA && hasB && cursosInLevel.length === 2) {
  return "6° AB";  // Se muestra como "6° AB"
}
// Internamente sigue siendo ["6° A", "6° B"]
```

### 11.2. Asignatura "Otra"

#### Funcionamiento

**Selector de Asignaturas**:
- Middle y Senior tienen listas predefinidas de asignaturas
- Las asignaturas están ordenadas alfabéticamente
- "Otra" siempre aparece al final de la lista

**Cuando se Selecciona "Otra"**:
1. Aparece un campo de texto adicional (`asignaturaManual`)
2. El usuario ingresa el nombre de la asignatura personalizada
3. Al guardar, se envía el valor manual al backend (no "Otra")
4. En el calendario, se muestra el valor manual (ej: "SIMCE")

**Estructura en el Formulario**:
```javascript
evaluationForm = {
  asignatura: "Otra",           // Del selector
  asignaturaManual: "SIMCE",    // Valor ingresado manualmente
  // ...
}
```

**Al Enviar al Backend**:
```javascript
const asignaturaFinal = evaluationForm.asignatura === 'Otra' 
  ? (evaluationForm.asignaturaManual || 'Otra')
  : evaluationForm.asignatura;

// Se envía: { asignatura: "SIMCE", ... }
```

**En el Calendario**:
```javascript
// Renderizado
const asignaturaDisplay = evaluation.asignatura === "Otra" 
  ? (evaluation.asignaturaManual || "Otra")
  : evaluation.asignatura;

// Muestra "SIMCE" en lugar de "Otra"
```

#### Asignaturas Predefinidas

**Middle School** (14 asignaturas):
- Artes Visuales, Biología, Ciencias Naturales, Diseño, Ed. Física y Salud, English, Francés, Individuo y Sociedades, Lenguaje, Matemática, Música, Química, Física, **Otra**

**Senior School** (19 asignaturas):
- Artes Visuales, Biología, Ciencias para la Ciudadanía, Diseño, Ed. Física y Salud, English, Filosofía, Francés, Gestión Empresarial, Historia, Lenguaje, Matemática, Música, Química, Física, Taller Lenguaje, Taller Matemática, ToK, **Otra**

### 11.3. Generación de Reportes PDF/HTML

#### Función `formatCursosMultiline`

**Ubicación**: `frontend/src/PrintReportPanel.js` (líneas 55-141)

**Propósito**: Formatea arrays de cursos en múltiples líneas para evitar desbordamiento en PDF.

**Algoritmo**:
1. Normaliza formatos de cursos (ej: "6A" → "6° A")
2. Agrupa cursos por nivel (5°, 6°, 7°, 8° para Middle; I, II, III, IV para Senior)
3. Formatea cada grupo:
   - Si tiene A y B del mismo nivel → "6° AB"
   - Si tiene múltiples cursos → los une con comas
4. Une cada línea con `<br>` para HTML

**Ejemplo**:
```javascript
Input: ["5° A", "5° AB", "5° B", "6° A", "6° AB", "6° B", "7° AB", "8° AB"]
Output: "5° A, 5° AB, 5° B<br>6° A, 6° AB, 6° B<br>7° AB<br>8° AB"
```

**Renderizado en PDF**:
```
5° A, 5° AB, 5° B
6° A, 6° AB, 6° B
7° AB
8° AB
```

#### Estilos CSS para Cursos

**Clase `.course-cell`** (en HTML del reporte):
```css
.course-cell {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  max-width: 120px;
  hyphens: auto;
  line-height: 1.2;
}
```

**Aplicación en `<td>`**:
```html
<td class="course-cell" style="...; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 120px; line-height: 1.2;">
  ${row.curso}  <!-- Contiene <br> tags para saltos de línea -->
</td>
```

**Nota**: El PDF no interpreta CSS `word-wrap` correctamente, por lo que se usa formateo previo con `<br>` tags.

### 11.4. Estructura del Calendario

#### Organización por Semanas

- **Año escolar**: 23 de febrero 2026 - 5 de enero 2027
- **Semana 0**: Lunes 23 de febrero 2026
- **Navegación**: Botones anterior/siguiente para cambiar de semana
- **Vista semanal**: Muestra 7 días (lunes a domingo)

#### Agrupación de Datos

**Estructura en Estado**:
```javascript
activities = {
  "2026-03-15": {
    "Junior": [activity1, activity2, ...],
    "Middle": [activity3, activity4, ...],
    "Senior": [activity5, activity6, ...]
  },
  "2026-03-16": { ... }
}

evaluations = {
  "2026-03-15": {
    "Middle": [evaluation1, evaluation2, ...],
    "Senior": [evaluation3, evaluation4, ...]
    // NO hay "Junior" - Junior no tiene evaluaciones
  },
  "2026-03-16": { ... }
}
```

#### Filtros Disponibles

1. **Por Sección**: ALL, Junior, Middle, Senior
2. **Por Curso**: Filtra por curso específico (ej: "6° A")
3. **Por Tipo**: ALL, ACTIVITIES, EVALUATIONS

**Lógica de Filtrado**:
- `filterByNivel()`: Filtra por nivel de año (5°, 6°, 7°, 8° para Middle; I, II, III, IV para Senior)
- `matchFiltersForEvaluation()`: Verifica si una evaluación coincide con los filtros
- Soporta arrays de cursos: verifica si el curso filtrado está en el array `cursos`

### 11.5. Procesamiento de CSV de Usuarios

#### Formato del CSV

**Columnas Requeridas**:
- `email`: Dirección de correo (debe ser `@redland.cl` en producción)
- `role`: Rol del usuario (`editor` o `viewer`)

**Columnas Ignoradas**:
- `password`: **NO se usa** - El sistema no requiere contraseñas
- `nombre`: Se ignora
- `grupo`: Se ignora

#### Procesamiento en Backend

**Endpoint**: `POST /api/users/upload-csv`

**Proceso**:
1. Lee CSV con múltiples encodings (UTF-8, UTF-8-sig, Latin-1, CP1252)
2. Normaliza nombres de columnas (strip, lowercase)
3. Valida que tenga columnas `email` y `role`
4. Procesa cada fila:
   - Valida email (formato, dominio)
   - Valida rol (`editor` o `viewer`)
   - Si usuario existe → actualiza rol
   - Si no existe → crea nuevo usuario
5. Retorna lista de usuarios procesados y errores

**Ejemplo de Respuesta**:
```json
{
  "success": true,
  "message": "Processed 5 user(s) successfully",
  "users_added": [
    "Added: profesor1@redland.cl → editor",
    "Updated: profesor2@redland.cl → editor",
    "Added: asistente@redland.cl → viewer"
  ],
  "errors": null
}
```

---

**Documento generado**: Diciembre 2026  
**Versión del proyecto**: 1.0  
**Última actualización**: Análisis completo de código fuente actual
