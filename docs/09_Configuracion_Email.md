# Configuración de Email para Reportes

## Descripción

El sistema permite enviar reportes de actividades y evaluaciones directamente por email desde el panel de impresión. Los reportes se envían como PDF adjunto con un diseño profesional que incluye el logo del colegio y pie de correo institucional.

## Requisitos

- Backend configurado con credenciales SMTP
- Acceso a una cuenta de email con soporte SMTP
- Rol **Editor** para enviar reportes por email

## Configuración SMTP

### Ubicación del Archivo de Configuración

Las credenciales SMTP se configuran en el archivo `.env` del backend:

```
backend/.env
```

### Variables de Entorno Requeridas

```bash
# Email Configuration
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-app-password"
SMTP_FROM="Registro Escolar Redland <noreply@redland.cl>"
```

### Opción 1: Gmail (Recomendado)

#### Configuración Básica

```bash
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx"  # App Password de 16 caracteres
SMTP_FROM="Registro Escolar Redland <tu-email@gmail.com>"
```

#### Generar App Password de Gmail

**⚠️ IMPORTANTE**: Gmail NO permite usar la contraseña normal. Debes generar una **App Password** (Contraseña de aplicación).

**Pasos**:

1. **Activa la Verificación en 2 Pasos**:
   - Ve a https://myaccount.google.com/security
   - Busca "Verificación en 2 pasos"
   - Actívala si no está activa (necesitarás tu teléfono)

2. **Genera la App Password**:
   - Ve a https://myaccount.google.com/apppasswords
   - O desde Seguridad → Contraseñas de aplicaciones
   - Selecciona:
     - **Aplicación**: "Correo" o "Otra (nombre personalizado)" → "Registro Escolar"
     - **Dispositivo**: "Otro (nombre personalizado)" → "Backend"
   - Haz clic en "Generar"

3. **Copia la Contraseña**:
   - Gmail mostrará una contraseña de 16 caracteres como: `xxxx xxxx xxxx xxxx`
   - **¡Copia esta contraseña!** (solo se muestra una vez)
   - Úsala en `SMTP_PASSWORD` (puedes dejar o quitar los espacios)

#### Ejemplo Completo para Gmail

```bash
# backend/.env
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="myp@redland.cl"
SMTP_PASSWORD="abcd efgh ijkl mnop"
SMTP_FROM="Registro Escolar Redland <myp@redland.cl>"
```

### Opción 2: Office 365 / Outlook

```bash
SMTP_SERVER="smtp.office365.com"
SMTP_PORT="587"
SMTP_USER="tu-email@redland.cl"
SMTP_PASSWORD="tu-contraseña"
SMTP_FROM="Registro Escolar Redland <tu-email@redland.cl>"
```

### Opción 3: Otros Proveedores SMTP

#### SendGrid

```bash
SMTP_SERVER="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="tu-api-key-de-sendgrid"
SMTP_FROM="Registro Escolar Redland <noreply@redland.cl>"
```

#### Mailgun

```bash
SMTP_SERVER="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_USER="postmaster@tu-dominio.mailgun.org"
SMTP_PASSWORD="tu-password-de-mailgun"
SMTP_FROM="Registro Escolar Redland <noreply@redland.cl>"
```

#### AWS SES

Consulta la documentación de AWS SES para obtener las credenciales SMTP específicas de tu región.

## Modo Demo (Sin Configuración)

Si **NO** configuras las credenciales SMTP:

- El sistema funcionará normalmente
- Los reportes se pueden generar e imprimir
- El botón "Enviar por Email" aparecerá pero mostrará un mensaje informativo
- El backend retornará:

```json
{
  "success": true,
  "message": "Email functionality not configured. Please add SMTP credentials to .env file.",
  "demo_mode": true
}
```

## Cómo Usar el Envío por Email

### Desde el Panel de Impresión

1. **Abre el Panel de Impresión**:
   - Haz clic en el botón verde "Imprimir" en la barra superior
   - Se abre un panel lateral con opciones de reporte

2. **Configura tu Reporte**:
   - **Tipo**: Actividades, Evaluaciones, o Ambos
   - **Sección**: Junior, Middle, Senior, o Todas
   - **Nivel**: (solo para Middle/Senior) - Filtro por nivel de año
   - **Rango de Fechas**: Desde y Hasta

3. **Ingresa el Email del Destinatario**:
   - Escribe el email en el campo "Email para enviar reporte"
   - Puede ser cualquier email válido

4. **Envía el Reporte**:
   - Haz clic en el botón verde "Enviar por Email"
   - El sistema generará el PDF y lo enviará automáticamente
   - Verás un mensaje de confirmación

### Proceso Técnico

1. **Frontend genera el PDF**:
   - El frontend usa jsPDF o el motor de impresión del navegador
   - Genera un PDF idéntico al que se imprimiría

2. **Frontend envía PDF al Backend**:
   - Usa `FormData` para enviar el PDF como archivo
   - Incluye metadatos: tipo de reporte, sección, nivel, fechas

3. **Backend procesa el Email**:
   - Lee el PDF recibido
   - Crea un mensaje HTML profesional
   - Adjunta el PDF
   - Incluye logo y pie de correo
   - Envía mediante SMTP

4. **Destinatario recibe el Email**:
   - Email HTML con diseño corporativo
   - PDF adjunto con el reporte completo

## Características del Email Enviado

### Contenido HTML

El email incluye:

- **Header**: Logo del colegio (logo_header.png)
- **Título**: "REDLAND SCHOOL - Registro de Actividades y Evaluaciones"
- **Cuerpo**: Mensaje profesional explicando el reporte adjunto
- **Footer**: Pie de correo institucional (pie_correo1.png)
- **Diseño**: Colores corporativos (#1A2346 azul, #C5203A rojo)

### PDF Adjunto

El PDF adjunto contiene:

- **Mismo diseño** que la versión impresa
- **Logo del colegio** en el header
- **Título del reporte** con sección, nivel y período
- **Tablas formateadas** con actividades/evaluaciones
- **Footer** con fecha y hora de generación

### Nombre del Archivo

El PDF se adjunta con el nombre:

```
Reporte_{Tipo}_{Seccion}_{FechaDesde}_{FechaHasta}.pdf
```

Ejemplo:
```
Reporte_Evaluaciones_Middle_School_2026-03-01_2026-03-31.pdf
```

## Endpoint del Backend

### Enviar Reporte por Email

```
POST /api/send-report-email
```

**Autenticación**: Requiere token JWT (cualquier rol autenticado)

**Content-Type**: `multipart/form-data`

**Form Data**:
- `pdf`: Archivo PDF (generado por el frontend)
- `to`: Email del destinatario
- `subject`: Asunto del email
- `reportType`: Tipo de reporte (actividades/evaluaciones/ambos)
- `section`: Sección (Junior/Middle/Senior/todas)
- `nivel`: Nivel filtrado (opcional)
- `dateFrom`: Fecha de inicio (YYYY-MM-DD)
- `dateTo`: Fecha de fin (YYYY-MM-DD)

**Response (Éxito)**:
```json
{
  "success": true,
  "message": "Email sent successfully to usuario@example.com"
}
```

**Response (Modo Demo)**:
```json
{
  "success": true,
  "message": "Email functionality not configured. Please add SMTP credentials to .env file.",
  "demo_mode": true
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Error sending email: [detalles del error]"
}
```

## Solución de Problemas

### Error: "Authentication failed"

**Causa**: Credenciales SMTP incorrectas

**Solución**:
- Verifica `SMTP_USER` y `SMTP_PASSWORD`
- Para Gmail, asegúrate de usar App Password (no contraseña normal)
- Verifica que la verificación en 2 pasos esté activa en Gmail

### Error: "Connection refused"

**Causa**: Servidor o puerto SMTP incorrecto

**Solución**:
- Verifica `SMTP_SERVER` y `SMTP_PORT`
- Algunos firewalls bloquean el puerto 587
- Intenta puerto 465 (SSL) si 587 falla:
  ```bash
  SMTP_PORT="465"
  ```

### Error: "Email no llega"

**Causa**: Varias posibles

**Solución**:
- Revisa la carpeta de **Spam** del destinatario
- Verifica que `SMTP_FROM` sea un email válido
- Algunos proveedores requieren verificación del dominio
- Verifica que el email del destinatario sea válido

### Error: "PDF file is empty"

**Causa**: El PDF generado por el frontend está vacío

**Solución**:
- Verifica que el reporte tenga datos en el rango de fechas seleccionado
- Intenta generar el reporte manualmente primero (botón "Ver e Imprimir")
- Revisa la consola del navegador para errores de JavaScript

### Error: "Less secure app" (Gmail)

**Causa**: Gmail ya no permite "aplicaciones menos seguras"

**Solución**:
- **DEBES** usar App Password (no hay otra opción)
- No puedes usar tu contraseña normal de Gmail
- Sigue los pasos para generar App Password (ver arriba)

## Reiniciar el Backend Después de Configurar

Después de modificar el archivo `.env`, **debes reiniciar el backend** para que los cambios surtan efecto:

### En Desarrollo Local

```bash
# Detén el servidor (Ctrl+C)
# Vuelve a iniciarlo
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### En Producción (Render)

El backend se reinicia automáticamente cuando detecta cambios en el código. Para cambios en variables de entorno:

1. Ve al dashboard de Render
2. Selecciona tu servicio backend
3. Ve a "Environment"
4. Actualiza las variables de entorno
5. Render reiniciará automáticamente

### En Producción (Servidor con Supervisor)

```bash
sudo supervisorctl restart backend
```

## Seguridad y Buenas Prácticas

### Recomendaciones

1. **Usa App Passwords**: Nunca uses contraseñas principales de email
2. **Email Dedicado**: Considera usar un email dedicado para el sistema
3. **No Compartas Credenciales**: Mantén las credenciales SMTP privadas
4. **Valida Destinatarios**: Siempre verifica que el email del destinatario sea válido
5. **Revisa Logs**: Monitorea los logs del backend para detectar problemas

### Variables de Entorno en Producción

En producción (Render, Heroku, etc.), configura las variables de entorno en el dashboard del proveedor, NO en archivos `.env` que puedan estar en el repositorio.

## Ejemplo de Configuración Completa

```bash
# backend/.env

# MongoDB
MONGO_URI="mongodb+srv://usuario:password@cluster.mongodb.net/registro_escolar_db"
DB_NAME="registro_escolar_db"

# JWT
SECRET_KEY="tu-secret-key-super-segura-cambiar-en-produccion"
CORS_ORIGINS="*"

# Email Configuration
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="registro@redland.cl"
SMTP_PASSWORD="abcd efgh ijkl mnop"  # App Password de Gmail
SMTP_FROM="Registro Escolar Redland <registro@redland.cl>"
```

---

**¿Necesitas ayuda?** Consulta `10_Activar_Email.md` para instrucciones rápidas de activación o `02_Estructura_Aplicacion.md` para detalles técnicos.

