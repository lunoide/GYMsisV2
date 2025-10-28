# 🚀 CI/CD Setup Guide - GYMsis V2

## 📋 Resumen
Este documento describe la configuración completa de CI/CD para GYMsis V2 usando GitHub Actions.

## 🔧 Workflows Configurados

### 1. **CI Pipeline** (`.github/workflows/ci.yml`)
- **Trigger**: Push y PR a `main` y `develop`
- **Jobs**:
  - **Code Quality**: ESLint, TypeScript check, Prettier
  - **Testing**: Tests unitarios con cobertura
  - **Build**: Verificación de build
  - **Security**: Auditoría de seguridad

### 2. **CD Pipeline** (`.github/workflows/cd.yml`)
- **Trigger**: Push a `main` después de CI exitoso
- **Jobs**:
  - **Deploy Staging**: Despliegue a entorno de staging
  - **Deploy Production**: Despliegue a producción
  - **Notifications**: Notificaciones post-deploy

### 3. **Security Analysis** (`.github/workflows/security.yml`)
- **Trigger**: Push, PR, y schedule semanal
- **Jobs**:
  - **CodeQL**: Análisis de código estático
  - **Dependency Check**: Escaneo de vulnerabilidades
  - **Secret Scan**: Detección de secretos
  - **License Check**: Verificación de licencias

### 4. **PR Checks** (`.github/workflows/pr-checks.yml`)
- **Trigger**: Pull requests
- **Jobs**:
  - **PR Validation**: Validación de formato y contenido
  - **Bundle Analysis**: Análisis de tamaño del bundle
  - **Accessibility**: Tests de accesibilidad
  - **Performance**: Análisis con Lighthouse

## 🔐 Secretos Requeridos

### GitHub Repository Secrets
Configura estos secretos en: `Settings > Secrets and variables > Actions`

#### **Firebase (Producción)**
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
FIREBASE_TOKEN=your_firebase_ci_token
```

#### **Firebase (Staging)**
```
VITE_FIREBASE_API_KEY_STAGING=your_staging_api_key
VITE_FIREBASE_AUTH_DOMAIN_STAGING=your_staging_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID_STAGING=your_staging_project_id
VITE_FIREBASE_STORAGE_BUCKET_STAGING=your_staging_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID_STAGING=your_staging_sender_id
VITE_FIREBASE_APP_ID_STAGING=your_staging_app_id
```

#### **Vercel**
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

#### **Notificaciones (Opcional)**
```
SLACK_WEBHOOK=your_slack_webhook_url
LHCI_GITHUB_APP_TOKEN=your_lighthouse_token
```

## 🛠️ Configuración Inicial

### 1. **Instalar Dependencias Adicionales**
```bash
npm install --save-dev prettier @lhci/cli audit-ci bundlesize
```

### 2. **Configurar Firebase CI Token**
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login y generar token
firebase login:ci
```

### 3. **Configurar Vercel**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login y obtener IDs
vercel login
vercel link
```

### 4. **Configurar Environments en GitHub**
1. Ve a `Settings > Environments`
2. Crea environments: `staging` y `production`
3. Configura protection rules según necesites

## 📊 Métricas y Monitoreo

### **Cobertura de Tests**
- Target: >80%
- Reportes automáticos en PRs
- Upload a Codecov

### **Performance**
- Lighthouse CI en cada PR
- Métricas mínimas:
  - Performance: >80
  - Accessibility: >90
  - Best Practices: >80
  - SEO: >80

### **Bundle Size**
- Monitoreo automático del tamaño
- Alertas en incrementos significativos

## 🔄 Flujo de Trabajo

### **Feature Development**
1. Crear branch desde `develop`
2. Desarrollar feature
3. Push trigger CI checks
4. Crear PR → trigger PR checks
5. Review y merge a `develop`
6. Deploy automático a staging

### **Production Release**
1. Merge `develop` → `main`
2. Trigger CI pipeline completo
3. Deploy automático a producción
4. Notificaciones de deploy

## 🚨 Troubleshooting

### **CI Failures**
- **Tests failing**: Revisar logs de test en Actions
- **Build failing**: Verificar dependencias y TypeScript
- **Lint errors**: Ejecutar `npm run lint:fix` localmente

### **Deploy Failures**
- **Vercel errors**: Verificar tokens y project IDs
- **Firebase errors**: Verificar permisos y tokens
- **Environment variables**: Verificar secretos configurados

### **Security Alerts**
- **Dependency vulnerabilities**: Revisar y actualizar dependencias
- **Secret detection**: Verificar que no hay secretos en código
- **CodeQL alerts**: Revisar y corregir issues de seguridad

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build           # Build de producción
npm run preview         # Preview del build

# Testing
npm run test            # Tests en modo watch
npm run test:ci         # Tests para CI con coverage
npm run test:coverage   # Generar reporte de cobertura

# Calidad de Código
npm run lint            # Ejecutar ESLint
npm run lint:fix        # Corregir errores de ESLint
npm run type-check      # Verificar TypeScript
npm run format          # Formatear código con Prettier
npm run format:check    # Verificar formato

# Utilidades
npm run clean           # Limpiar archivos temporales
npm run build:analyze   # Analizar bundle size
```

## 🔄 Dependabot

Configurado para:
- Actualizaciones semanales de npm
- Actualizaciones semanales de GitHub Actions
- Agrupación de actualizaciones relacionadas
- Auto-assign a admin

## 📚 Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment](https://vercel.com/docs/concepts/deployments)
- [Firebase CI/CD](https://firebase.google.com/docs/cli#cli-ci-systems)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)