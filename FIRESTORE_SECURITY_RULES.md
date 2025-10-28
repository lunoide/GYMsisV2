# Documentación de Reglas de Seguridad de Firestore

## 📋 Resumen General

Este documento describe las reglas de seguridad implementadas para Firebase Firestore en el sistema de gestión de gimnasio. Las reglas están diseñadas para proteger los datos sensibles y garantizar que solo los usuarios autorizados puedan acceder y modificar la información.

## 🔐 Principios de Seguridad Implementados

### 1. **Autenticación Obligatoria**
- Todos los accesos requieren autenticación válida
- Solo la creación de usuarios permite acceso sin autenticación (para registro)

### 2. **Control de Acceso Basado en Roles (RBAC)**
- **Admin**: Acceso completo a todas las colecciones
- **Trainer**: Acceso a clases y asignaciones
- **Vendor**: Acceso a productos y ventas
- **Member**: Acceso limitado a sus propios datos

### 3. **Principio de Menor Privilegio**
- Los usuarios solo pueden acceder a los datos que necesitan
- Las operaciones están restringidas según el rol y contexto

### 4. **Validación de Datos**
- Validaciones estrictas en creación y actualización
- Verificación de tipos de datos y formatos

## 🏗️ Estructura de Funciones Auxiliares

### Funciones de Autenticación
```javascript
isAuthenticated()           // Verifica si el usuario está autenticado
isOwner(userId)            // Verifica si es el propietario del documento
```

### Funciones de Roles
```javascript
hasRole(role)              // Verifica un rol específico
isAdmin()                  // Verifica si es administrador
isTrainer()                // Verifica si es entrenador
isVendor()                 // Verifica si es vendedor
isMember()                 // Verifica si es miembro
isStaff()                  // Verifica si es personal (admin/trainer/vendor)
```

### Funciones de Acceso
```javascript
canAccessUserData(userId)  // Verifica acceso a datos de usuario específico
```

## 📊 Reglas por Colección

### 👥 Colección `users`

**Propósito**: Almacena perfiles de todos los usuarios del sistema

| Operación | Permisos | Validaciones |
|-----------|----------|--------------|
| **Read** | Propietario o Staff | - |
| **Create** | Sin autenticación (registro) o Admin | Email válido, rol válido, nombres requeridos |
| **Update** | Propietario o Admin | No cambiar UID, solo admin cambia roles |
| **Delete** | Solo Admin | - |

**Validaciones Específicas**:
- Email debe tener formato válido (`.*@.*\..*`)
- Roles permitidos: `admin`, `trainer`, `vendor`, `member`
- Nombres no pueden estar vacíos

### 🏃‍♂️ Colección `classes`

**Propósito**: Información de clases del gimnasio

| Operación | Permisos |
|-----------|----------|
| **Read** | Todos los usuarios autenticados |
| **Write** | Admin y Trainers |

### 📝 Colección `classAssignments`

**Propósito**: Asignaciones de miembros a clases

| Operación | Permisos |
|-----------|----------|
| **Read** | Miembro asignado o Staff |
| **Create** | Staff o el propio miembro |
| **Update** | Solo Staff |
| **Delete** | Staff o el propio miembro |

### 💳 Colección `membershipPlans`

**Propósito**: Planes de membresía disponibles

| Operación | Permisos |
|-----------|----------|
| **Read** | Todos los usuarios autenticados |
| **Write** | Solo Admin |

### 📋 Colección `planAssignments`

**Propósito**: Asignaciones de planes a miembros

| Operación | Permisos |
|-----------|----------|
| **Read** | Miembro asignado o Staff |
| **Write** | Solo Staff |

### 💰 Colección `payments`

**Propósito**: Registro de pagos y transacciones

| Operación | Permisos | Validaciones |
|-----------|----------|--------------|
| **Read** | Miembro que pagó o Staff | - |
| **Create** | Staff o el propio miembro | MemberId, amount > 0, paymentDate requeridos |
| **Update** | Solo Staff | Solo admin puede cambiar montos |
| **Delete** | Solo Admin | - |

**Validaciones Específicas**:
- `amount` debe ser número positivo
- `paymentDate` debe ser timestamp válido
- `memberId` es requerido

### 🛍️ Colección `products`

**Propósito**: Productos de la tienda del gimnasio

| Operación | Permisos |
|-----------|----------|
| **Read** | Todos los usuarios autenticados |
| **Write** | Admin y Vendors |

### 🛒 Colección `sales`

**Propósito**: Registro de ventas de productos

| Operación | Permisos |
|-----------|----------|
| **Read** | Comprador o Staff |
| **Create** | Staff o el propio comprador |
| **Update** | Solo Staff |
| **Delete** | Solo Admin |

### 🎁 Sistema de Recompensas

#### Colección `rewards`
| Operación | Permisos |
|-----------|----------|
| **Read** | Todos los usuarios autenticados |
| **Write** | Solo Admin |

#### Colección `rewardRequests`
| Operación | Permisos |
|-----------|----------|
| **Read** | Usuario solicitante o Staff |
| **Create** | Solo el propio usuario |
| **Update** | Solo Staff (aprobar/rechazar) |
| **Delete** | Solo Admin |

#### Colección `redemptions`
| Operación | Permisos |
|-----------|----------|
| **Read** | Usuario que canjeó o Staff |
| **Write** | Solo Staff |

### ⭐ Sistema de Puntos

#### Colección `userPoints`
| Operación | Permisos |
|-----------|----------|
| **Read** | Propietario o Staff |
| **Write** | Solo Staff |

#### Colección `pointTransactions`
| Operación | Permisos |
|-----------|----------|
| **Read** | Usuario de la transacción o Staff |
| **Create** | Solo Staff |
| **Update/Delete** | Solo Admin |

### 📊 Colección `auditLogs`

**Propósito**: Logs de auditoría del sistema

| Operación | Permisos |
|-----------|----------|
| **Read** | Solo Admin |
| **Create** | Sin restricciones (logs automáticos) |
| **Update/Delete** | Solo Admin |

## 🚫 Regla por Defecto

Cualquier colección no especificada explícitamente será **DENEGADA** por defecto:
```javascript
match /{document=**} {
  allow read, write: if false;
}
```

## 🔧 Implementación y Despliegue

### 1. **Archivo de Reglas**
Las reglas están definidas en: `firestore.rules`

### 2. **Despliegue**
Para desplegar las reglas a Firebase:
```bash
firebase deploy --only firestore:rules
```

### 3. **Pruebas**
Se recomienda probar las reglas usando el simulador de Firebase:
```bash
firebase emulators:start --only firestore
```

## ⚠️ Consideraciones de Seguridad

### 1. **Datos Sensibles Protegidos**
- Información financiera (pagos)
- Datos personales de usuarios
- Logs de auditoría
- Configuraciones administrativas

### 2. **Prevención de Ataques**
- **Escalación de privilegios**: Solo admin puede cambiar roles
- **Acceso no autorizado**: Verificación estricta de propietario
- **Manipulación de datos**: Validaciones de entrada
- **Inyección de datos**: Verificación de tipos

### 3. **Monitoreo**
- Los logs de auditoría registran accesos sensibles
- Solo administradores pueden ver logs de auditoría

## 📈 Beneficios Implementados

### ✅ **Seguridad Mejorada**
- Control granular de acceso
- Validación de datos en tiempo real
- Protección contra accesos no autorizados

### ✅ **Cumplimiento**
- Principio de menor privilegio
- Separación de responsabilidades
- Trazabilidad de acciones

### ✅ **Escalabilidad**
- Reglas reutilizables
- Fácil mantenimiento
- Estructura modular

## 🔄 Mantenimiento

### Actualizaciones de Reglas
1. Modificar `firestore.rules`
2. Probar en emulador local
3. Desplegar con `firebase deploy --only firestore:rules`
4. Verificar funcionamiento en producción

### Monitoreo Continuo
- Revisar logs de Firebase Console
- Monitorear métricas de acceso
- Auditar cambios de reglas

---

**Fecha de Implementación**: Enero 2025  
**Versión**: 1.0  
**Última Actualización**: Enero 2025