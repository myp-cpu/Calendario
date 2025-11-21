# Instalación del Backend (FastAPI)

## Requisitos Previos

- **Python 3.10 o superior**
- **MongoDB**: Base de datos local o MongoDB Atlas
- **pip**: Gestor de paquetes de Python
- **Git**: Para clonar el repositorio (opcional)

## Instalación Local

### 1. Clonar o Navegar al Proyecto

```bash
cd Calendar/backend
```

### 2. Crear Entorno Virtual

**Windows**:
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac**:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar Dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta `backend/`:

```bash
# MongoDB Configuration
MONGO_URI="mongodb://localhost:27017/"
DB_NAME="registro_escolar_db"

# JWT Configuration
SECRET_KEY="tu-secret-key-super-segura-cambiar-en-produccion"
ALGORITHM="HS256"

# CORS Configuration
CORS_ORIGINS="*"

# Email Configuration (Opcional - para envío de reportes)
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-app-password"
SMTP_FROM="Registro Escolar Redland <noreply@redland.cl>"

# Environment
ENV="development"  # o "production"
```

### 5. Verificar MongoDB

Asegúrate de que MongoDB esté corriendo:

**Local**:
```bash
# Windows (si MongoDB está instalado como servicio, se inicia automáticamente)
# Linux/Mac
sudo systemctl start mongod
# o
mongod
```

**MongoDB Atlas**:
- Usa la cadena de conexión de Atlas en `MONGO_URI`
- Ejemplo: `mongodb+srv://usuario:password@cluster.mongodb.net/`

### 6. Ejecutar el Servidor

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

El servidor estará disponible en: `http://localhost:8001`

**Nota**: El flag `--host 0.0.0.0` permite que el servidor escuche en todas las interfaces de red, necesario para que el frontend pueda conectarse.

## Instalación en Producción (Render)

### 1. Preparar el Repositorio

Asegúrate de que el código esté en un repositorio Git (GitHub, GitLab, etc.).

### 2. Crear Servicio en Render

1. Ve a https://dashboard.render.com
2. Haz clic en "New +" → "Web Service"
3. Conecta tu repositorio
4. Configura el servicio:
   - **Name**: `registro-escolar-backend` (o el nombre que prefieras)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   
   **Nota sobre el puerto**: Render asigna automáticamente el puerto mediante la variable de entorno `$PORT`. Si tu servicio está en la raíz del repositorio, usa `uvicorn server:app --host 0.0.0.0 --port $PORT`. Si está en una subcarpeta `backend`, usa `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`.
   - **Root Directory**: `backend` (si el backend está en una subcarpeta)

### 3. Configurar Variables de Entorno en Render

En el dashboard de Render, ve a "Environment" y agrega:

```bash
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/registro_escolar_db
DB_NAME=registro_escolar_db
SECRET_KEY=tu-secret-key-super-segura-generar-aleatoria
CORS_ORIGINS=*
ENV=production

# Email (Opcional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=registro@redland.cl
SMTP_PASSWORD=tu-app-password-de-gmail
SMTP_FROM=Registro Escolar Redland <registro@redland.cl>
```

**Importante**: 
- `SECRET_KEY` debe ser una cadena aleatoria y segura (usa un generador)
- `MONGO_URI` debe ser la cadena de conexión completa de MongoDB Atlas
- Render asigna automáticamente el puerto, usa `$PORT` en el comando de inicio

### 4. Desplegar

Render desplegará automáticamente cuando detecte cambios en el repositorio. El servicio estará disponible en:

```
https://tu-servicio.onrender.com
```

## Verificación de la Instalación

### Verificar que el Servidor Está Corriendo

Abre tu navegador o usa curl:

```bash
curl http://localhost:8001/docs
```

Deberías ver la documentación interactiva de FastAPI (Swagger UI).

### Verificar Endpoints

**Health Check** (si está implementado):
```bash
curl http://localhost:8001/health
```

**Documentación de API**:
```
http://localhost:8001/docs
```

## Estructura de Archivos del Backend

```
backend/
├── server.py              # ⭐ Archivo principal - Todas las rutas y lógica
├── requirements.txt        # Dependencias Python
├── .env                   # Variables de entorno (NO subir a Git)
├── utils/                 # Utilidades (vacío actualmente)
│   └── __init__.py
└── venv/                  # Entorno virtual (NO subir a Git)
```

## Endpoints Principales

### Autenticación
- `POST /api/auth/login`: Login con email
- `GET /api/auth/me`: Obtener usuario actual

### Usuarios
- `POST /api/users/upload-csv`: Subir usuarios mediante CSV
- `GET /api/users`: Listar usuarios (solo Editor)
- `POST /api/users`: Crear usuario (solo Editor)
- `PUT /api/users/{user_id}`: Actualizar usuario (solo Editor)
- `DELETE /api/users/{user_id}`: Eliminar usuario (solo Editor)

### Actividades
- `GET /api/activities`: Obtener actividades (filtros opcionales)
- `POST /api/activities`: Crear actividad (solo Editor)
- `PUT /api/activities/{activity_id}`: Actualizar actividad (solo Editor)
- `DELETE /api/activities/{activity_id}`: Eliminar actividad (solo Editor)

### Evaluaciones
- `GET /api/evaluations`: Obtener evaluaciones (filtros opcionales)
- `POST /api/evaluations`: Crear evaluación (solo Editor)
- `PUT /api/evaluations/{evaluation_id}`: Actualizar evaluación (solo Editor)
- `DELETE /api/evaluations/{evaluation_id}`: Eliminar evaluación (solo Editor)

### Reportes
- `POST /api/send-report-email`: Enviar reporte por email

## Solución de Problemas

### Error: "ModuleNotFoundError"

**Solución**: Asegúrate de que el entorno virtual esté activado y las dependencias estén instaladas:
```bash
pip install -r requirements.txt
```

### Error: "Connection refused" (MongoDB)

**Solución**: 
- Verifica que MongoDB esté corriendo
- Verifica la cadena de conexión en `MONGO_URI`
- Para MongoDB Atlas, verifica que la IP esté en la whitelist

### Error: "Port already in use"

**Solución**: 
- Cambia el puerto en el comando: `--port 8002`
- O detén el proceso que está usando el puerto 8001

### Error: CORS en producción

**Solución**: 
- Verifica que `CORS_ORIGINS` esté configurado correctamente
- En producción, puedes especificar orígenes específicos:
  ```
  CORS_ORIGINS=https://tu-frontend.netlify.app,https://otro-dominio.com
  ```

## Logs y Debugging

### En Desarrollo

Los logs aparecen en la consola donde ejecutaste `uvicorn`.

### En Producción (Render)

1. Ve al dashboard de Render
2. Selecciona tu servicio
3. Haz clic en "Logs" para ver los logs en tiempo real

## Actualizar Dependencias

```bash
# Activar entorno virtual
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate     # Windows

# Actualizar requirements.txt
pip freeze > requirements.txt

# O instalar nueva dependencia
pip install nueva-dependencia
pip freeze > requirements.txt
```

## Próximos Pasos

Una vez que el backend esté corriendo:

1. Verifica que responda en `http://localhost:8001/docs`
2. Configura el frontend para apuntar a este backend
3. Consulta `04_Instalacion_Frontend.md` para continuar

---

**¿Necesitas ayuda?** Consulta `02_Estructura_Aplicacion.md` para detalles técnicos o los logs del servidor para errores específicos.
