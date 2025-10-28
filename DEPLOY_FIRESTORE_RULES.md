# 🚀 Guía de Despliegue - Reglas de Firestore

## 📋 Prerrequisitos

Antes de desplegar las reglas de seguridad, asegúrate de tener:

1. **Firebase CLI instalado**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Autenticación con Firebase**:
   ```bash
   firebase login
   ```

3. **Proyecto Firebase configurado**:
   ```bash
   firebase use --add
   # Selecciona tu proyecto de Firebase
   ```

## 🔧 Pasos de Despliegue

### 1. **Verificar Configuración**

Asegúrate de que el archivo `firebase.json` incluya la configuración de Firestore:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### 2. **Validar Reglas Localmente**

Antes del despliegue, valida las reglas:

```bash
# Iniciar emulador para pruebas
firebase emulators:start --only firestore

# En otra terminal, ejecutar pruebas
npm test
```

### 3. **Desplegar Solo las Reglas**

```bash
# Desplegar únicamente las reglas de Firestore
firebase deploy --only firestore:rules
```

### 4. **Despliegue Completo (Opcional)**

Si necesitas desplegar todo el proyecto:

```bash
# Desplegar todo el proyecto
firebase deploy
```

## ✅ Verificación Post-Despliegue

### 1. **Verificar en Firebase Console**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** > **Rules**
4. Verifica que las reglas se hayan actualizado

### 2. **Probar Funcionalidad**

Ejecuta las siguientes pruebas básicas:

```bash
# Probar autenticación
curl -X GET "https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default)/documents/users/test" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Debería retornar error 403 sin autenticación válida
```

### 3. **Verificar Logs**

Monitorea los logs en Firebase Console:
- **Firestore** > **Usage** > **Requests**
- Busca errores de permisos o accesos denegados

## 🚨 Solución de Problemas

### Error: "Permission denied"

**Causa**: Las reglas son muy restrictivas o hay un error en la lógica.

**Solución**:
1. Revisar los logs de Firebase Console
2. Verificar que el usuario tenga el rol correcto
3. Comprobar que la función de validación sea correcta

### Error: "Invalid rules"

**Causa**: Sintaxis incorrecta en las reglas.

**Solución**:
1. Verificar sintaxis en el archivo `firestore.rules`
2. Usar el validador de Firebase Console
3. Revisar paréntesis y llaves

### Error: "Function not found"

**Causa**: Referencia a una función que no existe.

**Solución**:
1. Verificar que todas las funciones estén definidas
2. Comprobar nombres de funciones
3. Revisar el orden de definición

## 🔄 Rollback de Reglas

Si necesitas revertir las reglas:

### Opción 1: Desde Firebase Console
1. Ve a **Firestore Database** > **Rules**
2. Haz clic en **History**
3. Selecciona una versión anterior
4. Haz clic en **Publish**

### Opción 2: Desde CLI
```bash
# Restaurar desde backup local
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

## 📊 Monitoreo Continuo

### 1. **Métricas a Monitorear**

- Número de requests denegados
- Tiempo de respuesta de validaciones
- Errores de permisos por usuario/rol

### 2. **Alertas Recomendadas**

Configura alertas para:
- Incremento súbito en requests denegados
- Errores de validación frecuentes
- Intentos de acceso no autorizado

### 3. **Logs de Auditoría**

Revisa regularmente:
```bash
# Ver logs recientes
firebase functions:log --only firestore

# Filtrar por errores
firebase functions:log --only firestore | grep "PERMISSION_DENIED"
```

## 🔐 Mejores Prácticas

### 1. **Antes del Despliegue**
- ✅ Probar en emulador local
- ✅ Revisar todas las validaciones
- ✅ Verificar permisos por rol
- ✅ Hacer backup de reglas actuales

### 2. **Durante el Despliegue**
- ✅ Desplegar en horarios de bajo tráfico
- ✅ Monitorear logs en tiempo real
- ✅ Tener plan de rollback listo

### 3. **Después del Despliegue**
- ✅ Verificar funcionalidad crítica
- ✅ Monitorear métricas por 24h
- ✅ Documentar cambios realizados

## 📞 Contacto y Soporte

En caso de problemas durante el despliegue:

1. **Revisar documentación**: [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
2. **Consultar logs**: Firebase Console > Firestore > Usage
3. **Soporte técnico**: Contactar al equipo de desarrollo

---

**⚠️ Importante**: Siempre prueba las reglas en un entorno de desarrollo antes de desplegar a producción.

**📅 Última actualización**: Enero 2025