# Introducción al Proyecto – Sistema de Registro Escolar

## Descripción General

El Sistema de Registro Escolar es una plataforma web diseñada para facilitar la organización, registro y visualización de actividades académicas, evaluaciones y reportes dentro de una institución educativa. El sistema está específicamente diseñado para **Redland School** y permite gestionar tres secciones: **Junior School**, **Middle School** y **Senior School**.

## Funciones Principales

### 1. Gestión de Actividades
- Registrar actividades académicas y eventos escolares
- Asignar actividades a secciones específicas o a todas las secciones
- Marcar actividades como "importantes" para destacarlas
- Asignar actividades a cursos específicos (opcional)
- Actividades de un solo día o de múltiples días

### 2. Gestión de Evaluaciones
- Registrar evaluaciones académicas (solo Middle y Senior)
- Seleccionar asignaturas predefinidas o crear asignaturas personalizadas ("Otra")
- Asignar evaluaciones a **máximo 3 cursos** simultáneamente
- Formateo automático de cursos múltiples (ej: "6° A" + "6° B" → "6° AB")
- Junior School **no tiene evaluaciones**

### 3. Calendario Interactivo
- Vista semanal del calendario escolar
- Filtros por sección, curso y tipo (actividades/evaluaciones)
- Visualización diferenciada: actividades en azul, evaluaciones en rojo
- Actividades importantes destacadas en negrita y rojo

### 4. Gestión de Usuarios
- Carga masiva de usuarios mediante archivo CSV
- **Sistema sin contraseñas**: autenticación únicamente por email
- Dos roles: **Viewer** (solo lectura) y **Editor** (administración completa)
- Validación automática de emails del dominio `@redland.cl`

### 5. Generación de Reportes
- Reportes en formato PDF/HTML
- Filtros por tipo, sección, nivel y rango de fechas
- Diseño profesional con logo del colegio
- Formateo inteligente de cursos múltiples en múltiples líneas

### 6. Envío de Reportes por Email
- Envío automático de reportes como PDF adjunto
- Email HTML profesional con diseño corporativo
- Configuración SMTP flexible (Gmail, Office 365, etc.)

## Tecnologías Utilizadas

### Frontend
- **React 19.0.0**: Framework principal
- **Tailwind CSS 3.4.17**: Framework de estilos
- **Create React App con CRACO**: Configuración personalizada
- **React Router v7**: Navegación
- **jsPDF 3.0.4**: Generación de PDFs
- **shadcn/ui**: Componentes UI reutilizables (46 componentes)
- **date-fns 4.1.0**: Manejo de fechas

### Backend
- **FastAPI 0.110.1**: Framework web asíncrono
- **Uvicorn 0.25.0**: Servidor ASGI
- **PyMongo 4.5.0**: Driver de MongoDB
- **Motor 3.3.1**: Driver asíncrono de MongoDB
- **Pydantic 2.6.4**: Validación de datos
- **python-jose**: Manejo de JWT
- **pandas 2.2.0**: Procesamiento de CSV
- **smtplib**: Envío de emails

### Base de Datos
- **MongoDB**: Base de datos NoSQL
- **Colecciones**:
  - `users`: Usuarios del sistema
  - `registro_activities`: Actividades escolares
  - `registro_evaluations`: Evaluaciones académicas

### Infraestructura
- **Render**: Hosting del backend (API)
- **Netlify**: Hosting del frontend (SPA)
- **MongoDB Atlas**: Base de datos en la nube (producción)

## Características Especiales

### Sistema de Autenticación
- **Sin contraseñas**: Autenticación únicamente por email
- **JWT tokens**: Tokens con expiración de 1 año (365 días)
- **Validación de dominio**: Solo emails `@redland.cl` en producción
- **Roles**: Viewer (solo lectura) y Editor (administración)

### Cursos Múltiples
- Las evaluaciones pueden asignarse a **máximo 3 cursos**
- Formateo automático: "6° A" + "6° B" → "6° AB"
- Visualización inteligente en reportes PDF con saltos de línea

### Asignatura "Otra"
- Selector de asignaturas predefinidas para Middle y Senior
- Opción "Otra" permite ingresar asignaturas personalizadas
- El valor manual se muestra en lugar de "Otra" en el calendario

### Actividades para "Todos"
- Opción de crear actividades para las tres secciones simultáneamente
- El backend crea automáticamente 3 registros (uno por sección)
- Útil para eventos escolares generales

## Estructura del Proyecto

```
Calendar/
├── backend/          # API FastAPI
├── frontend/         # Aplicación React
├── docs/            # Documentación completa
└── tests/           # Tests (estructura básica)
```

## Documentación

La documentación completa está disponible en la carpeta `/docs`:

- `01_Introduccion_Proyecto.md`: Este documento
- `02_Estructura_Aplicacion.md`: Arquitectura técnica detallada
- `03_Instalacion_Backend.md`: Guía de instalación del backend
- `04_Instalacion_Frontend.md`: Guía de instalación del frontend
- `05_Guia_Usuarios_Roles.md`: Guía de roles y permisos
- `06_Subir_Usuarios_CSV.md`: Cómo subir usuarios mediante CSV
- `07_Registrar_Actividades.md`: Cómo registrar actividades
- `08_Registrar_Evaluaciones.md`: Cómo registrar evaluaciones
- `09_Configuracion_Email.md`: Configuración de email SMTP
- `10_Activar_Email.md`: Instrucciones rápidas para activar email

## Inicio Rápido

### Acceso Inicial

El sistema requiere que los usuarios sean creados mediante CSV o manualmente por un Editor. No hay un usuario administrador predefinido por defecto.

**Para agregar el primer usuario**:
1. Usa el endpoint `/api/users/load-initial-users` si tienes un CSV en la raíz del proyecto
2. O crea un usuario manualmente en MongoDB
3. O usa el panel de gestión de usuarios una vez que tengas acceso de Editor

### Agregar Usuarios

Ver `06_Subir_Usuarios_CSV.md` para instrucciones detalladas sobre cómo cargar usuarios mediante CSV.

## Requisitos del Sistema

### Para Desarrollo
- **Backend**: Python 3.10+, MongoDB (local o Atlas)
- **Frontend**: Node.js 18+, npm o yarn
- **Navegador**: Chrome, Firefox, Safari o Edge (últimas versiones)

### Para Producción
- **Backend**: Render, Heroku, o servidor con Python 3.10+
- **Frontend**: Netlify, Vercel, o cualquier hosting estático
- **Base de Datos**: MongoDB Atlas (recomendado) o MongoDB local
- **Email**: Cuenta SMTP (Gmail, Office 365, etc.)

## Seguridad

- Autenticación JWT con tokens seguros
- Validación de dominio de email en producción
- CORS configurado para desarrollo y producción
- Variables de entorno para credenciales sensibles
- Sin almacenamiento de contraseñas

## Soporte

Para más información técnica, consulta:
- `02_Estructura_Aplicacion.md`: Documentación técnica completa
- Código fuente: Comentarios en el código para referencia

---

**Versión**: 1.0  
**Última actualización**: 2026  
**Desarrollado para**: Redland School
