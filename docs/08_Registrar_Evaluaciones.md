# Registrar Evaluaciones

## Descripción

Las evaluaciones representan pruebas, exámenes o evaluaciones académicas asignadas a cursos específicos. A diferencia de las actividades, las evaluaciones **solo están disponibles para Middle y Senior School**. Junior School **no tiene evaluaciones**.

## Requisitos

- Debes tener rol **Editor** para crear, editar o eliminar evaluaciones
- Los usuarios **Viewer** solo pueden ver evaluaciones
- **Junior School no tiene evaluaciones** - El sistema no permite crear evaluaciones para Junior

## Crear una Evaluación

### Campos del Formulario

1. **Sección** (requerido):
   - `Middle`: Solo para Middle School
   - `Senior`: Solo para Senior School
   - `Junior`: **NO DISPONIBLE** - El selector no permite seleccionar Junior para evaluaciones

2. **Asignatura** (requerido):
   - **Para Middle y Senior**: Selector desplegable con asignaturas predefinidas
   - **Opción "Otra"**: Si seleccionas "Otra", aparece un campo de texto para ingresar la asignatura manualmente
   - Las asignaturas están ordenadas alfabéticamente, con "Otra" siempre al final

3. **Asignatura Manual** (condicional):
   - Solo aparece si seleccionas "Otra" en el selector de asignatura
   - Permite ingresar cualquier nombre de asignatura personalizado
   - Ejemplo: "SIMCE", "PSU", "Evaluación Especial"

4. **Tema/Criterio** (opcional):
   - Tema específico de la evaluación
   - Ejemplo: "Álgebra básica", "Fotosíntesis", "Revolución Francesa"

5. **Cursos** (requerido):
   - **Selector múltiple con checkboxes**
   - Puedes seleccionar **máximo 3 cursos** por evaluación
   - Si intentas seleccionar más de 3, el sistema mostrará: "Solo puedes seleccionar hasta 3 cursos por evaluación"
   - Los checkboxes se deshabilitan automáticamente cuando alcanzas el límite de 3

6. **Fecha** (requerido):
   - Fecha de la evaluación
   - Formato: `YYYY-MM-DD`
   - Se selecciona mediante un calendario

7. **Hora** (opcional):
   - Hora de la evaluación
   - Formato: `HH:MM` (ej: `09:30`, `14:00`)
   - Si no se especifica, la evaluación no tiene hora específica

### Asignaturas Disponibles

#### Middle School

Las asignaturas están ordenadas alfabéticamente:

- Artes Visuales
- Biología
- Ciencias Naturales
- Diseño
- Ed. Física y Salud
- English
- Francés
- Individuo y Sociedades
- Lenguaje
- Matemática
- Música
- Química
- Física
- **Otra** (siempre al final)

#### Senior School

Las asignaturas están ordenadas alfabéticamente:

- Artes Visuales
- Biología
- Ciencias para la Ciudadanía
- Diseño
- Ed. Física y Salud
- English
- Filosofía
- Francés
- Gestión Empresarial
- Historia
- Lenguaje
- Matemática
- Música
- Química
- Física
- Taller Lenguaje
- Taller Matemática
- ToK
- **Otra** (siempre al final)

### Cursos Disponibles

#### Middle School

- 5° A, 5° B, 5° AB
- 6° A, 6° B, 6° AB
- 7° A, 7° B, 7° AB
- 8° A, 8° B, 8° AB

#### Senior School

- I EM A, I EM B, I EM AB
- II EM A, II EM B, II EM AB
- III EM A, III EM B, III EM AB
- IV EM A, IV EM B, IV EM AB

### Restricción de Máximo 3 Cursos

**Importante**: El sistema limita a **máximo 3 cursos** por evaluación para evitar problemas de visualización en los reportes PDF.

- Si intentas seleccionar más de 3 cursos, los checkboxes se deshabilitan
- Aparece un mensaje: "Solo puedes seleccionar hasta 3 cursos por evaluación"
- El contador muestra: "3 curso(s) seleccionado(s) (máximo alcanzado)"

## Proceso de Creación

1. **Abre el formulario de evaluaciones**:
   - Haz clic en el botón "Nueva Evaluación" o similar
   - El formulario aparece en la parte superior del calendario

2. **Selecciona la sección**:
   - Solo puedes elegir Middle o Senior
   - Junior no está disponible

3. **Selecciona la asignatura**:
   - Elige una asignatura del selector desplegable
   - Si eliges "Otra", aparece un campo de texto para ingresar el nombre manualmente

4. **Ingresa el tema** (opcional):
   - Completa el tema o criterio de evaluación si es necesario

5. **Selecciona los cursos**:
   - Marca los checkboxes de los cursos (máximo 3)
   - El sistema te avisará si intentas seleccionar más

6. **Selecciona la fecha**:
   - Usa el calendario para elegir la fecha

7. **Ingresa la hora** (opcional):
   - Especifica la hora si es necesario

8. **Envía el formulario**:
   - Haz clic en "Agregar Evaluación" o "Guardar"
   - La evaluación aparecerá inmediatamente en el calendario

## Formateo de Cursos Múltiples

El sistema formatea automáticamente los cursos para mostrar:

### Caso 1: Mismo Nivel con A y B

Si seleccionas ambos cursos del mismo nivel (ej: `6° A` y `6° B`):
- **En el calendario**: Se muestra como `"6° AB"`
- **Internamente**: Se mantiene como array `["6° A", "6° B"]`

### Caso 2: Cursos Distintos

Si seleccionas cursos de diferentes niveles (ej: `6° A`, `7° B`, `8° A`):
- **En el calendario**: Se muestra como `"6° A, 7° B, 8° A"`
- **Internamente**: Se mantiene como array `["6° A", "7° B", "8° A"]`

### Caso 3: Un Solo Curso

Si seleccionas solo un curso (ej: `6° A`):
- **En el calendario**: Se muestra como `"6° A"`
- **Internamente**: Se mantiene como array `["6° A"]`

## Editar una Evaluación

1. **Localiza la evaluación** en el calendario
2. **Haz clic en el botón de editar** (ícono de lápiz)
3. **Modifica los campos** que necesites:
   - Puedes cambiar la asignatura (incluyendo cambiar de "Otra" a una asignatura normal)
   - Puedes agregar o quitar cursos (respetando el límite de 3)
   - Puedes modificar fecha, hora, tema, etc.
4. **Guarda los cambios**

### Restricciones al Editar

- **No puedes cambiar la sección** de una evaluación existente
- **No puedes editar evaluaciones de Junior** (no existen)
- **Debes mantener al menos 1 curso** seleccionado
- **No puedes exceder 3 cursos**

## Eliminar una Evaluación

1. **Localiza la evaluación** en el calendario
2. **Haz clic en el botón de eliminar** (ícono de basura)
3. **Confirma la eliminación**

**⚠️ Advertencia**: La eliminación es permanente y no se puede deshacer.

## Visualización en el Calendario

### Formato de Visualización

Las evaluaciones se muestran en el calendario con:

- **Asignatura**: Nombre de la asignatura (o valor manual si es "Otra")
- **Tema**: Si está especificado, aparece entre paréntesis
- **Cursos**: Formateados según las reglas anteriores
- **Hora**: Si está especificada, aparece al inicio

### Ejemplo Visual

```
09:30 | Matemática (Álgebra básica) - 6° AB
```

O con asignatura "Otra":
```
14:00 | SIMCE - 7° A, 8° B
```

### Renderizado de "Otra"

Cuando una evaluación tiene asignatura "Otra" y se ingresó un valor manual:
- **En el calendario**: Se muestra el valor manual (ej: "SIMCE")
- **NO se muestra "Otra"** - Se reemplaza por el valor manual
- Si no hay valor manual, se muestra "Otra"

## Estructura de Datos

### Modelo en Backend (EvaluationCreate)

```python
{
  "seccion": "Middle",                    # Solo Middle o Senior
  "asignatura": "Matemática",            # O valor manual si es "Otra"
  "tema": "Álgebra básica",              # Opcional
  "cursos": ["6° A", "6° B"],            # Array de máximo 3 cursos
  "fecha": "2026-03-15",                 # YYYY-MM-DD
  "hora": "09:30"                        # Opcional, HH:MM
}
```

### Almacenamiento en MongoDB

```json
{
  "_id": ObjectId("..."),
  "seccion": "Middle",
  "asignatura": "Matemática",
  "tema": "Álgebra básica",
  "cursos": ["6° A", "6° B"],
  "fecha": "2026-03-15",
  "hora": "09:30",
  "created_by": "profesor@redland.cl",
  "created_at": "2026-03-10T10:00:00"
}
```

**Nota**: El backend **siempre** almacena `cursos` como array, nunca como string único.

## Endpoints del Backend

### Crear Evaluación

```
POST /api/evaluations
```

**Autenticación**: Requiere token JWT con rol `editor`

**Request Body**:
```json
{
  "seccion": "Middle",
  "asignatura": "Matemática",
  "tema": "Álgebra básica",
  "cursos": ["6° A", "6° B"],
  "fecha": "2026-03-15",
  "hora": "09:30"
}
```

**Validaciones**:
- `cursos` debe ser un array
- `cursos` debe tener al menos 1 elemento
- `cursos` debe tener máximo 3 elementos
- Todos los elementos de `cursos` deben ser strings
- `seccion` debe ser "Middle" o "Senior" (no "Junior")

**Response**:
```json
{
  "success": true,
  "evaluation": {
    "id": "507f1f77bcf86cd799439011",
    "seccion": "Middle",
    "asignatura": "Matemática",
    "tema": "Álgebra básica",
    "cursos": ["6° A", "6° B"],
    "fecha": "2026-03-15",
    "hora": "09:30"
  }
}
```

### Obtener Evaluaciones

```
GET /api/evaluations?date_from=2026-03-01&date_to=2026-03-31&seccion=Middle
```

**Parámetros opcionales**:
- `date_from`: Fecha de inicio (YYYY-MM-DD)
- `date_to`: Fecha de fin (YYYY-MM-DD)
- `seccion`: Filtrar por sección (Junior/Middle/Senior)

**Response**:
```json
{
  "success": true,
  "evaluations": {
    "2026-03-15": {
      "Middle": [
        {
          "id": "507f1f77bcf86cd799439011",
          "asignatura": "Matemática",
          "tema": "Álgebra básica",
          "cursos": ["6° A", "6° B"],
          "fecha": "2026-03-15",
          "hora": "09:30"
        }
      ]
    }
  }
}
```

### Actualizar Evaluación

```
PUT /api/evaluations/{evaluation_id}
```

**Validaciones**: Igual que crear (máximo 3 cursos, etc.)

### Eliminar Evaluación

```
DELETE /api/evaluations/{evaluation_id}
```

## Filtros en el Calendario

El calendario permite filtrar evaluaciones por:

1. **Sección**: Middle, Senior, o Todas (Junior no muestra evaluaciones)
2. **Curso**: Filtrar por curso específico
3. **Tipo**: Actividades, Evaluaciones, o Ambos

## Notas Importantes

1. **Junior School**: No tiene evaluaciones. El sistema no permite crear, editar ni mostrar evaluaciones para Junior.

2. **Asignatura "Otra"**: Si seleccionas "Otra", debes ingresar el nombre manualmente. Este valor se guarda y se muestra en lugar de "Otra" en el calendario.

3. **Máximo 3 Cursos**: Esta restricción existe para evitar problemas de visualización en los reportes PDF. Si necesitas más cursos, crea múltiples evaluaciones.

4. **Formateo Automático**: El sistema formatea automáticamente los cursos para mostrar "6° AB" cuando hay A y B del mismo nivel. Esto es solo visual - internamente se mantiene como array.

5. **Compatibilidad**: El sistema es compatible con evaluaciones antiguas que usaban `curso` (string) en lugar de `cursos` (array). Se convierten automáticamente.

6. **Ordenamiento**: Las evaluaciones se ordenan automáticamente por nivel de año (5°, 6°, 7°, 8° para Middle; I, II, III, IV para Senior).

---

**¿Necesitas ayuda?** Consulta `02_Estructura_Aplicacion.md` para detalles técnicos o contacta al administrador.

