# Instrucciones Rápidas - Activar Envío de Emails

## ⚠️ ACCIÓN REQUERIDA

El sistema está configurado pero necesita la **App Password de Gmail** para funcionar.

## 🚀 Pasos para Activar (5 minutos)

### 1. Genera tu App Password de Gmail

#### a) Ve a tu cuenta de Google

```
https://myaccount.google.com/security
```

#### b) Activa "Verificación en 2 pasos" (si no está activa)

- Busca la sección "Verificación en 2 pasos"
- Haz clic en "Empezar" o "Activar"
- Sigue los pasos (necesitarás tu teléfono)

#### c) Genera la Contraseña de Aplicación

- Una vez activada la verificación en 2 pasos
- Busca "Contraseñas de aplicaciones" o accede directamente:
  ```
  https://myaccount.google.com/apppasswords
  ```
- Selecciona:
  - **Aplicación**: "Correo" o "Otra (nombre personalizado)" → Escribe: "Registro Escolar"
  - **Dispositivo**: "Otro (nombre personalizado)" → Escribe: "Backend"
- Haz clic en **"Generar"**
- Gmail te mostrará una contraseña de 16 caracteres como:
  ```
  xxxx xxxx xxxx xxxx
  ```
- **¡COPIA ESTA CONTRASEÑA!** (solo se muestra una vez)

### 2. Configura el Sistema

#### Opción A: Editar directamente (Recomendado si tienes acceso)

1. Abre el archivo:
   ```bash
   nano backend/.env
   ```
   O en Windows:
   ```powershell
   notepad backend\.env
   ```

2. Busca esta línea:
   ```
   SMTP_PASSWORD="YOUR_GMAIL_APP_PASSWORD_HERE"
   ```

3. Reemplázala con tu App Password:
   ```
   SMTP_PASSWORD="xxxx xxxx xxxx xxxx"
   ```
   (Puedes dejar o quitar los espacios, ambos funcionan)

4. Guarda el archivo

5. Reinicia el backend:
   ```bash
   # En desarrollo local: Detén y reinicia el servidor
   # En producción: El sistema se reiniciará automáticamente
   ```

#### Opción B: Configurar en Render (Producción)

1. Ve al dashboard de Render: https://dashboard.render.com
2. Selecciona tu servicio backend
3. Ve a "Environment"
4. Busca la variable `SMTP_PASSWORD`
5. Actualiza con tu App Password
6. Guarda los cambios (Render reiniciará automáticamente)

### 3. Verifica que Funciona

1. Abre el sistema web
2. Haz clic en el botón verde **"Imprimir"**
3. Configura tu reporte:
   - Tipo: Actividades o Evaluaciones
   - Sección: Middle o Senior
   - Rango de fechas
4. Ingresa un email de prueba (puede ser el tuyo)
5. Haz clic en **"Enviar por Email"**
6. ¡Deberías recibir el email en segundos!

## 📋 Configuración Actual

```bash
# backend/.env
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="myp@redland.cl"
SMTP_PASSWORD="YOUR_GMAIL_APP_PASSWORD_HERE"  ← CAMBIAR ESTO
SMTP_FROM="Registro Escolar Redland <myp@redland.cl>"
```

## 🐛 Solución de Problemas

### "Invalid credentials" o "Authentication failed"

- ❌ **NO uses tu contraseña normal de Gmail**
- ✅ Debes usar la **App Password de 16 caracteres**
- Verifica que la verificación en 2 pasos esté activa

### "Less secure app"

- Gmail ya no permite "aplicaciones menos seguras"
- **DEBES** usar App Password (no hay otra opción)

### Email no llega

- Revisa la carpeta de **Spam**
- Verifica que myp@redland.cl sea una cuenta válida de Gmail
- Intenta enviar a tu propio email primero para probar

### Contraseña perdida

- No hay problema, genera una nueva App Password
- Las viejas siguen funcionando hasta que las revoques

## 🔒 Seguridad

✅ **Buenas prácticas**:

- La App Password solo sirve para esta aplicación
- Puedes revocarla en cualquier momento sin afectar tu cuenta
- No afecta tu contraseña principal de Gmail
- Si cambias tu contraseña principal, la App Password sigue funcionando

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:

1. Revisa este archivo: `09_Configuracion_Email.md` (más detallado)
2. Consulta `02_Estructura_Aplicacion.md` para detalles técnicos
3. Los logs del backend están disponibles en el dashboard de Render

---

⏱️ **Tiempo estimado**: 5 minutos  
🎯 **Resultado**: Sistema de email completamente funcional

**Una vez configurado, podrás enviar reportes por email directamente desde el sistema!** ✨

