# 🏋️‍♂️ GYMsis V2

Sistema de Gestión de Gimnasio desarrollado con tecnologías modernas.

## 🚀 Tecnologías

- **Frontend**: React 19.2.0 + TypeScript 5.2.2
- **Build Tool**: Vite 7.1.10
- **Styling**: Tailwind CSS 3.4.18
- **Backend**: Firebase 12.4.0 (Auth + Firestore + Storage)
- **Estado Global**: Zustand 4.5.7
- **Testing**: Vitest 1.6.1 + Testing Library
- **Linting**: ESLint 8.55.0

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   └── ui/             # Componentes de interfaz básicos
├── config/             # Configuraciones (Firebase, etc.)
├── hooks/              # Custom hooks
├── services/           # Servicios (API, Firebase, etc.)
├── store/              # Estado global (Zustand)
└── test/               # Configuración de tests
```

## 🛠️ Instalación y Configuración

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar Firebase:**
   - Edita `src/config/firebase.ts` con tu configuración de Firebase
   - Reemplaza los valores de ejemplo con tu configuración real

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## 📝 Scripts Disponibles

- `npm run dev` - Ejecutar servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run preview` - Vista previa de la build
- `npm run lint` - Ejecutar ESLint
- `npm run lint:fix` - Corregir errores de ESLint automáticamente
- `npm run test` - Ejecutar tests en modo watch
- `npm run test:run` - Ejecutar tests una vez
- `npm run test:ui` - Ejecutar tests con interfaz visual

## 🔧 Configuración de Firebase

Para configurar Firebase:

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Authentication, Firestore y Storage
3. Copia la configuración y reemplaza los valores en `src/config/firebase.ts`

## 🧪 Testing

El proyecto incluye configuración completa para testing con:
- Vitest como test runner
- Testing Library para testing de componentes React
- Jest DOM para matchers adicionales

Ejemplo de test incluido en `src/components/ui/Button.test.tsx`

## 🎨 Componentes UI

El proyecto incluye componentes base como:
- `Button` - Botón reutilizable con variantes y tamaños

## 🔐 Autenticación

Sistema de autenticación configurado con:
- Hook personalizado `useAuth`
- Store de Zustand para estado de autenticación
- Servicios de Firebase Auth

## 📦 Estado Global

Gestión de estado con Zustand:
- Store de autenticación configurado
- Fácil de extender para nuevos stores

## 🚀 Próximos Pasos

1. Configurar Firebase con tu proyecto
2. Implementar páginas de login/registro
3. Crear modelos de datos para gimnasio
4. Implementar funcionalidades específicas del gimnasio

---

¡El proyecto está listo para comenzar el desarrollo! 🎉
