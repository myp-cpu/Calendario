# Configuración de Email para Reportes

## 📧 Envío de Reportes por Email

El sistema ahora permite enviar reportes de actividades y evaluaciones directamente por email desde el panel de impresión.

## ⚙️ Configuración SMTP

Para habilitar el envío de emails, necesitas configurar las credenciales SMTP en el archivo `/app/backend/.env`:

### Opción 1: Usar Gmail

```bash
# Email Configuration
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASSWORD="tu-app-password"
SMTP_FROM="noreply@redland.cl"
```

**Importante para Gmail:**
- No uses tu contraseña normal de Gmail
- Debes generar una **"App Password"** (Contraseña de aplicación):
  1. Ve a https://myaccount.google.com/security
  2. Activa "Verificación en 2 pasos" si no está activa
  3. Ve a "Contraseñas de aplicaciones"
  4. Genera una nueva contraseña para "Mail"
  5. Usa esa contraseña en `SMTP_PASSWORD`

### Opción 2: Usar Office 365 / Outlook

```bash
# Email Configuration
SMTP_SERVER="smtp.office365.com"
SMTP_PORT="587"
SMTP_USER="tu-email@redland.cl"
SMTP_PASSWORD="tu-contraseña"
SMTP_FROM="noreply@redland.cl"
```

### Opción 3: Otros proveedores SMTP

Configura según tu proveedor:
- **SendGrid**: smtp.sendgrid.net (puerto 587)
- **Mailgun**: smtp.mailgun.org (puerto 587)
- **AWS SES**: Consulta AWS documentation

## 🚀 Cómo Usar

### Sin Configuración SMTP
- El sistema funcionará en **modo demo**
- Los reportes se pueden generar e imprimir normalmente
- El botón "Enviar por Email" aparecerá pero mostrará mensaje informativo

### Con Configuración SMTP

1. **Abre el Panel de Impresión** (botón verde "Imprimir")
2. **Configura tu reporte:**
   - Tipo: Actividades o Evaluaciones
   - Sección: Junior / Middle / Senior
   - Nivel: (solo para Middle/Senior) - filtro por nivel de año
   - Rango de fechas
3. **Opcional - Ingresa email:** 
   - Escribe el email del destinatario
   - Aparecerá botón verde "Enviar por Email"
4. **Envía:**
   - Click en "Enviar por Email" → Se envía automáticamente
   - O click en "Ver e Imprimir" → Abre ventana de impresión

## 📋 Características del Email

El email enviado incluye:
- ✅ HTML formateado y profesional
- ✅ Mismo diseño que la versión impresa
- ✅ Título con sección, nivel y período
- ✅ Actividades ordenadas por hora
- ✅ Evaluaciones ordenadas por nivel de año
- ✅ Colores distintivos por sección
- ✅ Footer con fecha de generación

## 🔒 Seguridad

**Recomendaciones:**
- Usa contraseñas de aplicación, no contraseñas reales
- Considera usar un email dedicado para el sistema
- No compartas las credenciales SMTP
- Valida siempre los destinatarios antes de enviar

## 🐛 Solución de Problemas

### Error: "Authentication failed"
- Verifica usuario y contraseña SMTP
- Para Gmail, usa App Password
- Verifica que la verificación en 2 pasos esté activa

### Error: "Connection refused"
- Verifica el servidor y puerto SMTP
- Algunos firewalls bloquean puerto 587
- Intenta puerto 465 (SSL) si 587 falla

### Email no llega
- Revisa carpeta de Spam
- Verifica que SMTP_FROM sea un email válido
- Algunos proveedores requieren verificación del dominio

## 📝 Ejemplo de Configuración Completa

```bash
# /app/backend/.env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="registro_escolar_db"
CORS_ORIGINS="*"
SECRET_KEY="registro-escolar-secret-key-change-in-production-2024"

# Email Configuration
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="registro@redland.cl"
SMTP_PASSWORD="abcd efgh ijkl mnop"  # App Password de Gmail
SMTP_FROM="noreply@redland.cl"
```

Después de modificar el `.env`, reinicia el backend:
```bash
sudo supervisorctl restart backend
```

---

✅ **Sistema listo!** Una vez configurado, podrás enviar reportes directamente por email.
