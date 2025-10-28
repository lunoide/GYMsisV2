# 🚀 Guía para Subir GYMsis V2 a GitHub

## 📋 Información del Usuario
- **Email**: sis14nina@gmail.com
- **Username**: lunoide
- **Proyecto**: GYMsis V2

## 🔧 Pasos para Configurar el Repositorio

### 1. 🌐 Crear Repositorio en GitHub
1. Ve a [GitHub.com](https://github.com)
2. Inicia sesión con tu cuenta **lunoide**
3. Click en el botón **"+"** (esquina superior derecha) → **"New repository"**
4. **Configuración del repositorio**:
   - **Repository name**: `GYMsisV2`
   - **Description**: `Sistema de gestión integral para gimnasios - Versión 2.0`
   - **Visibility**: 
     - ✅ **Public** (recomendado para CI/CD gratuito)
     - ⚠️ **Private** (si prefieres privacidad, pero limitará CI/CD gratuito)
   - **Initialize repository**:
     - ❌ **NO** marcar "Add a README file"
     - ❌ **NO** marcar "Add .gitignore"
     - ❌ **NO** marcar "Choose a license"
   - Click **"Create repository"**

### 2. 🔗 Configurar Git Local
```bash
# Verificar configuración de Git
git config --global user.name "lunoide"
git config --global user.email "sis14nina@gmail.com"

# Verificar configuración
git config --global --list
```

### 3. 📦 Inicializar y Conectar Repositorio
```bash
# Si no está inicializado Git
git init

# Añadir todos los archivos
git add .

# Primer commit
git commit -m "🚀 Initial commit: GYMsis V2 - Sistema de gestión integral para gimnasios

✨ Features implementadas:
- 🔐 Sistema de autenticación con Firebase
- 👥 Gestión de usuarios (Admin, Trainer, Vendor, Member)
- 💰 Sistema de ventas y productos
- 📊 Dashboard con métricas en tiempo real
- 📅 Sistema de clases y reservas
- 💳 Gestión de membresías y pagos
- 🔒 Seguridad avanzada con roles y permisos
- 🎨 UI moderna con Tailwind CSS
- ⚡ Performance optimizada con Vite
- 🧪 Testing con Vitest
- 🔄 CI/CD completo con GitHub Actions"

# Añadir remote origin
git remote add origin https://github.com/lunoide/GYMsisV2.git

# Verificar remote
git remote -v

# Subir a GitHub
git branch -M main
git push -u origin main
```

### 4. 🌿 Crear Rama de Desarrollo
```bash
# Crear y cambiar a rama develop
git checkout -b develop

# Subir rama develop
git push -u origin develop

# Volver a main
git checkout main
```

### 5. ✅ Verificar Subida Exitosa
1. Ve a tu repositorio: `https://github.com/lunoide/GYMsisV2`
2. Verifica que todos los archivos estén presentes
3. Verifica que las ramas `main` y `develop` existan
4. Verifica que los workflows en `.github/workflows/` estén visibles

## 🔐 Configurar SSH (Opcional pero Recomendado)

### Generar clave SSH:
```bash
# Generar nueva clave SSH
ssh-keygen -t ed25519 -C "sis14nina@gmail.com"

# Añadir al ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copiar clave pública
cat ~/.ssh/id_ed25519.pub
```

### Añadir a GitHub:
1. Ve a GitHub → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Pega la clave pública
4. Cambiar remote a SSH:
```bash
git remote set-url origin git@github.com:lunoide/GYMsisV2.git
```

## 🚨 Problemas Comunes y Soluciones

### Error de autenticación:
```bash
# Si tienes problemas con HTTPS, usa token personal
# Ve a GitHub → Settings → Developer settings → Personal access tokens
# Genera un token con permisos de repo
```

### Archivos grandes:
```bash
# Si hay archivos muy grandes, añádelos a .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo ".env.local" >> .gitignore
```

### Limpiar historial si es necesario:
```bash
# Solo si necesitas limpiar commits anteriores
git reset --soft HEAD~1  # Deshacer último commit manteniendo cambios
```

## 📋 Checklist Post-Subida

- [ ] ✅ Repositorio creado en GitHub
- [ ] ✅ Código subido correctamente
- [ ] ✅ Ramas `main` y `develop` creadas
- [ ] ✅ Workflows de GitHub Actions visibles
- [ ] ✅ README.md visible en el repositorio
- [ ] ✅ .gitignore funcionando correctamente
- [ ] ✅ Sin archivos sensibles (.env.local) en el repo

## 🎯 Próximos Pasos Después de la Subida

1. **Configurar GitHub Secrets** (Firebase, Vercel, etc.)
2. **Crear Environments** (staging, production)
3. **Configurar Branch Protection Rules**
4. **Activar Dependabot**
5. **Probar workflows con un pequeño cambio**

---

**¡Una vez completado, tendrás tu proyecto GYMsis V2 completamente configurado en GitHub y listo para CI/CD! 🚀**