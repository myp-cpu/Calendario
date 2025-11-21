# Registrar Actividades

## Descripción

Las actividades representan eventos, actividades académicas o eventos escolares que ocurren en fechas específicas. Pueden ser asignadas a una sección específica (Junior, Middle, Senior) o a todas las secciones simultáneamente.

## Requisitos

- Debes tener rol **Editor** para crear, editar o eliminar actividades
- Los usuarios **Viewer** solo pueden ver actividades

## Crear una Actividad

### Campos del Formulario

1. **Sección** (requerido):
   - `Junior`: Solo para Junior School
   - `Middle`: Solo para Middle School
   - `Senior`: Solo para Senior School
   - `Todos`: Para todas las secciones simultáneamente

2. **Actividad** (requerido):
   - Nombre o descripción de la actividad
   - Ejemplo: "Día del Deporte", "Reunión de Apoderados", "Salida Pedagógica"

3. **Fecha** (requerido):
   - Fecha de inicio de la actividad
   - Formato: `YYYY-MM-DD`
   - Se selecciona mediante un calendario

4. **Fecha Fin** (opcional):
   - Fecha de finalización (para actividades de múltiples días)
   - Si no se especifica, la actividad es de un solo día
   - Formato: `YYYY-MM-DD`

5. **Hora** (requerido):
   - Hora de la actividad
   - Formato: `HH:MM` (ej: `09:30`, `14:00`)
   - Opción especial: `TODO EL DIA` (se muestra como "TODO EL DÍA" en el calendario)

6. **Lugar** (opcional):
   - Ubicación donde se realiza la actividad
   - Ejemplo: "Gimnasio", "Aula 101", "Parque"

7. **Responsable** (opcional):
   - Nombre del profesor o persona responsable
   - Se ingresa manualmente (no hay lista desplegable)

8. **Importante** (opcional):
   - Checkbox para marcar actividades importantes
   - Las actividades importantes se muestran en **negrita y color rojo** en el calendario

9. **Cursos** (opcional):
   - Lista de cursos específicos para la actividad
   - Solo disponible si la sección NO es "Todos"
   - Puedes seleccionar múltiples cursos mediante checkboxes
   - Si no se selecciona ningún curso, la actividad aplica a toda la sección

### Cursos Disponibles por Sección

**Junior**:
- Junior A
- Junior B
- Junior AB

**Middle**:
- 5° A, 5° B, 5° AB
- 6° A, 6° B, 6° AB
- 7° A, 7° B, 7° AB
- 8° A, 8° B, 8° AB

**Senior**:
- I EM A, I EM B, I EM AB
- II EM A, II EM B, II EM AB
- III EM A, III EM B, III EM AB
- IV EM A, IV EM B, IV EM AB

## Proceso de Creación

1. **Abre el formulario de actividades**:
   - Haz clic en el botón "Nueva Actividad" o similar
   - El formulario aparece en la parte superior del calendario

2. **Completa los campos**:
   - Selecciona la sección
   - Ingresa el nombre de la actividad
   - Selecciona la fecha (y fecha fin si aplica)
   - Ingresa la hora
   - Completa los campos opcionales según necesites

3. **Selecciona cursos** (opcional):
   - Si la sección NO es "Todos", aparecerán checkboxes de cursos
   - Selecciona los cursos específicos o déjalo vacío para toda la sección

4. **Marca como importante** (opcional):
   - Activa el checkbox "Importante" si la actividad es prioritaria

5. **Envía el formulario**:
   - Haz clic en "Agregar Actividad" o "Guardar"
   - La actividad aparecerá inmediatamente en el calendario

## Actividades para "Todos"

Cuando seleccionas la sección "Todos":
- La actividad se crea automáticamente para **las tres secciones** (Junior, Middle, Senior)
- El backend crea **3 registros** en la base de datos (uno por sección)
- No puedes seleccionar cursos específicos (se deshabilita el selector)
- En el calendario, aparece en las tres secciones

## Editar una Actividad

1. **Localiza la actividad** en el calendario
2. **Haz clic en el botón de editar** (ícono de lápiz)
3. **Modifica los campos** que necesites
4. **Guarda los cambios**

### Restricciones al Editar

- Si la actividad fue creada con sección "Todos", no puedes cambiar la sección individualmente
- Los cambios se aplican a todas las instancias si fue creada para "Todos"

## Eliminar una Actividad

1. **Localiza la actividad** en el calendario
2. **Haz clic en el botón de eliminar** (ícono de basura)
3. **Confirma la eliminación**

**⚠️ Advertencia**: La eliminación es permanente y no se puede deshacer.

## Visualización en el Calendario

### Formato de Visualización

Las actividades se muestran en el calendario con:

- **Hora**: `HH:MM` o "TODO EL DÍA"
- **Nombre**: Nombre de la actividad
- **Lugar**: Si está especificado, aparece entre paréntesis
- **Responsable**: Si está especificado, aparece al final
- **Cursos**: Si hay cursos específicos, aparecen al inicio

### Actividades Importantes

Las actividades marcadas como "Importante" se muestran:
- En **negrita**
- En **color rojo** (`#C5203A`)
- Con mayor prominencia visual

### Ejemplo Visual

```
09:30 | Día del Deporte (Gimnasio) - Prof. Juan Pérez
```

O si es importante:
```
14:00 | Reunión de Apoderados (Aula 101) - Coordinador
```
*(En negrita y rojo)*

## Estructura de Datos

### Modelo en Backend (ActivityCreate)

```python
{
  "seccion": "Middle",           # Junior, Middle, Senior, o "ALL"
  "actividad": "Día del Deporte",
  "fecha": "2026-03-15",         # YYYY-MM-DD
  "fechaFin": "2026-03-16",      # Opcional, YYYY-MM-DD
  "hora": "09:30",               # HH:MM o "TODO EL DIA"
  "lugar": "Gimnasio",           # Opcional
  "responsable": "Prof. Juan",   # Opcional
  "importante": true,            # Opcional, boolean
  "cursos": ["6° A", "6° B"]     # Opcional, array de strings
}
```

### Almacenamiento en MongoDB

```json
{
  "_id": ObjectId("..."),
  "seccion": "Middle",
  "actividad": "Día del Deporte",
  "fecha": "2026-03-15",
  "fechaFin": "2026-03-16",
  "hora": "09:30",
  "lugar": "Gimnasio",
  "responsable": "Prof. Juan",
  "importante": true,
  "cursos": ["6° A", "6° B"],
  "created_by": "profesor@redland.cl",
  "created_at": "2026-03-10T10:00:00"
}
```

## Endpoints del Backend

### Crear Actividad

```
POST /api/activities
```

**Autenticación**: Requiere token JWT con rol `editor`

**Request Body**:
```json
{
  "seccion": "Middle",
  "actividad": "Día del Deporte",
  "fecha": "2026-03-15",
  "hora": "09:30",
  "lugar": "Gimnasio",
  "responsable": "Prof. Juan",
  "importante": true,
  "cursos": ["6° A", "6° B"]
}
```

**Response**:
```json
{
  "success": true,
  "activity": {
    "id": "507f1f77bcf86cd799439011",
    "seccion": "Middle",
    "actividad": "Día del Deporte",
    "fecha": "2026-03-15",
    "hora": "09:30",
    "lugar": "Gimnasio",
    "responsable": "Prof. Juan",
    "importante": true,
    "cursos": ["6° A", "6° B"]
  }
}
```

### Obtener Actividades

```
GET /api/activities?date_from=2026-03-01&date_to=2026-03-31&seccion=Middle
```

**Parámetros opcionales**:
- `date_from`: Fecha de inicio (YYYY-MM-DD)
- `date_to`: Fecha de fin (YYYY-MM-DD)
- `seccion`: Filtrar por sección (Junior/Middle/Senior)

**Response**:
```json
{
  "success": true,
  "activities": {
    "2026-03-15": {
      "Middle": [
        {
          "id": "507f1f77bcf86cd799439011",
          "actividad": "Día del Deporte",
          "hora": "09:30",
          "lugar": "Gimnasio",
          ...
        }
      ]
    }
  }
}
```

### Actualizar Actividad

```
PUT /api/activities/{activity_id}
```

### Eliminar Actividad

```
DELETE /api/activities/{activity_id}
```

## Filtros en el Calendario

El calendario permite filtrar actividades por:

1. **Sección**: Junior, Middle, Senior, o Todas
2. **Curso**: Filtrar por curso específico (solo si hay cursos asignados)
3. **Tipo**: Actividades, Evaluaciones, o Ambos

## Notas Importantes

1. **Actividades de Múltiples Días**: Usa el campo "Fecha Fin" para actividades que duran varios días. Se mostrará en todas las fechas del rango.

2. **Hora "TODO EL DIA"**: Si seleccionas esta opción, la actividad se mostrará durante todo el día sin hora específica.

3. **Cursos Opcionales**: Si no seleccionas cursos, la actividad aplica a toda la sección. Si seleccionas cursos, solo se muestra para esos cursos específicos.

4. **Actividades Importantes**: Úsalas para destacar eventos críticos como reuniones de apoderados, exámenes importantes, etc.

5. **Sección "Todos"**: Crea la actividad en las tres secciones simultáneamente. Útil para eventos escolares generales.

---

**¿Necesitas ayuda?** Consulta `02_Estructura_Aplicacion.md` para detalles técnicos o contacta al administrador.

