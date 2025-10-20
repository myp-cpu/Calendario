# Sistema de Registro Escolar Web

## 📚 Descripción

Sistema completo e independiente para registrar y gestionar actividades y evaluaciones escolares por secciones (Junior, Middle, Senior).

## ✨ Características

### **Autenticación y Gestión de Usuarios**
- Sistema de login con correos @redland.cl
- Dos roles de usuario:
  - **Editor**: Puede agregar, editar y eliminar actividades/evaluaciones
  - **Viewer**: Solo puede visualizar el registro
- Gestión de usuarios mediante CSV

### **Registro de Actividades**
- Agregar actividades por sección (Junior/Middle/Senior)
- Campos: Actividad, Fecha, Hora, Lugar, Responsable
- Soporte para actividades de "TODO EL DÍA" con rango de fechas
- Marcar actividades importantes (aparecen en rojo y negrita)
- Editar y eliminar actividades
- Ordenamiento automático por hora

### **Registro de Evaluaciones**
- Agregar evaluaciones por sección
- Campos: Asignatura, Tema/Criterio, Curso, Fecha
- Cursos específicos por sección:
  - **Middle**: 5°A, 5°B, 6°A, 6°B, 7°A, 7°B, 8°A, 8°B
  - **Senior**: I EM A/B, II EM A/B, III EM A/B, IV EM A/B
  - **Junior**: Junior A, Junior B, Junior AB
- Editar y eliminar evaluaciones

### **Calendario Interactivo**
- Vista de 4 semanas simultáneas
- Navegación entre semanas
- Muestra actividades y evaluaciones organizadas
- Colores distintivos por sección:
  - 🟢 Junior School (verde)
  - 🟡 Middle School (amarillo)
  - 🔴 Senior School (rosado)
- Sábados en morado, domingos en negro
- Año escolar 2026: 23 Feb 2026 - 5 Ene 2027

## 🚀 Inicio Rápido

### **1. Acceso Inicial**

El sistema ya tiene un usuario administrador creado:
- **Email**: `admin@redland.cl`
- **Rol**: Editor

Para iniciar sesión:
1. Abre el sistema en el navegador
2. Ingresa `admin@redland.cl`
3. Click en "Iniciar Sesión"

### **2. Agregar Más Usuarios**

#### **Opción A: Mediante CSV**
1. Inicia sesión como Editor
2. Click en "👥 Gestionar Usuarios"
3. Descarga el ejemplo de CSV
4. Edita el CSV con los usuarios:
   ```csv
   email,role
   juan.perez@redland.cl,editor
   maria.gonzalez@redland.cl,viewer
   ```
5. Sube el archivo CSV
6. Los usuarios podrán iniciar sesión inmediatamente

#### **Formato del CSV**
- **Columnas requeridas**: `email`, `role`
- **Roles permitidos**: `editor` o `viewer`
- **Email**: Solo correos @redland.cl
- **Separador**: Coma (,)

### **3. Usar el Sistema**

#### **Agregar Actividades**
1. Inicia sesión como Editor
2. En "Registro de Actividades":
   - Selecciona la sección
   - Ingresa los detalles
   - Para actividades de varios días: selecciona "TODO EL DÍA" y fecha término
   - Marca "Importante" si es necesario
3. Click en "Agregar Actividad"

#### **Agregar Evaluaciones**
1. En "Registro de Evaluaciones":
   - Selecciona la sección
   - Ingresa asignatura y tema
   - Selecciona el curso correspondiente
   - Ingresa la fecha
2. Click en "Agregar Evaluación"

#### **Editar o Eliminar**
1. Pasa el mouse sobre cualquier actividad/evaluación
2. Aparecerán botones de ✏️ Editar y 🗑️ Eliminar
3. Solo disponible para usuarios Editor

#### **Navegar el Calendario**
- Usa los botones "← 4 Semanas Ant." y "4 Semanas Sig. →"
- El calendario muestra 4 semanas a la vez
- Las actividades se ordenan automáticamente por hora

## 🛠️ Estructura del Proyecto

```
/app/
├── backend/
│   ├── server.py                    # API backend (FastAPI)
│   ├── requirements.txt             # Dependencias Python
│   └── .env                         # Variables de entorno
└── frontend/
    └── src/
        ├── App.js                   # Componente principal
        ├── RegistroEscolarApp.js    # Sistema de Registro Escolar
        ├── AuthContext.js           # Contexto de autenticación
        ├── LoginPage.js             # Página de login
        └── UserManagementPanel.js   # Panel de gestión de usuarios
```

## 🔧 Tecnologías Utilizadas

### **Backend**
- FastAPI (Python)
- MongoDB (Base de datos)
- JWT (Autenticación)
- python-jose (Tokens)
- pandas (Procesamiento CSV)

### **Frontend**
- React 19
- Tailwind CSS
- React Router
- Context API (Estado global)

## 📊 Base de Datos

### **Colecciones MongoDB**
- `users`: Usuarios del sistema
- `registro_activities`: Actividades escolares
- `registro_evaluations`: Evaluaciones

### **Estructura de Usuario**
```json
{
  "email": "usuario@redland.cl",
  "role": "editor",
  "is_active": true,
  "created_at": "2024-10-20T..."
}
```

## 🔐 Seguridad

- Solo correos @redland.cl pueden acceder
- Autenticación mediante JWT tokens
- Tokens permanentes (1 año de duración)
- Roles de usuario (Editor/Viewer)
- Validación de permisos en cada operación

## 📝 Notas Importantes

1. **Primer Uso**: El usuario `admin@redland.cl` ya está creado
2. **Agregar Usuarios**: Solo los Editores pueden agregar nuevos usuarios
3. **Persistencia**: Todos los datos se guardan en MongoDB
4. **Hot Reload**: Los cambios en código se reflejan automáticamente

## 🆘 Soporte

Si tienes problemas:
1. Verifica que los servicios estén corriendo: `sudo supervisorctl status`
2. Revisa los logs: 
   - Backend: `tail -f /var/log/supervisor/backend.err.log`
   - Frontend: `tail -f /var/log/supervisor/frontend.out.log`
3. Reinicia los servicios: `sudo supervisorctl restart all`

## 📅 Calendario Escolar 2026

- **Inicio**: 23 de Febrero 2026 (Lunes - Semana 0)
- **Término**: 5 de Enero 2027
- **Días incluidos**: Lunes a Sábado (Domingo cuando aplique)

---

✅ **Sistema listo para usar!** Inicia sesión con `admin@redland.cl` y comienza a registrar actividades y evaluaciones.
