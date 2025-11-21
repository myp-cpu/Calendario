# Guía de Usuarios y Roles

## Descripción General

El sistema utiliza un modelo de autenticación **sin contraseñas**. Los usuarios se autentican únicamente con su email del dominio `@redland.cl`. El sistema asigna roles que determinan qué acciones puede realizar cada usuario.

## Sistema de Autenticación

### Sin Contraseñas

- **No se almacenan contraseñas** en la base de datos
- **No se requieren contraseñas** para iniciar sesión
- La autenticación se basa únicamente en el **email**
- Solo emails del dominio `@redland.cl` son válidos (en producción)

### Proceso de Login

1. Usuario ingresa su email (ej: `profesor@redland.cl`)
2. El sistema valida que el email sea del dominio `@redland.cl`
3. El sistema busca el usuario en la base de datos
4. Si existe y está activo, se genera un token JWT
5. El token se almacena en `localStorage` del navegador
6. El token tiene validez de **1 año** (365 días)

### Almacenamiento de Tokens

- **Token JWT**: Almacenado en `localStorage` con key `registro_token`
- **Datos de usuario**: Almacenados en `localStorage` con key `registro_user`
- **Verificación automática**: El sistema verifica el token al cargar la aplicación

## Roles del Sistema

### Rol: Viewer (Solo Lectura)

**Permisos**:
- ✅ Ver el calendario completo
- ✅ Ver todas las actividades
- ✅ Ver todas las evaluaciones
- ✅ Filtrar por sección, curso y tipo
- ✅ Generar y ver reportes (solo visualización)
- ✅ Imprimir reportes

**Restricciones**:
- ❌ **NO puede** crear actividades
- ❌ **NO puede** editar actividades
- ❌ **NO puede** eliminar actividades
- ❌ **NO puede** crear evaluaciones
- ❌ **NO puede** editar evaluaciones
- ❌ **NO puede** eliminar evaluaciones
- ❌ **NO puede** subir usuarios mediante CSV
- ❌ **NO puede** acceder al panel de gestión de usuarios
- ❌ **NO puede** crear, editar o eliminar usuarios
- ❌ **NO puede** cambiar roles de otros usuarios

**Uso típico**: Profesores, asistentes o personal que solo necesita consultar el calendario y reportes.

### Rol: Editor (Administración Completa)

**Permisos**:
- ✅ **Todas las funciones de Viewer**, más:
- ✅ Crear actividades
- ✅ Editar actividades
- ✅ Eliminar actividades
- ✅ Crear evaluaciones
- ✅ Editar evaluaciones
- ✅ Eliminar evaluaciones
- ✅ Subir usuarios mediante CSV
- ✅ Acceder al panel de gestión de usuarios
- ✅ Crear usuarios manualmente
- ✅ Editar usuarios existentes
- ✅ Eliminar usuarios
- ✅ Cambiar roles de usuarios (excepto otros editores)
- ✅ Enviar reportes por email

**Restricciones**:
- ❌ **NO puede** cambiar el rol de otro usuario Editor a Viewer
- ❌ **NO puede** eliminar su propio rol de Editor (protección)

**Uso típico**: Coordinadores, directores, administradores que necesitan gestionar el contenido del sistema.

## Estructura de Usuario en la Base de Datos

### Documento de Usuario (MongoDB)

```json
{
  "_id": ObjectId("..."),
  "email": "profesor@redland.cl",
  "role": "editor",  // o "viewer"
  "is_active": true,
  "created_at": "2026-01-15T10:00:00",
  "updated_at": "2026-02-20T14:30:00"
}
```

### Campos

- **email**: Dirección de correo (único, índice)
- **role**: Rol del usuario (`editor` o `viewer`)
- **is_active**: Si el usuario está activo (boolean)
- **created_at**: Fecha de creación (ISO 8601)
- **updated_at**: Fecha de última actualización (ISO 8601)

**Nota**: No hay campo `password` - el sistema no almacena contraseñas.

## Crear y Gestionar Usuarios

### Método 1: Carga Masiva mediante CSV

Ver `06_Subir_Usuarios_CSV.md` para instrucciones detalladas.

**Requisitos**:
- Rol **Editor**
- Archivo CSV con columnas `email` y `role`

### Método 2: Crear Usuario Manualmente

1. Inicia sesión como **Editor**
2. Abre el panel "Gestión de Usuarios"
3. Haz clic en "Crear Usuario" o similar
4. Completa el formulario:
   - Email: `usuario@redland.cl`
   - Rol: `editor` o `viewer`
5. Guarda

### Método 3: Carga Inicial desde CSV (Solo Primera Vez)

El backend tiene un endpoint especial para carga inicial:

```
POST /api/users/load-initial-users
```

**Características**:
- Solo funciona si **no hay usuarios** en la base de datos
- Lee el archivo `usuarios_20_redland.csv` en la raíz del proyecto
- Cualquiera puede llamarlo (sin autenticación) **solo la primera vez**

## Validaciones de Email

### En Producción

- Solo se aceptan emails del dominio `@redland.cl`
- El sistema valida automáticamente el dominio
- Emails de otros dominios son rechazados

### En Desarrollo

- Se aceptan emails de cualquier dominio
- Útil para testing y desarrollo local

## Gestión de Usuarios (Solo Editor)

### Panel de Gestión de Usuarios

Acceso: Botón "Gestión de Usuarios" en la barra superior (solo visible para Editors).

**Funciones disponibles**:

1. **Listar Usuarios**:
   - Ver todos los usuarios del sistema
   - Ver email, rol y estado activo
   - Ver fecha de creación

2. **Crear Usuario**:
   - Formulario para crear usuario manualmente
   - Validación de email `@redland.cl`
   - Selección de rol

3. **Editar Usuario**:
   - Cambiar rol (Viewer ↔ Editor)
   - Activar/desactivar usuario
   - **Restricción**: No puedes cambiar el rol de otro Editor

4. **Eliminar Usuario**:
   - Eliminar usuario permanentemente
   - **Advertencia**: Acción irreversible

5. **Subir CSV**:
   - Carga masiva de usuarios
   - Actualiza roles de usuarios existentes
   - Crea nuevos usuarios

## Endpoints del Backend

### Autenticación

```
POST /api/auth/login
```

**Request**:
```json
{
  "email": "profesor@redland.cl"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "email": "profesor@redland.cl",
    "role": "editor",
    "is_active": true
  }
}
```

### Obtener Usuario Actual

```
GET /api/auth/me
```

**Autenticación**: Requiere token JWT en header `Authorization: Bearer {token}`

**Response**:
```json
{
  "user": {
    "id": "...",
    "email": "profesor@redland.cl",
    "role": "editor",
    "is_active": true
  }
}
```

### Gestión de Usuarios (Solo Editor)

```
GET /api/users              # Listar usuarios
POST /api/users             # Crear usuario
PUT /api/users/{user_id}    # Actualizar usuario
DELETE /api/users/{user_id} # Eliminar usuario
POST /api/users/upload-csv  # Subir CSV
```

## Seguridad

### Protección de Rutas

El frontend usa `ProtectedRoute` para proteger rutas:

- `/login`: Pública (cualquiera puede acceder)
- `/`: Protegida (requiere autenticación)
- `/admin`: Protegida (requiere rol `editor`)

### Validación en Backend

Todos los endpoints (excepto login) requieren:
- Token JWT válido en header `Authorization: Bearer {token}`
- Usuario activo en la base de datos
- Rol apropiado para acciones de escritura (Editor)

### Tokens JWT

- **Algoritmo**: HS256
- **Expiración**: 365 días (1 año)
- **Payload**: `{ "sub": "email", "role": "editor|viewer", "exp": timestamp }`
- **Secret Key**: Configurada en `SECRET_KEY` del backend

## Desactivar Usuario

Un usuario puede ser desactivado (sin eliminarlo):

```json
{
  "email": "profesor@redland.cl",
  "role": "editor",
  "is_active": false  // ← Usuario desactivado
}
```

**Efecto**:
- El usuario **NO puede** iniciar sesión
- El sistema rechaza el login con: "User account is disabled"
- El usuario puede ser reactivado cambiando `is_active` a `true`

## Mejores Prácticas

1. **Asignar Rol Viewer por Defecto**: Solo asigna Editor a usuarios que realmente lo necesiten
2. **Revisar Usuarios Regularmente**: Elimina usuarios que ya no necesiten acceso
3. **Usar CSV para Carga Masiva**: Más eficiente que crear usuarios uno por uno
4. **Validar Emails**: Asegúrate de que los emails sean correctos antes de crear usuarios
5. **No Compartir Tokens**: Los tokens JWT son personales y no deben compartirse

## Ejemplos de Uso

### Escenario 1: Profesor que Solo Consulta

- **Rol**: Viewer
- **Puede**: Ver calendario, actividades, evaluaciones, generar reportes
- **No puede**: Modificar nada

### Escenario 2: Coordinador Académico

- **Rol**: Editor
- **Puede**: Todo lo anterior, más crear/editar actividades y evaluaciones
- **Puede**: Gestionar usuarios, subir CSV
- **No puede**: Cambiar rol de otros coordinadores

### Escenario 3: Director

- **Rol**: Editor
- **Puede**: Acceso completo al sistema
- **Puede**: Gestionar todos los usuarios (excepto cambiar otros editores)

---

**¿Necesitas ayuda?** Consulta `06_Subir_Usuarios_CSV.md` para cargar usuarios masivamente o `02_Estructura_Aplicacion.md` para detalles técnicos.
