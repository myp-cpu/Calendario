# Subir Usuarios mediante CSV

## Descripción

El sistema permite cargar usuarios de forma masiva mediante un archivo CSV. **Importante**: El sistema NO requiere contraseñas. Los usuarios se autentican únicamente con su email del dominio `@redland.cl`.

## Estructura del CSV

El archivo CSV debe tener las siguientes columnas:

```csv
email,role
```

### Columnas Requeridas

- **email**: Dirección de correo electrónico del usuario (debe ser `@redland.cl`)
- **role**: Rol del usuario (`editor` o `viewer`)

### Columnas Opcionales (ignoradas)

- `password`: **NO se usa** - El sistema no requiere contraseñas
- `nombre`: Se ignora (no se almacena)
- `grupo`: Se ignora (no se almacena)

## Ejemplo de CSV

```csv
email,role
profesor1@redland.cl,editor
profesor2@redland.cl,editor
coordinador@redland.cl,editor
asistente@redland.cl,viewer
director@redland.cl,editor
```

## Cómo Subir el Archivo

### Requisitos

- Debes tener rol **Editor** para subir usuarios
- El archivo debe ser formato CSV (`.csv`)
- El archivo debe tener al menos las columnas `email` y `role`

### Pasos

1. **Inicia sesión** en el sistema con un usuario Editor
2. **Abre el Panel de Gestión de Usuarios**:
   - Haz clic en el botón "Gestión de Usuarios" en la barra superior
   - O usa el atajo si está disponible
3. **Sube el CSV**:
   - Haz clic en el botón "Subir CSV" o "Cargar Usuarios CSV"
   - Selecciona tu archivo CSV
   - Confirma la carga
4. **Revisa los Resultados**:
   - El sistema mostrará:
     - ✅ Usuarios creados exitosamente
     - 🔄 Usuarios actualizados (si ya existían)
     - ❌ Errores encontrados (si los hay)

## Comportamiento del Sistema

### Usuarios Nuevos

Si el email **no existe** en la base de datos:
- Se crea un nuevo usuario
- Se asigna el rol especificado en el CSV
- Se marca como activo (`is_active: true`)
- Se registra la fecha de creación

### Usuarios Existentes

Si el email **ya existe** en la base de datos:
- Se actualiza el rol del usuario
- Se mantiene el estado activo
- Se registra la fecha de actualización
- **NO se elimina ni modifica** otros datos del usuario

## Validaciones

El sistema valida automáticamente:

1. **Formato de Email**:
   - Debe contener `@`
   - Debe ser del dominio `@redland.cl` (en producción)
   - No puede estar vacío

2. **Rol**:
   - Debe ser exactamente `editor` o `viewer` (case-insensitive)
   - No acepta otros valores

3. **Columnas Requeridas**:
   - El CSV debe tener columna `email`
   - El CSV debe tener columna `role`

## Errores Comunes

### "CSV must have an 'email' column"

**Solución**: Asegúrate de que tu CSV tenga una columna llamada `email` (puede estar en minúsculas o mayúsculas).

### "CSV must have a 'role' column"

**Solución**: Asegúrate de que tu CSV tenga una columna llamada `role`.

### "Not a @redland.cl email"

**Solución**: En producción, todos los emails deben ser del dominio `@redland.cl`. Verifica que todos los emails en tu CSV terminen con `@redland.cl`.

### "Invalid role 'X'. Must be 'editor' or 'viewer'"

**Solución**: Los roles solo pueden ser `editor` o `viewer`. Verifica que no haya espacios extra o caracteres especiales en la columna `role`.

### "Row X: Missing email or role"

**Solución**: Revisa la fila X del CSV. Asegúrate de que tanto el email como el rol estén completos y no estén vacíos.

## Endpoint del Backend

El sistema usa el endpoint:

```
POST /api/users/upload-csv
```

**Autenticación**: Requiere token JWT con rol `editor`

**Request**:
- Content-Type: `multipart/form-data`
- Body: Archivo CSV en campo `file`

**Response**:
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

Si hay errores:
```json
{
  "success": true,
  "message": "Processed 3 user(s) successfully with 2 error(s)",
  "users_added": [...],
  "errors": [
    "Row 5: invalid-email@example.com - Not a @redland.cl email",
    "Row 7: Missing email or role"
  ]
}
```

## Notas Importantes

1. **Sin Contraseñas**: El sistema NO almacena ni requiere contraseñas. La autenticación se basa únicamente en el email.

2. **Dominio @redland.cl**: En producción, solo se aceptan emails del dominio `@redland.cl`. En desarrollo, esta validación puede estar deshabilitada.

3. **Actualización de Roles**: Si subes un CSV con un email que ya existe, el sistema actualizará el rol de ese usuario.

4. **Encoding**: El CSV debe estar en UTF-8 para caracteres especiales.

5. **Tamaño del Archivo**: No hay límite estricto, pero se recomienda archivos menores a 1MB para mejor rendimiento.

## Ejemplo Completo

### Archivo: `usuarios.csv`

```csv
email,role
juan.perez@redland.cl,editor
maria.gonzalez@redland.cl,editor
carlos.rodriguez@redland.cl,viewer
ana.martinez@redland.cl,editor
luis.sanchez@redland.cl,viewer
```

### Resultado Esperado

```
✅ Usuarios procesados exitosamente: 5
✅ Usuarios creados: 5
❌ Errores: 0
```

---

**¿Necesitas ayuda?** Consulta la documentación técnica en `02_Estructura_Aplicacion.md` o contacta al administrador del sistema.

